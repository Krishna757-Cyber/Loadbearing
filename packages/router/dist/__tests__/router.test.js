import { describe, it, expect } from "vitest";
import { route, evaluateEscalations, findDuplicate, computeRebalance } from "../router.js";
// ─── Test fixtures ──────────────────────────────────────────────────────────
function makeMember(overrides) {
    return {
        name: overrides.id,
        role: "caregiver",
        city: "Test City",
        lat: 0, lon: 0,
        language: "en",
        awakeStart: "07:00",
        awakeEnd: "23:00",
        isLocal: false,
        isBackup: false,
        consentShare: false,
        ...overrides,
    };
}
function makeEntry(overrides) {
    return {
        id: `le_${Math.random().toString(36).slice(2)}`,
        kind: "doing",
        label: "test",
        baseWeight: 1.0,
        performedAt: "2026-10-22T10:00:00Z",
        inSleepWindow: false,
        multiplier: 1,
        effectiveWeight: 1.0,
        momentId: null,
        handoffId: null,
        ...overrides,
    };
}
function makeHandoff(overrides) {
    return {
        momentId: "mo_test",
        type: "task",
        status: "awaiting_acceptance",
        assigneeId: null,
        skippedIds: [],
        attempts: 0,
        ackDeadline: null,
        explanation: { language: "en", text: "test" },
        reasonCodes: [],
        history: [],
        createdAt: "2026-10-22T10:00:00Z",
        version: 0,
        ...overrides,
    };
}
// Demo members (awake at demo instant 2026-10-22T16:30Z)
// Pune = 22:00 (asleep), Berlin = 18:30 (awake), Toronto = 12:30 (awake)
const priya = makeMember({ id: "priya", timeZone: "Asia/Kolkata" });
const arjun = makeMember({ id: "arjun", timeZone: "Europe/Berlin" });
const meera = makeMember({ id: "meera", timeZone: "America/Toronto", isLocal: true, isBackup: true });
const caregivers = [priya, arjun, meera];
const NOW = "2026-10-22T16:30:00Z";
// ─── route() tests ──────────────────────────────────────────────────────────
describe("route() - basic assignment", () => {
    it("assigns the awake lowest-load caregiver", () => {
        // Priya is asleep, Arjun and Meera are awake
        // Arjun has lower load → Arjun wins
        const entries = [
            makeEntry({ memberId: "arjun", effectiveWeight: 3.25 }),
            makeEntry({ memberId: "meera", effectiveWeight: 3.75 }),
        ];
        const result = route({
            caregivers,
            entries,
            openTasks: [],
            now: NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [],
        });
        expect(result.status).toBe("assigned");
        expect(result.assigneeId).toBe("arjun");
    });
    it("returns AWAKE and LOWEST_LOAD reason codes", () => {
        const result = route({
            caregivers,
            entries: [],
            openTasks: [],
            now: NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["arjun"],
            excludeIds: [],
            preferences: [],
        });
        expect(result.reasonCodes).toContain("AWAKE");
        expect(result.reasonCodes).toContain("LOWEST_LOAD");
    });
});
describe("route() - asleep caregiver excluded", () => {
    it("does not assign to Priya (asleep at 02:40 IST)", () => {
        // 2026-10-21T21:10Z = 02:40 IST (sleep window)
        const SLEEP_NOW = "2026-10-21T21:10:00Z";
        const result = route({
            caregivers,
            entries: [],
            openTasks: [],
            now: SLEEP_NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["priya"],
            excludeIds: [],
            preferences: [],
            backupMember: null,
        });
        expect(result.status).toBe("unassigned");
        expect(result.assigneeId).toBeNull();
        expect(result.reasonCodes).toContain("ALL_ASLEEP");
    });
});
describe("route() - local presence filter", () => {
    it("assigns only to local caregiver when needsLocalPresence=true", () => {
        const result = route({
            caregivers,
            entries: [],
            openTasks: [],
            now: NOW,
            needsLocalPresence: true,
            kind: "doing",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [],
        });
        expect(result.status).toBe("assigned");
        expect(result.assigneeId).toBe("meera");
    });
    it("returns NO_LOCAL_AWAKE when no local caregiver is awake", () => {
        const meraAsleep = { ...meera, awakeStart: "07:00", awakeEnd: "08:00" }; // always asleep at 12:30
        const result = route({
            caregivers: [priya, arjun, meraAsleep],
            entries: [],
            openTasks: [],
            now: NOW,
            needsLocalPresence: true,
            kind: "doing",
            candidateIds: ["arjun", "meraAsleep"],
            excludeIds: [],
            preferences: [],
            backupMember: null,
        });
        // arjun is not local, meraAsleep is not awake during window
        expect(result.status).toBe("unassigned");
        expect(result.reasonCodes).toContain("NO_LOCAL_AWAKE");
    });
});
describe("route() - backup contact", () => {
    it("uses backup when all primary candidates are asleep", () => {
        // Use a time when Priya is asleep (02:40 IST = 21:10Z)
        const SLEEP_NOW = "2026-10-21T21:10:00Z";
        const result = route({
            caregivers,
            entries: [],
            openTasks: [],
            now: SLEEP_NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["priya"], // priya is asleep at this time
            excludeIds: [],
            preferences: [],
            backupMember: meera, // meera is awake at 21:10Z (17:10 EDT)
        });
        expect(result.status).toBe("backup");
        expect(result.assigneeId).toBe("meera");
        expect(result.reasonCodes).toContain("BACKUP_USED");
    });
});
describe("route() - routing preference", () => {
    it("applies an active preference for an eligible member", () => {
        const pref = {
            id: "pref_test01",
            memberId: "meera",
            kind: "planning",
            remaining: 2,
            expiresAt: "2026-10-29T00:00:00Z",
        };
        const result = route({
            caregivers,
            entries: [],
            openTasks: [],
            now: NOW,
            needsLocalPresence: false,
            kind: "planning",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [pref],
        });
        expect(result.status).toBe("assigned");
        expect(result.assigneeId).toBe("meera");
        expect(result.reasonCodes).toContain("PREFERENCE_APPLIED");
    });
    it("ignores expired preference", () => {
        const pref = {
            id: "pref_test02",
            memberId: "meera",
            kind: "planning",
            remaining: 2,
            expiresAt: "2026-10-20T00:00:00Z", // expired before demo instant
        };
        const entries = [
            makeEntry({ memberId: "arjun", effectiveWeight: 3.25 }),
            makeEntry({ memberId: "meera", effectiveWeight: 3.75 }),
        ];
        const result = route({
            caregivers,
            entries,
            openTasks: [],
            now: NOW,
            needsLocalPresence: false,
            kind: "planning",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [pref],
        });
        // Falls back to lowest load → arjun
        expect(result.assigneeId).toBe("arjun");
    });
});
describe("route() - tie breaking", () => {
    it("breaks ties by longest idle (oldest last activity)", () => {
        const entries = [
            // Both arjun and meera have same effective load
            makeEntry({ memberId: "arjun", effectiveWeight: 2.0, performedAt: "2026-10-20T10:00:00Z" }),
            makeEntry({ memberId: "meera", effectiveWeight: 2.0, performedAt: "2026-10-21T10:00:00Z" }),
        ];
        const result = route({
            caregivers,
            entries,
            openTasks: [],
            now: NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [],
        });
        // Arjun's last activity is older → longer idle → higher priority
        expect(result.assigneeId).toBe("arjun");
    });
    it("applies penalty for accepted open tasks and tie-breaks via handoff audit history", () => {
        const entries = [
            makeEntry({ memberId: "arjun", effectiveWeight: 2.0, performedAt: "2026-10-20T10:00:00Z" }),
            makeEntry({ memberId: "meera", effectiveWeight: 2.0, performedAt: "2026-10-20T10:00:00Z" }),
        ];
        // Arjun has an accepted open task -> penalty increases score
        const openTask = makeHandoff({
            id: "h_open01",
            status: "accepted",
            assigneeId: "arjun",
            history: [
                { at: "2026-10-22T10:00:00Z", actorId: "arjun", action: "accepted" }
            ]
        });
        const result = route({
            caregivers,
            entries,
            openTasks: [openTask],
            now: NOW,
            needsLocalPresence: false,
            kind: "doing",
            candidateIds: ["arjun", "meera"],
            excludeIds: [],
            preferences: [],
        });
        expect(result.assigneeId).toBe("meera");
    });
});
// ─── evaluateEscalations() tests ────────────────────────────────────────────
describe("evaluateEscalations()", () => {
    it("reroutes a handoff past its deadline (< MAX_ATTEMPTS)", () => {
        const handoff = makeHandoff({
            id: "h_esc01",
            status: "awaiting_acceptance",
            assigneeId: "arjun",
            ackDeadline: "2026-10-22T16:25:00Z", // 5 min before demo instant
            attempts: 1,
        });
        const actions = evaluateEscalations([handoff], NOW);
        expect(actions).toHaveLength(1);
        expect(actions[0]?.action).toBe("reroute");
        expect(actions[0]?.reason).toBe("deadline_expired");
    });
    it("unassigns at max attempts", () => {
        const handoff = makeHandoff({
            id: "h_esc02",
            status: "awaiting_acceptance",
            assigneeId: "arjun",
            ackDeadline: "2026-10-22T16:25:00Z",
            attempts: 3, // MAX_ESCALATION_ATTEMPTS
        });
        const actions = evaluateEscalations([handoff], NOW);
        expect(actions[0]?.action).toBe("unassign");
        expect(actions[0]?.reason).toBe("max_attempts");
    });
    it("does not escalate a handoff within deadline", () => {
        const handoff = makeHandoff({
            id: "h_esc03",
            status: "awaiting_acceptance",
            assigneeId: "arjun",
            ackDeadline: "2026-10-22T17:30:00Z", // 1h in the future
            attempts: 0,
        });
        const actions = evaluateEscalations([handoff], NOW);
        expect(actions).toHaveLength(0);
    });
    it("is idempotent (same input same output)", () => {
        const handoff = makeHandoff({
            id: "h_esc04",
            status: "awaiting_acceptance",
            ackDeadline: "2026-10-22T16:00:00Z",
            attempts: 1,
        });
        const a1 = evaluateEscalations([handoff], NOW);
        const a2 = evaluateEscalations([handoff], NOW);
        expect(a1).toEqual(a2);
    });
});
// ─── findDuplicate() tests ───────────────────────────────────────────────────
describe("findDuplicate()", () => {
    const existing = [
        {
            id: "mo_001",
            text: "I researched physiotherapy clinics and booked an appointment for Dadi",
            capturedAt: "2026-10-22T15:00:00Z",
            status: "open",
        },
    ];
    it("detects a near-duplicate (Jaccard >= 0.6)", () => {
        const newText = "I researched physiotherapy clinics and booked an appointment";
        const dup = findDuplicate(newText, existing, NOW);
        expect(dup).toBe("mo_001");
    });
    it("does not flag a dissimilar text as duplicate", () => {
        const newText = "Dadi had a great day at the park and enjoyed the weather";
        const dup = findDuplicate(newText, existing, NOW);
        expect(dup).toBeNull();
    });
    it("ignores resolved moments", () => {
        const resolved = [{ ...existing[0], status: "resolved" }];
        const dup = findDuplicate("physiotherapy clinics booked", resolved, NOW);
        expect(dup).toBeNull();
    });
    it("ignores moments outside the 48h window", () => {
        const old = [{ ...existing[0], capturedAt: "2026-10-19T10:00:00Z" }];
        const dup = findDuplicate("physiotherapy clinics booked appointment Dadi", old, NOW);
        expect(dup).toBeNull();
    });
});
// ─── computeRebalance() tests ────────────────────────────────────────────────
describe("computeRebalance()", () => {
    const entries = [
        makeEntry({ memberId: "priya", effectiveWeight: 10.5, performedAt: "2026-10-21T10:00:00Z" }),
        makeEntry({ memberId: "arjun", effectiveWeight: 3.25, performedAt: "2026-10-21T17:00:00Z" }),
        makeEntry({ memberId: "meera", effectiveWeight: 3.75, performedAt: "2026-10-21T20:00:00Z" }),
    ];
    it("identifies Priya as overloaded", () => {
        const proposal = computeRebalance({ caregivers, entries, now: NOW });
        expect(proposal).not.toBeNull();
        expect(proposal?.overloadedId).toBe("priya");
    });
    it("identifies Arjun as capacity member (lowest load)", () => {
        const proposal = computeRebalance({ caregivers, entries, now: NOW });
        expect(proposal?.capacityId).toBe("arjun");
    });
    it("proposes 2 planning tasks to capacity member", () => {
        const proposal = computeRebalance({ caregivers, entries, now: NOW });
        expect(proposal?.moves[0]?.kind).toBe("planning");
        expect(proposal?.moves[0]?.count).toBe(2);
    });
    it("after proposal, Priya share decreases and Arjun share increases", () => {
        const proposal = computeRebalance({ caregivers, entries, now: NOW });
        if (!proposal)
            throw new Error("Expected proposal");
        const priyaBefore = proposal.before.find((b) => b.memberId === "priya")?.share ?? 0;
        const priyaAfter = proposal.after.find((b) => b.memberId === "priya")?.share ?? 0;
        const arjunBefore = proposal.before.find((b) => b.memberId === "arjun")?.share ?? 0;
        const arjunAfter = proposal.after.find((b) => b.memberId === "arjun")?.share ?? 0;
        expect(priyaAfter).toBeLessThan(priyaBefore);
        expect(arjunAfter).toBeGreaterThan(arjunBefore);
    });
    it("returns null when load is already balanced", () => {
        const balanced = [
            makeEntry({ memberId: "priya", effectiveWeight: 5.0 }),
            makeEntry({ memberId: "arjun", effectiveWeight: 5.0 }),
            makeEntry({ memberId: "meera", effectiveWeight: 5.0 }),
        ];
        const proposal = computeRebalance({ caregivers, entries: balanced, now: NOW });
        expect(proposal).toBeNull();
    });
});
//# sourceMappingURL=router.test.js.map