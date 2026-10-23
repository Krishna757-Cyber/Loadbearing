import { DateTime } from "luxon";
import { KIND_WEIGHT, OPEN_TASK_PENALTY, DEDUPE_JACCARD_THRESHOLD, DEDUPE_WINDOW_HOURS, REBALANCE_OVERLOAD_THRESHOLD, REBALANCE_PLAN_TASKS, MAX_ESCALATION_ATTEMPTS, } from "@loadbearing/shared";
import { isAwake, loadShares, nextAwakeInstant } from "./time.js";
export function route(input) {
    const { caregivers, entries, openTasks, now, needsLocalPresence, kind, candidateIds, excludeIds, preferences, backupMember, } = input;
    const candidateSet = new Set(candidateIds);
    const excludeSet = new Set(excludeIds);
    const shares = loadShares(caregivers, entries, now);
    // Open task penalty per member
    const openPenalties = new Map();
    for (const h of openTasks) {
        if (h.status === "accepted" && h.assigneeId) {
            const kindWeight = KIND_WEIGHT[kind];
            const prev = openPenalties.get(h.assigneeId) ?? 0;
            openPenalties.set(h.assigneeId, prev + OPEN_TASK_PENALTY * kindWeight);
        }
    }
    // Last activity per member (for tie-breaking: longest idle = oldest lastActivity)
    const lastActivity = new Map();
    for (const e of entries) {
        const prev = lastActivity.get(e.memberId) ?? 0;
        const t = DateTime.fromISO(e.performedAt, { zone: "utc" }).toMillis();
        if (t > prev)
            lastActivity.set(e.memberId, t);
    }
    for (const h of openTasks) {
        if (h.assigneeId) {
            for (const audit of h.history) {
                if (audit.action === "accepted" || audit.action === "resolved") {
                    const t = DateTime.fromISO(audit.at, { zone: "utc" }).toMillis();
                    const prev = lastActivity.get(h.assigneeId) ?? 0;
                    if (t > prev)
                        lastActivity.set(h.assigneeId, t);
                }
            }
        }
    }
    // Build ranked list
    const ranked = [];
    for (const c of caregivers) {
        if (!candidateSet.has(c.id))
            continue;
        if (excludeSet.has(c.id))
            continue;
        if (c.role !== "caregiver")
            continue;
        const reasons = [];
        const awake = isAwake(c, now);
        const eligible = awake &&
            (!needsLocalPresence || c.isLocal);
        if (needsLocalPresence && !c.isLocal)
            reasons.push("LOCAL_REQUIRED");
        if (awake)
            reasons.push("AWAKE");
        const sharePct = shares.get(c.id) ?? 0;
        const penalty = openPenalties.get(c.id) ?? 0;
        const score = sharePct + penalty;
        ranked.push({ memberId: c.id, eligible, score, sharePct, reasons });
    }
    // Sort: eligible first, then by score asc, then by last-activity asc (longest idle)
    ranked.sort((a, b) => {
        if (a.eligible !== b.eligible)
            return a.eligible ? -1 : 1;
        if (a.score !== b.score)
            return a.score - b.score;
        const aLast = lastActivity.get(a.memberId) ?? 0;
        const bLast = lastActivity.get(b.memberId) ?? 0;
        if (aLast !== bLast)
            return aLast - bLast; // older activity = longer idle = higher priority
        return a.memberId < b.memberId ? -1 : 1; // id tiebreak
    });
    const nowMs = DateTime.fromISO(now, { zone: "utc" }).toMillis();
    // Check matching preference first
    const validPrefs = preferences.filter((p) => p.kind === kind &&
        p.remaining > 0 &&
        DateTime.fromISO(p.expiresAt, { zone: "utc" }).toMillis() > nowMs &&
        candidateSet.has(p.memberId) &&
        !excludeSet.has(p.memberId));
    for (const pref of validPrefs) {
        const prefMember = caregivers.find((c) => c.id === pref.memberId);
        if (!prefMember)
            continue;
        if (!isAwake(prefMember, now))
            continue;
        if (needsLocalPresence && !prefMember.isLocal)
            continue;
        const rankedItem = ranked.find((r) => r.memberId === pref.memberId);
        const reasons = [
            "PREFERENCE_APPLIED",
            "AWAKE",
            ...(rankedItem?.reasons.filter((r) => r !== "AWAKE") ?? []),
        ];
        return {
            status: "assigned",
            assigneeId: pref.memberId,
            ranked: ranked.map((r) => r.memberId === pref.memberId ? { ...r, reasons } : r),
            nextWakeAt: null,
            reasonCodes: reasons,
        };
    }
    // Pick the top eligible candidate
    const eligible = ranked.filter((r) => r.eligible);
    if (eligible.length > 0) {
        const best = eligible[0];
        if (!best)
            throw new Error("Logic error: eligible list empty after filter");
        const reasons = ["AWAKE", "LOWEST_LOAD"];
        if (needsLocalPresence)
            reasons.push("LOCAL_REQUIRED");
        return {
            status: "assigned",
            assigneeId: best.memberId,
            ranked,
            nextWakeAt: null,
            reasonCodes: reasons,
        };
    }
    // No eligible — try backup
    if (backupMember &&
        backupMember.isBackup &&
        !excludeSet.has(backupMember.id) &&
        isAwake(backupMember, now) &&
        (!needsLocalPresence || backupMember.isLocal)) {
        return {
            status: "backup",
            assigneeId: backupMember.id,
            ranked,
            nextWakeAt: null,
            reasonCodes: ["BACKUP_USED"],
        };
    }
    // Compute nextWakeAt: earliest next awake among candidates
    const allSleeping = needsLocalPresence
        ? ranked.filter((r) => {
            const c = caregivers.find((m) => m.id === r.memberId);
            return c?.isLocal;
        })
        : ranked;
    let nextWakeAt = null;
    for (const r of allSleeping) {
        const c = caregivers.find((m) => m.id === r.memberId);
        if (!c)
            continue;
        const wake = nextAwakeInstant(c, now);
        if (!nextWakeAt || wake < nextWakeAt)
            nextWakeAt = wake;
    }
    const rc = needsLocalPresence ? ["NO_LOCAL_AWAKE"] : ["ALL_ASLEEP"];
    return {
        status: "unassigned",
        assigneeId: null,
        ranked,
        nextWakeAt,
        reasonCodes: rc,
    };
}
/**
 * Evaluate which handoffs need escalation. Idempotent.
 * Returns a list of actions to take (caller applies them).
 */
