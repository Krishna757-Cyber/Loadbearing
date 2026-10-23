import { DateTime } from "luxon";
import { KIND_WEIGHT } from "@loadbearing/shared";
import type { Member } from "@loadbearing/shared";
/**
 * Get the DateTime in a member's timezone for a given UTC ISO instant.
 */
export declare function localTime(member: Member, nowUtcIso: string): DateTime;
/**
 * Is the member awake at the given UTC instant?
 * Awake window: [awakeStart, awakeEnd) local time.
 * Handles windows that DO NOT cross midnight (07:00–23:00).
 * The spec says awake 07:00–23:00 (sleep is 23:00–07:00, which DOES cross midnight).
 * Implementation: awake when local hour:min >= start AND < end.
 * Since start (07:00) < end (23:00) this covers non-overnight windows.
 */
export declare function isAwake(member: Member, nowUtcIso: string): boolean;
/**
 * Is this UTC instant in the member's sleep window?
 * Sleep = NOT awake.
 */
export declare function inSleepWindow(member: Member, utcIso: string): boolean;
/**
 * The next instant (after nowUtcIso) when the member will be awake.
 * Returns an ISO UTC string.
 */
export declare function nextAwakeInstant(member: Member, nowUtcIso: string): string;
/**
 * Compute effective weight for a load entry.
 */
export declare function effectiveWeight(kind: keyof typeof KIND_WEIGHT, sleeping: boolean): number;
/**
 * Compute load shares for a set of caregivers over the window ending at nowUtcIso.
 * Returns a map memberId -> sharePct (0–100), summing to 100 (or 0 if no entries).
 */
export declare function loadShares(caregivers: Member[], entries: readonly {
    memberId: string;
    effectiveWeight: number;
    performedAt: string;
}[], nowUtcIso: string, windowDays?: number): Map<string, number>;
//# sourceMappingURL=time.d.ts.map