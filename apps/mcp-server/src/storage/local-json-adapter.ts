import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { AuditEntry } from "@loadbearing/shared";
import type { HouseholdState, StorageAdapter, StorageOp } from "./types.js";
import { createSeedState } from "./seed.js";

interface DbFileFormat {
  household: HouseholdState;
  auditLog: AuditEntry[];
  idempotency: Record<string, { result: unknown; expiresAtMs: number }>;
}

export class LocalJsonAdapter implements StorageAdapter {
  private filePath: string;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.resolve(process.cwd(), "data", "db.json");
  }

  private async withLock<T>(fn: () => Promise<T>): Promise<T> {
    const res = this.queue.then(fn, fn);
    this.queue = res.then(
      () => {},
      () => {}
    );
    return res;
  }

  private async readDb(): Promise<DbFileFormat> {
    try {
      const raw = await fs.readFile(this.filePath, "utf-8");
      const data = JSON.parse(raw) as DbFileFormat;
      return this.pruneExpired(data);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        const initial: DbFileFormat = {
          household: createSeedState(),
          auditLog: [],
          idempotency: {},
        };
        await this.writeDbAtomic(initial);
        return initial;
      }
      throw err;
    }
  }

  private pruneExpired(data: DbFileFormat): DbFileFormat {
    const nowMs = Date.now();
    // Prune expired idempotency
    const freshIdem: Record<string, { result: unknown; expiresAtMs: number }> = {};
    for (const [k, v] of Object.entries(data.idempotency || {})) {
      if (v.expiresAtMs > nowMs) {
        freshIdem[k] = v;
      }
    }
    data.idempotency = freshIdem;

    // Prune expired doorstep moments if expiresAt is set and past
    const nowIso = new Date().toISOString();
    data.household.moments = data.household.moments.filter((m) => {
      if (m.expiresAt && m.expiresAt < nowIso) {
        return false;
      }
      return true;
    });

    return data;
  }

  private async writeDbAtomic(data: DbFileFormat): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tempPath = `${this.filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2), "utf-8");
    try {
      await fs.rename(tempPath, this.filePath);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "EPERM" || code === "EBUSY" || code === "EEXIST") {
        await fs.copyFile(tempPath, this.filePath);
        await fs.unlink(tempPath).catch(() => {});
      } else {
        throw err;
      }
    }
  }

  async loadHousehold(): Promise<HouseholdState> {
    return this.withLock(async () => {
      const db = await this.readDb();
      return JSON.parse(JSON.stringify(db.household));
    });
  }

  async transact(
    ops: StorageOp[],
    expectedVersion: number
  ): Promise<{ version: number }> {
    return this.withLock(async () => {
      const db = await this.readDb();
      if (db.household.version !== expectedVersion) {
        const err = new Error(
          `Version conflict: expected ${expectedVersion}, current ${db.household.version}`
        );
        (err as unknown as { code: string }).code = "CONFLICT";
        throw err;
      }

      const nextVersion = db.household.version + 1;
      db.household.version = nextVersion;

      for (const op of ops) {
        switch (op.type) {
          case "put_moment": {
            const idx = db.household.moments.findIndex((m) => m.id === op.moment.id);
            if (idx >= 0) db.household.moments[idx] = op.moment;
            else db.household.moments.push(op.moment);
            break;
          }
          case "update_moment": {
            const idx = db.household.moments.findIndex((m) => m.id === op.moment.id);
            if (idx >= 0) db.household.moments[idx] = op.moment;
            else db.household.moments.push(op.moment);
            break;
          }
          case "put_handoff": {
            const idx = db.household.handoffs.findIndex((h) => h.id === op.handoff.id);
            if (idx >= 0) db.household.handoffs[idx] = op.handoff;
            else db.household.handoffs.push(op.handoff);
            break;
          }
          case "update_handoff": {
            const idx = db.household.handoffs.findIndex((h) => h.id === op.handoff.id);
            if (idx >= 0) db.household.handoffs[idx] = op.handoff;
            else db.household.handoffs.push(op.handoff);
            break;
          }
          case "put_load_entry": {
            const idx = db.household.loadEntries.findIndex((l) => l.id === op.entry.id);
            if (idx >= 0) db.household.loadEntries[idx] = op.entry;
            else db.household.loadEntries.push(op.entry);
            break;
          }
          case "put_preference": {
            const idx = db.household.preferences.findIndex((p) => p.id === op.preference.id);
            if (idx >= 0) db.household.preferences[idx] = op.preference;
            else db.household.preferences.push(op.preference);
            break;
          }
          case "update_preference": {
            const idx = db.household.preferences.findIndex((p) => p.id === op.preference.id);
            if (idx >= 0) db.household.preferences[idx] = op.preference;
            else db.household.preferences.push(op.preference);
            break;
          }
          case "delete_preference": {
            db.household.preferences = db.household.preferences.filter((p) => p.id !== op.id);
            break;
          }
          case "put_proposal": {
            const idx = db.household.proposals.findIndex((p) => p.id === op.proposal.id);
            if (idx >= 0) db.household.proposals[idx] = op.proposal;
            else db.household.proposals.push(op.proposal);
            break;
          }
          case "update_proposal": {
            const idx = db.household.proposals.findIndex((p) => p.id === op.proposal.id);
            if (idx >= 0) db.household.proposals[idx] = op.proposal;
            else db.household.proposals.push(op.proposal);
            break;
          }
          case "update_clock": {
            db.household.clock = op.clock;
            break;
          }
          case "update_member_consent": {
            const m = db.household.members.find((mem) => mem.id === op.memberId);
            if (m) {
              m.consentShare = op.consentShare;
            }
            break;
          }
          case "add_audit": {
            db.auditLog.push(op.audit);
            break;
          }
          case "put_idempotency": {
            db.idempotency[op.key] = {
              result: op.result,
              expiresAtMs: op.expiresAtMs,
            };
            break;
          }
          case "reset_household": {
            db.household = { ...op.state, version: nextVersion };
            db.auditLog = [];
            db.idempotency = {};
            break;
          }
        }
      }

      await this.writeDbAtomic(db);
      return { version: nextVersion };
    });
  }

  async listAudit(): Promise<AuditEntry[]> {
    return this.withLock(async () => {
      const db = await this.readDb();
      return [...db.auditLog].sort((a, b) => a.at.localeCompare(b.at));
    });
  }

  async getIdempotency(key: string): Promise<unknown | null> {
    return this.withLock(async () => {
      const db = await this.readDb();
      const entry = db.idempotency[key];
      if (!entry) return null;
      if (entry.expiresAtMs <= Date.now()) {
        delete db.idempotency[key];
        await this.writeDbAtomic(db);
        return null;
      }
      return entry.result;
    });
  }
}