export function evaluateEscalations(handoffs, now) {
    const nowMs = DateTime.fromISO(now, { zone: "utc" }).toMillis();
    const actions = [];
    for (const h of handoffs) {
        if (h.status !== "awaiting_acceptance")
            continue;
        if (!h.ackDeadline)
            continue;
        const deadlineMs = DateTime.fromISO(h.ackDeadline, { zone: "utc" }).toMillis();
        if (nowMs >= deadlineMs) {
            if (h.attempts >= MAX_ESCALATION_ATTEMPTS) {
                actions.push({ handoffId: h.id, action: "unassign", reason: "max_attempts" });
            }
            else {
                actions.push({ handoffId: h.id, action: "reroute", reason: "deadline_expired" });
            }
        }
    }
    return actions;
}
// ─── Dedupe ────────────────────────────────────────────────────────────────
const STOP_WORDS = new Set([
    "a", "an", "the", "is", "was", "are", "were", "been", "be",
    "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "into", "through", "during",
    "i", "me", "my", "we", "our", "you", "your", "he", "she", "it",
    "his", "her", "its", "they", "their", "this", "that", "these", "those",
    "ne", "ki", "ka", "ke", "ko", "se", "mein", "hai", "hain", "tha",
    "thi", "the", "aur", "ya", "par", "kya", "jo", "jab",
]);
function tokenize(text) {
    return new Set(text
        .toLowerCase()
        .replace(/[^a-z0-9\u0900-\u097f\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 1 && !STOP_WORDS.has(w)));
}
function jaccard(a, b) {
    if (a.size === 0 && b.size === 0)
        return 1;
    let intersection = 0;
    for (const w of a) {
        if (b.has(w))
            intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
}
/**
 * Check if newText is a duplicate of any open moment in the last DEDUPE_WINDOW_HOURS.
 * Returns the id of the duplicate or null.
 * Deterministic, no LLM.
 */
export function findDuplicate(newText, existingMoments, now) {
    const nowMs = DateTime.fromISO(now, { zone: "utc" }).toMillis();
    const windowMs = DEDUPE_WINDOW_HOURS * 60 * 60 * 1000;
    const cutoffMs = nowMs - windowMs;
    const newTokens = tokenize(newText);
    for (const m of existingMoments) {
        if (m.status === "resolved")
            continue;
        const capturedMs = DateTime.fromISO(m.capturedAt, { zone: "utc" }).toMillis();
        if (capturedMs < cutoffMs)
            continue;
        const existingTokens = tokenize(m.text);
        if (jaccard(newTokens, existingTokens) >= DEDUPE_JACCARD_THRESHOLD) {
            return m.id;
        }
    }
    return null;
}
/**
 * Compute a rebalance proposal.
 * Routes the next REBALANCE_PLAN_TASKS planning tasks to the lowest-load caregiver.
 */
export function computeRebalance(input) {
    const { caregivers, entries, now, windowDays = 7 } = input;
    const shares = loadShares(caregivers, entries, now, windowDays);
    const fairShare = 100 / caregivers.length; // percentage
    const overloadThreshold = fairShare * (1 + REBALANCE_OVERLOAD_THRESHOLD);
    const before = caregivers.map((c) => ({
        memberId: c.id,
        share: shares.get(c.id) ?? 0,
    }));
    // Find overloaded member (above fair + 10%)
    const overloaded = before
        .filter((b) => b.share > overloadThreshold)
        .sort((a, b) => b.share - a.share)[0];
    if (!overloaded)
        return null; // balanced
    // Find capacity member (lowest share, tie: longest idle by last entry time)
    const lastActivity = new Map();
    for (const e of entries) {
        const t = DateTime.fromISO(e.performedAt, { zone: "utc" }).toMillis();
        const prev = lastActivity.get(e.memberId) ?? 0;
        if (t > prev)
            lastActivity.set(e.memberId, t);
    }
    const capacity = before
        .filter((b) => b.memberId !== overloaded.memberId)
        .sort((a, b) => {
        if (a.share !== b.share)
            return a.share - b.share;
        const aLast = lastActivity.get(a.memberId) ?? 0;
        const bLast = lastActivity.get(b.memberId) ?? 0;
        if (aLast !== bLast)
            return aLast - bLast;
        return a.memberId < b.memberId ? -1 : 1;
    })[0];
    if (!capacity)
        return null;
    // Recompute totals with simulated entries
    const simEntries = [
        ...entries.map((e) => ({
            memberId: e.memberId,
            effectiveWeight: e.effectiveWeight,
            performedAt: e.performedAt,
        })),
        // Add 2 simulated planning entries for capacity member
        ...Array.from({ length: REBALANCE_PLAN_TASKS }, (_, i) => ({
            memberId: capacity.memberId,
            effectiveWeight: KIND_WEIGHT.planning,
            performedAt: DateTime.fromISO(now, { zone: "utc" })
                .minus({ seconds: i + 1 })
                .toISO() ?? now,
        })),
    ];
    const afterShares = loadShares(caregivers, simEntries, now, windowDays);
    const after = caregivers.map((c) => ({
        memberId: c.id,
        share: afterShares.get(c.id) ?? 0,
    }));
    return {
        before,
        after,
        moves: [{ toMemberId: capacity.memberId, kind: "planning", count: REBALANCE_PLAN_TASKS }],
        rationale: `${overloaded.memberId} carries ${overloaded.share.toFixed(1)}% of the load (fair share: ${fairShare.toFixed(1)}%). Routing the next ${REBALANCE_PLAN_TASKS} planning tasks to ${capacity.memberId} (${(capacity.share).toFixed(1)}%) will rebalance.`,
        overloadedId: overloaded.memberId,
        capacityId: capacity.memberId,
    };
}
//# sourceMappingURL=router.js.map