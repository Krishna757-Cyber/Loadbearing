// Load weight constants
export const KIND_WEIGHT = {
    doing: 1.0,
    planning: 1.5,
    emotional: 1.25,
};
export const SLEEP_MULTIPLIER = 2;
export const OPEN_TASK_PENALTY = 0.5; // times kind weight per accepted unresolved task
export const WINDOW_DAYS = 7;
// Demo clock anchor: 2026-10-22T16:30:00Z
export const DEMO_ANCHOR_UTC = "2026-10-22T16:30:00Z";
export const DEMO_ANCHOR_MS = new Date(DEMO_ANCHOR_UTC).getTime();
// Default awake window (local time)
export const DEFAULT_AWAKE_START = "07:00";
export const DEFAULT_AWAKE_END = "23:00";
// Escalation
export const DEFAULT_ACK_MINUTES = 30;
export const DEMO_ACK_MINUTES = 2;
export const MAX_ESCALATION_ATTEMPTS = 3;
// Dedupe threshold
export const DEDUPE_JACCARD_THRESHOLD = 0.6;
export const DEDUPE_WINDOW_HOURS = 48;
// Doorstep expiry
export const DOORSTEP_EXPIRY_HOURS = 48;
// Rebalance
export const REBALANCE_OVERLOAD_THRESHOLD = 0.10; // share above fair share
export const REBALANCE_PLAN_TASKS = 2; // planning tasks to route
// Household
export const HOUSEHOLD_ID = "demo";
// System actor
export const SYSTEM_ACTOR = "system";
//# sourceMappingURL=constants.js.map