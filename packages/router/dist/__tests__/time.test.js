import { describe, it, expect } from "vitest";
import { isAwake, inSleepWindow, nextAwakeInstant, loadShares, effectiveWeight } from "../time.js";
// Helper to build a member
function makeMember(overrides) {
    return {
        name: overrides.id,
        role: "caregiver",
        city: "Test City",
        lat: 0,
        lon: 0,
        language: "en",
        awakeStart: "07:00",
        awakeEnd: "23:00",
        isLocal: false,
        isBackup: false,
        consentShare: false,
        ...overrides,
    };
}
const pune = makeMember({ id: "priya", timeZone: "Asia/Kolkata" });
const berlin = makeMember({ id: "arjun", timeZone: "Europe/Berlin" });
const toronto = makeMember({ id: "meera", timeZone: "America/Toronto" });
describe("isAwake - awake window edges (07:00 – 23:00 local)", () => {
    // Demo instant: 2026-10-22T16:30:00Z
    // Pune = UTC+5:30 → 22:00 local (awake — within 07:00-23:00)
    // Sleep window is 23:00-07:00 which crosses midnight
    it("Priya is AWAKE at demo instant (22:00 IST — still within 07:00-23:00)", () => {
        expect(isAwake(pune, "2026-10-22T16:30:00Z")).toBe(true);
    });
    // Priya is asleep at 02:40 IST (seed entry sleep-tax scenario)
    // 02:40 IST = 21:10 UTC the day before
    it("Priya is asleep at 02:40 IST (2026-10-21T21:10Z)", () => {
        expect(isAwake(pune, "2026-10-21T21:10:00Z")).toBe(false);
    });
    // Berlin = UTC+2 → 18:30 local (awake)
    it("Arjun is awake at demo instant (18:30 CEST)", () => {
        expect(isAwake(berlin, "2026-10-22T16:30:00Z")).toBe(true);
    });
    // Toronto = UTC-4 → 12:30 local (awake)
    it("Meera is awake at demo instant (12:30 EDT)", () => {
        expect(isAwake(toronto, "2026-10-22T16:30:00Z")).toBe(true);
    });
    // Edge: 22:59:59 should be awake (< 23:00)
    it("Pune 22:59:59 IST is awake", () => {
        // 22:59:59 IST = 17:29:59 UTC
        expect(isAwake(pune, "2026-10-22T17:29:59Z")).toBe(true);
    });
    // Edge: 23:00:00 should be asleep (= awakeEnd, exclusive)
    it("Pune 23:00:00 IST is asleep (awakeEnd exclusive)", () => {
        // 23:00 IST = 17:30 UTC
        expect(isAwake(pune, "2026-10-22T17:30:00Z")).toBe(false);
    });
    // Edge: 06:59:59 should be asleep (< 07:00)
    it("Pune 06:59:59 IST is asleep", () => {
        // 06:59:59 IST = 01:29:59 UTC
        expect(isAwake(pune, "2026-10-22T01:29:59Z")).toBe(false);
    });
    // Edge: 07:00:00 should be awake (= awakeStart, inclusive)
    it("Pune 07:00:00 IST is awake (awakeStart inclusive)", () => {
        // 07:00 IST = 01:30 UTC
        expect(isAwake(pune, "2026-10-22T01:30:00Z")).toBe(true);
    });
});
describe("inSleepWindow", () => {
    it("Priya is NOT in sleep window at 22:00 IST (demo instant)", () => {
        expect(inSleepWindow(pune, "2026-10-22T16:30:00Z")).toBe(false);
    });
    it("Priya IS in sleep window at 02:40 IST", () => {
        // 02:40 IST = 2026-10-21T21:10Z — used for sleep-tax seed entry
        expect(inSleepWindow(pune, "2026-10-21T21:10:00Z")).toBe(true);
    });
    it("Arjun is not in sleep window at 18:30 CEST (demo instant)", () => {
        expect(inSleepWindow(berlin, "2026-10-22T16:30:00Z")).toBe(false);
    });
    // Overnight sleep window (23:00 – 07:00 crosses midnight)
    it("Priya is in sleep window during overnight (03:00 IST = 21:30 UTC prev day)", () => {
        // 03:00 IST on 2026-10-22 = 2026-10-21T21:30:00Z
        expect(inSleepWindow(pune, "2026-10-21T21:30:00Z")).toBe(true);
    });
});
describe("effectiveWeight", () => {
    it("doing awake = 1.0", () => { expect(effectiveWeight("doing", false)).toBe(1.0); });
    it("planning awake = 1.5", () => { expect(effectiveWeight("planning", false)).toBe(1.5); });
    it("emotional awake = 1.25", () => { expect(effectiveWeight("emotional", false)).toBe(1.25); });
    it("doing sleep = 2.0 (double weight)", () => { expect(effectiveWeight("doing", true)).toBe(2.0); });
    it("planning sleep = 3.0 (double weight)", () => { expect(effectiveWeight("planning", true)).toBe(3.0); });
    it("emotional sleep = 2.5 (double weight)", () => { expect(effectiveWeight("emotional", true)).toBe(2.5); });
});
describe("loadShares - seed data accuracy (±1.0%)", () => {
    /**
     * Seed entries per spec:
     * Priya: planning 1.5, planning 1.5, doing 1.0, doing 1.0, emotional 1.25,
     *        emotional 1.25, planning@sleep(02:40IST) 1.5*2=3.0 → total 10.5
     * Arjun: doing 1.0, doing 1.0, emotional 1.25 → 3.25
     * Meera: doing 1.0, planning 1.5, emotional 1.25 → 3.75
     * Grand total: 17.5
     * Shares: Priya 60.0%, Arjun 18.57%, Meera 21.43%
     */
    const entries = [
        // Priya entries (all in window 2026-10-17 to 2026-10-22T16:30Z)
        { memberId: "priya", effectiveWeight: 1.5, performedAt: "2026-10-17T10:00:00Z" },
        { memberId: "priya", effectiveWeight: 1.5, performedAt: "2026-10-18T09:30:00Z" },
        { memberId: "priya", effectiveWeight: 1.0, performedAt: "2026-10-19T12:00:00Z" },
        { memberId: "priya", effectiveWeight: 1.0, performedAt: "2026-10-19T08:00:00Z" },
        { memberId: "priya", effectiveWeight: 1.25, performedAt: "2026-10-20T14:00:00Z" },
        { memberId: "priya", effectiveWeight: 1.25, performedAt: "2026-10-21T13:00:00Z" },
        // 2026-10-21T21:10 UTC = 02:40 IST → sleep window → 1.5*2=3.0
        { memberId: "priya", effectiveWeight: 3.0, performedAt: "2026-10-21T21:10:00Z" },
        // Arjun entries
        { memberId: "arjun", effectiveWeight: 1.0, performedAt: "2026-10-18T16:00:00Z" },
        { memberId: "arjun", effectiveWeight: 1.0, performedAt: "2026-10-19T17:00:00Z" },
        { memberId: "arjun", effectiveWeight: 1.25, performedAt: "2026-10-21T17:00:00Z" },
        // Meera entries
        { memberId: "meera", effectiveWeight: 1.0, performedAt: "2026-10-19T15:00:00Z" },
        { memberId: "meera", effectiveWeight: 1.5, performedAt: "2026-10-20T14:00:00Z" },
        { memberId: "meera", effectiveWeight: 1.25, performedAt: "2026-10-21T20:00:00Z" },
    ];
    const caregivers = [
        makeMember({ id: "priya", timeZone: "Asia/Kolkata" }),
        makeMember({ id: "arjun", timeZone: "Europe/Berlin" }),
        makeMember({ id: "meera", timeZone: "America/Toronto" }),
    ];
    it("Priya share ≈ 60.0% (±1.0)", () => {
        const shares = loadShares(caregivers, entries, "2026-10-22T16:30:00Z");
        const priya = shares.get("priya") ?? 0;
        expect(priya).toBeGreaterThanOrEqual(59.0);
        expect(priya).toBeLessThanOrEqual(61.0);
    });
    it("Arjun share ≈ 18.6% (±1.0)", () => {
        const shares = loadShares(caregivers, entries, "2026-10-22T16:30:00Z");
        const arjun = shares.get("arjun") ?? 0;
        expect(arjun).toBeGreaterThanOrEqual(17.6);
        expect(arjun).toBeLessThanOrEqual(19.6);
    });
    it("Meera share ≈ 21.4% (±1.0)", () => {
        const shares = loadShares(caregivers, entries, "2026-10-22T16:30:00Z");
        const meera = shares.get("meera") ?? 0;
        expect(meera).toBeGreaterThanOrEqual(20.4);
        expect(meera).toBeLessThanOrEqual(22.4);
    });
    it("Shares sum to 100", () => {
        const shares = loadShares(caregivers, entries, "2026-10-22T16:30:00Z");
        const total = [...shares.values()].reduce((a, b) => a + b, 0);
        expect(total).toBeCloseTo(100, 1);
    });
});
describe("nextAwakeInstant", () => {
    it("returns next 07:00 IST when Priya is asleep", () => {
        // Demo instant: 2026-10-22T16:30Z → 22:00 IST (asleep)
        const next = nextAwakeInstant(pune, "2026-10-22T16:30:00Z");
        // Next 07:00 IST = 2026-10-23T01:30:00Z
        expect(next).toContain("2026-10-23");
        const dt = new Date(next);
        // UTC hour should be 01 (07:00 IST = UTC+5:30)
        expect(dt.getUTCHours()).toBe(1);
        expect(dt.getUTCMinutes()).toBe(30);
    });
});
describe("DST: Berlin falls back 2026-10-25T01:00 CET (from CEST)", () => {
    // Before fallback: 2026-10-24T05:00Z = 07:00 CEST (awake)
    it("Berlin awake at 2026-10-24T05:00Z (07:00 CEST)", () => {
        expect(isAwake(berlin, "2026-10-24T05:00:00Z")).toBe(true);
    });
    // After fallback: 2026-10-25T05:59Z = 06:59 CET (asleep)
    it("Berlin asleep at 2026-10-25T05:59Z (06:59 CET)", () => {
        expect(isAwake(berlin, "2026-10-25T05:59:00Z")).toBe(false);
    });
    // 2026-10-25T06:00Z = 07:00 CET (awake)
    it("Berlin awake at 2026-10-25T06:00Z (07:00 CET)", () => {
        expect(isAwake(berlin, "2026-10-25T06:00:00Z")).toBe(true);
    });
});
describe("DST: Toronto falls back 2026-11-01T06:00Z (from EDT to EST)", () => {
    // 2026-10-31T11:00Z = 07:00 EDT (awake)
    it("Toronto awake at 2026-10-31T11:00Z (07:00 EDT)", () => {
        expect(isAwake(toronto, "2026-10-31T11:00:00Z")).toBe(true);
    });
    // 2026-11-01T12:00Z = 07:00 EST (awake, after fallback)
    it("Toronto awake at 2026-11-01T12:00Z (07:00 EST)", () => {
        expect(isAwake(toronto, "2026-11-01T12:00:00Z")).toBe(true);
    });
});
describe("isAwake - overnight window (e.g. 22:00 - 06:00)", () => {
    const nightWorker = makeMember({
        id: "worker",
        timeZone: "UTC",
        awakeStart: "22:00",
        awakeEnd: "06:00",
    });
    it("awake at 23:30 (past start)", () => {
        expect(isAwake(nightWorker, "2026-10-22T23:30:00Z")).toBe(true);
    });
    it("awake at 04:00 (before end)", () => {
        expect(isAwake(nightWorker, "2026-10-22T04:00:00Z")).toBe(true);
    });
    it("asleep at 12:00 (outside window)", () => {
        expect(isAwake(nightWorker, "2026-10-22T12:00:00Z")).toBe(false);
    });
});
//# sourceMappingURL=time.test.js.map