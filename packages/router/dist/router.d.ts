import { KIND_WEIGHT } from "@loadbearing/shared";
import type { Member, LoadEntry, Handoff, RoutingPreference } from "@loadbearing/shared";
export type ReasonCode = "AWAKE" | "LOWEST_LOAD" | "LOCAL_REQUIRED" | "PREFERENCE_APPLIED" | "BACKUP_USED" | "ALL_ASLEEP" | "NO_LOCAL_AWAKE";
export interface RankedCandidate {
    memberId: string;
    eligible: boolean;
    score: number;
    sharePct: number;
    reasons: ReasonCode[];
}
export interface RouteResult {
    status: "assigned" | "backup" | "unassigned";
    assigneeId: string | null;
    ranked: RankedCandidate[];
    nextWakeAt: string | null;
    reasonCodes: ReasonCode[];
}
export interface RouteInput {
    caregivers: Member[];
    entries: readonly LoadEntry[];
    openTasks: readonly Handoff[];
    now: string;
    needsLocalPresence: boolean;
    kind: keyof typeof KIND_WEIGHT;
    candidateIds: string[];
    excludeIds: string[];
    preferences: readonly RoutingPreference[];
    backupMember?: Member | null;
}
export declare function route(input: RouteInput): RouteResult;
export interface EscalationAction {
    handoffId: string;
    action: "reroute" | "unassign";
    reason: "deadline_expired" | "declined" | "max_attempts";
}
/**
 * Evaluate which handoffs need escalation. Idempotent.
 * Returns a list of actions to take (caller applies them).
 */
export declare function evaluateEscalations(handoffs: readonly Handoff[], now: string): EscalationAction[];
export interface DedupeCandidate {
    id: string;
    text: string;
    capturedAt: string;
    status?: string;
}
/**
 * Check if newText is a duplicate of any open moment in the last DEDUPE_WINDOW_HOURS.
 * Returns the id of the duplicate or null.
 * Deterministic, no LLM.
 */
export declare function findDuplicate(newText: string, existingMoments: readonly DedupeCandidate[], now: string): string | null;
export interface RebalanceInput {
    caregivers: Member[];
    entries: readonly LoadEntry[];
    now: string;
    windowDays?: number;
}
export interface RebalanceProposal {
    before: {
        memberId: string;
        share: number;
    }[];
    after: {
        memberId: string;
        share: number;
    }[];
    moves: {
        toMemberId: string;
        kind: "planning";
        count: number;
    }[];
    rationale: string;
    overloadedId: string | null;
    capacityId: string | null;
}
/**
 * Compute a rebalance proposal.
 * Routes the next REBALANCE_PLAN_TASKS planning tasks to the lowest-load caregiver.
 */
export declare function computeRebalance(input: RebalanceInput): RebalanceProposal | null;
//# sourceMappingURL=router.d.ts.map