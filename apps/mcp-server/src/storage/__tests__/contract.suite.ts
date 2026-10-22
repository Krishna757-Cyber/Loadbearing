import { describe, it, expect, beforeEach } from "vitest";
import type { StorageAdapter } from "../types.js";
import { makeId } from "@loadbearing/shared";

export function runStorageContractSuite(
  adapterName: string,
  createAdapter: () => Promise<{ adapter: StorageAdapter; cleanup?: () => Promise<void> }>
) {
  describe(`StorageAdapter contract suite: ${adapterName}`, () => {
    let adapter: StorageAdapter;
    let cleanupFn: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const res = await createAdapter();
      adapter = res.adapter;
      cleanupFn = res.cleanup;
      return async () => {
        if (cleanupFn) await cleanupFn();
      };
    });

    it("loads household with initial seed data and version 1", async () => {
      const household = await adapter.loadHousehold();
      expect(household.id).toBe("demo");
      expect(household.members.length).toBe(4);
      expect(household.version).toBeGreaterThanOrEqual(1);
      expect(household.clock.anchorSimMs).toBeGreaterThan(0);
      expect(household.loadEntries.length).toBe(13);
    });

    it("transacts an operation, bumps version and updates state", async () => {
      const initial = await adapter.loadHousehold();
      const momentId = makeId("mo");
      const moment = {
        id: momentId,
        source: "manual" as const,
        text: "Test moment for storage contract",
        capturedBy: "priya",
        capturedAt: "2026-10-22T16:35:00Z",
        classification: {
          kind: "care_task" as const,
          loadKind: "doing" as const,
          urgency: "calm" as const,
          needsLocalPresence: false,
          summary: "Test care task",
          sensitive: false,
          emergency: false,
        },
        credits: [],
        privacy: "private" as const,
        sharedWith: ["priya"],
        duplicateOf: null,
        expiresAt: null,
        aiSource: "rules" as const,
        version: 1,
      };

      const result = await adapter.transact(
        [{ type: "put_moment", moment }],
        initial.version
      );

      expect(result.version).toBe(initial.version + 1);

      const updated = await adapter.loadHousehold();
      expect(updated.version).toBe(result.version);
      const found = updated.moments.find((m) => m.id === momentId);
      expect(found).toBeDefined();
      expect(found?.text).toBe("Test moment for storage contract");
    });

    it("throws CONFLICT error on stale expectedVersion", async () => {
      const initial = await adapter.loadHousehold();
      const staleVersion = initial.version - 1;

      await expect(
        adapter.transact(
          [
            {
              type: "add_audit",
              audit: {
                at: "2026-10-22T16:36:00Z",
                actorId: "system",
                action: "test_stale",
              },
            },
          ],
          staleVersion
        )
      ).rejects.toThrow();
    });

    it("records and lists audit entries in chronological order", async () => {
      const initial = await adapter.loadHousehold();
      const a1 = {
        at: "2026-10-22T16:30:00Z",
        actorId: "priya",
        action: "created",
        details: "Audit entry 1",
      };
      const a2 = {
        at: "2026-10-22T16:35:00Z",
        actorId: "arjun",
        action: "accepted",
        details: "Audit entry 2",
      };

      await adapter.transact(
        [
          { type: "add_audit", audit: a2 },
          { type: "add_audit", audit: a1 },
        ],
        initial.version
      );

      const audits = await adapter.listAudit();
      expect(audits.length).toBeGreaterThanOrEqual(2);
      const times = audits.map((a) => a.at);
      const sortedTimes = [...times].sort();
      expect(times).toEqual(sortedTimes);
    });

    it("saves and retrieves idempotency records", async () => {
      const initial = await adapter.loadHousehold();
      const key = "test_req_001";
      const payload = { ok: true, data: "cached_response" };
      const expiresAtMs = Date.now() + 60000;

      await adapter.transact(
        [{ type: "put_idempotency", key, result: payload, expiresAtMs }],
        initial.version
      );

      const cached = await adapter.getIdempotency(key);
      expect(cached).toEqual(payload);

      const notFound = await adapter.getIdempotency("non_existent_key");
      expect(notFound).toBeNull();
    });

    it("updates member consentShare", async () => {
      const initial = await adapter.loadHousehold();
      const priya = initial.members.find((m) => m.id === "priya");
      expect(priya?.consentShare).toBe(false);

      await adapter.transact(
        [{ type: "update_member_consent", memberId: "priya", consentShare: true }],
        initial.version
      );

      const updated = await adapter.loadHousehold();
      const priyaUpdated = updated.members.find((m) => m.id === "priya");
      expect(priyaUpdated?.consentShare).toBe(true);
    });
  });
}
