import { DateTime } from "luxon";
import {
  KIND_WEIGHT,
  SLEEP_MULTIPLIER,
  WINDOW_DAYS,
  DEFAULT_AWAKE_START,
  DEFAULT_AWAKE_END,
} from "@loadbearing/shared";
import type { Member } from "@loadbearing/shared";

/**
 * Parse "HH:MM" into { hour, minute }.
 */
function parseHHMM(hhmm: string): { hour: number; minute: number } {
  const parts = hhmm.split(":");
  const hourStr = parts[0];
  const minStr = parts[1];
  if (!hourStr || !minStr) throw new Error(`Invalid HH:MM: ${hhmm}`);
  return { hour: parseInt(hourStr, 10), minute: parseInt(minStr, 10) };
}

/**
 * Get the DateTime in a member's timezone for a given UTC ISO instant.
 */
export function localTime(member: Member, nowUtcIso: string): DateTime {
  const dt = DateTime.fromISO(nowUtcIso, { zone: "utc" });
  if (!dt.isValid) throw new Error(`Invalid ISO instant: ${nowUtcIso}`);
  return dt.setZone(member.timeZone);
}

/**
 * Is the member awake at the given UTC instant?
 * Awake window: [awakeStart, awakeEnd) local time.
 * Handles windows that DO NOT cross midnight (07:00–23:00).
 * The spec says awake 07:00–23:00 (sleep is 23:00–07:00, which DOES cross midnight).
 * Implementation: awake when local hour:min >= start AND < end.
 * Since start (07:00) < end (23:00) this covers non-overnight windows.
 */
export function isAwake(member: Member, nowUtcIso: string): boolean {
  const local = localTime(member, nowUtcIso);
  const startStr = member.awakeStart || DEFAULT_AWAKE_START;
  const endStr = member.awakeEnd || DEFAULT_AWAKE_END;
  const start = parseHHMM(startStr);
  const end = parseHHMM(endStr);

  const startMins = start.hour * 60 + start.minute;
  const endMins = end.hour * 60 + end.minute;
  const nowMins = local.hour * 60 + local.minute;

  if (startMins < endMins) {
    // normal window: awake is start <= now < end
    return nowMins >= startMins && nowMins < endMins;
  } else {
    // overnight window: awake is now >= start OR now < end
    return nowMins >= startMins || nowMins < endMins;
  }
}

/**
 * Is this UTC instant in the member's sleep window?
 * Sleep = NOT awake.
 */
export function inSleepWindow(member: Member, utcIso: string): boolean {
  return !isAwake(member, utcIso);
}

/**
 * The next instant (after nowUtcIso) when the member will be awake.
 * Returns an ISO UTC string.
 */
export function nextAwakeInstant(member: Member, nowUtcIso: string): string {
  const local = localTime(member, nowUtcIso);
  const startStr = member.awakeStart || DEFAULT_AWAKE_START;
  const start = parseHHMM(startStr);

  // Build today's awake start in local zone
  let candidate = local.set({
    hour: start.hour,
    minute: start.minute,
    second: 0,
    millisecond: 0,
  });

  // If candidate is in the past (or right now), advance by 1 day
  if (candidate.toMillis() <= local.toMillis()) {
    candidate = candidate.plus({ days: 1 });
  }

  const utc = candidate.toUTC();
  if (!utc.isValid) throw new Error("Invalid nextAwakeInstant");
  return utc.toISO() ?? "";
}

/**
 * Compute effective weight for a load entry.
 */
export function effectiveWeight(
  kind: keyof typeof KIND_WEIGHT,
  sleeping: boolean
): number {
  const base = KIND_WEIGHT[kind];
  return base * (sleeping ? SLEEP_MULTIPLIER : 1);
}

/**
 * Compute load shares for a set of caregivers over the window ending at nowUtcIso.
 * Returns a map memberId -> sharePct (0–100), summing to 100 (or 0 if no entries).
 */
export function loadShares(
  caregivers: Member[],
  entries: readonly {
    memberId: string;
    effectiveWeight: number;
    performedAt: string;
  }[],
  nowUtcIso: string,
  windowDays: number = WINDOW_DAYS
): Map<string, number> {
  const nowMs = DateTime.fromISO(nowUtcIso, { zone: "utc" }).toMillis();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const cutoffMs = nowMs - windowMs;

  const caregiverIds = new Set(caregivers.map((c) => c.id));
  const totals = new Map<string, number>();
  for (const c of caregivers) totals.set(c.id, 0);

  let grand = 0;
  for (const e of entries) {
    if (!caregiverIds.has(e.memberId)) continue;
    const perf = DateTime.fromISO(e.performedAt, { zone: "utc" }).toMillis();
    if (perf < cutoffMs || perf > nowMs) continue;
    const prev = totals.get(e.memberId) ?? 0;
    totals.set(e.memberId, prev + e.effectiveWeight);
    grand += e.effectiveWeight;
  }

  const shares = new Map<string, number>();
  if (grand === 0) {
    for (const c of caregivers) shares.set(c.id, 0);
  } else {
    for (const [id, w] of totals) {
      shares.set(id, (w / grand) * 100);
    }
  }
  return shares;
}
