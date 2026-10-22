import {
  DynamoDBClient,
} from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  GetCommand,
  TransactWriteCommand,
  type TransactWriteCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { AuditEntry } from "@loadbearing/shared";
import type { HouseholdState, StorageAdapter, StorageOp } from "./types.js";
import { createSeedState } from "./seed.js";

export interface DynamoAdapterOptions {
  tableName?: string;
  client?: DynamoDBClient;
  docClient?: DynamoDBDocumentClient;
}

export class DynamoAdapter implements StorageAdapter {
  private tableName: string;
  private docClient: DynamoDBDocumentClient;
  private pk = "HOUSEHOLD#demo";

  constructor(options: DynamoAdapterOptions = {}) {
    this.tableName = options.tableName ?? process.env.DYNAMO_TABLE ?? "loadbearing-demo";
    if (options.docClient) {
      this.docClient = options.docClient;
    } else {
      const client =
        options.client ??
        new DynamoDBClient({
          region: process.env.AWS_REGION ?? "us-east-1",
        });
      this.docClient = DynamoDBDocumentClient.from(client, {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
  }

  async loadHousehold(): Promise<HouseholdState> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk",
        ExpressionAttributeValues: { ":pk": this.pk },
      })
    );

    const items = res.Items ?? [];
    if (items.length === 0) {
      // Seed table on first read
      const seed = createSeedState();
      await this.initSeed(seed);
      return seed;
    }

    let clock = createSeedState().clock;
    let version = 1;
    const members: HouseholdState["members"] = [];
    const moments: HouseholdState["moments"] = [];
    const handoffs: HouseholdState["handoffs"] = [];
    const loadEntries: HouseholdState["loadEntries"] = [];
    const preferences: HouseholdState["preferences"] = [];
    const proposals: HouseholdState["proposals"] = [];

    const nowEpochSec = Math.floor(Date.now() / 1000);

    for (const item of items) {
      const sk = item.sk as string;
      if (sk === "META#clock") {
        clock = item.clock;
        version = item.version ?? 1;
      } else if (sk.startsWith("MEMBER#")) {
        const { pk: _pk, sk: _s, ...mem } = item;
        members.push(mem as HouseholdState["members"][number]);
      } else if (sk.startsWith("MOMENT#")) {
        if (item.ttl && item.ttl < nowEpochSec) continue;
        const { pk: _pk, sk: _s, ttl: _t, ...mo } = item;
        moments.push(mo as HouseholdState["moments"][number]);
      } else if (sk.startsWith("HANDOFF#")) {
        const { pk: _pk, sk: _s, ...h } = item;
        handoffs.push(h as HouseholdState["handoffs"][number]);
      } else if (sk.startsWith("LOAD#")) {
        const { pk: _pk, sk: _s, ...l } = item;
        loadEntries.push(l as HouseholdState["loadEntries"][number]);
      } else if (sk.startsWith("PREF#")) {
        const { pk: _pk, sk: _s, ...p } = item;
        preferences.push(p as HouseholdState["preferences"][number]);
      } else if (sk.startsWith("PROPOSAL#")) {
        const { pk: _pk, sk: _s, ...prop } = item;
        proposals.push(prop as HouseholdState["proposals"][number]);
      }
    }

    return {
      id: "demo",
      members,
      moments,
      handoffs,
      loadEntries,
      preferences,
      proposals,
      clock,
      version,
    };
  }

  private async initSeed(seed: HouseholdState): Promise<void> {
    const transactItems: NonNullable<TransactWriteCommandInput["TransactItems"]> = [];

    transactItems.push({
      Put: {
        TableName: this.tableName,
        Item: {
          pk: this.pk,
          sk: "META#clock",
          clock: seed.clock,
          version: seed.version,
        },
      },
    });

    for (const m of seed.members) {
      transactItems.push({
        Put: {
          TableName: this.tableName,
          Item: { pk: this.pk, sk: `MEMBER#${m.id}`, ...m },
        },
      });
    }

    for (const mo of seed.moments) {
      const ttl = mo.expiresAt
        ? Math.floor(new Date(mo.expiresAt).getTime() / 1000)
        : undefined;
      transactItems.push({
        Put: {
          TableName: this.tableName,
          Item: { pk: this.pk, sk: `MOMENT#${mo.id}`, ...mo, ttl },
        },
      });
    }

    for (const h of seed.handoffs) {
      transactItems.push({
        Put: {
          TableName: this.tableName,
          Item: { pk: this.pk, sk: `HANDOFF#${h.id}`, ...h },
        },
      });
    }

    for (const l of seed.loadEntries) {
      transactItems.push({
        Put: {
          TableName: this.tableName,
          Item: { pk: this.pk, sk: `LOAD#${l.id}`, ...l },
        },
      });
    }

    await this.docClient.send(
      new TransactWriteCommand({
        TransactItems: transactItems,
      })
    );
  }

  async transact(
    ops: StorageOp[],
    expectedVersion: number
  ): Promise<{ version: number }> {
    const nextVersion = expectedVersion + 1;
    const transactItems: NonNullable<TransactWriteCommandInput["TransactItems"]> = [];

      // Add condition check on META#clock version
      transactItems.push({
        Update: {
          TableName: this.tableName,
          Key: { pk: this.pk, sk: "META#clock" },
          UpdateExpression: "SET version = :nextVer",
          ConditionExpression: "version = :expectedVer",
          ExpressionAttributeValues: {
            ":nextVer": nextVersion,
            ":expectedVer": expectedVersion,
          },
        },
      });

      for (const op of ops) {
        switch (op.type) {
          case "put_moment":
          case "update_moment": {
            const ttl = op.moment.expiresAt
              ? Math.floor(new Date(op.moment.expiresAt).getTime() / 1000)
              : undefined;
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: { pk: this.pk, sk: `MOMENT#${op.moment.id}`, ...op.moment, ttl },
              },
            });
            break;
          }
          case "put_handoff":
          case "update_handoff": {
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: { pk: this.pk, sk: `HANDOFF#${op.handoff.id}`, ...op.handoff },
              },
            });
            break;
          }
          case "put_load_entry": {
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: { pk: this.pk, sk: `LOAD#${op.entry.id}`, ...op.entry },
              },
            });
            break;
          }
          case "put_preference":
          case "update_preference": {
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: { pk: this.pk, sk: `PREF#${op.preference.id}`, ...op.preference },
              },
            });
            break;
          }
          case "delete_preference": {
            transactItems.push({
              Delete: {
                TableName: this.tableName,
                Key: { pk: this.pk, sk: `PREF#${op.id}` },
              },
            });
            break;
          }
          case "put_proposal":
          case "update_proposal": {
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: { pk: this.pk, sk: `PROPOSAL#${op.proposal.id}`, ...op.proposal },
              },
            });
            break;
          }
          case "update_clock": {
            transactItems.push({
              Update: {
                TableName: this.tableName,
                Key: { pk: this.pk, sk: "META#clock" },
                UpdateExpression: "SET clock = :clock, version = :nextVer",
                ConditionExpression: "version = :expectedVer",
                ExpressionAttributeValues: {
                  ":clock": op.clock,
                  ":nextVer": nextVersion,
                  ":expectedVer": expectedVersion,
                },
              },
            });
            break;
          }
          case "update_member_consent": {
            transactItems.push({
              Update: {
                TableName: this.tableName,
                Key: { pk: this.pk, sk: `MEMBER#${op.memberId}` },
                UpdateExpression: "SET consentShare = :consent",
                ExpressionAttributeValues: {
                  ":consent": op.consentShare,
                },
              },
            });
            break;
          }
          case "add_audit": {
            const auditId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: {
                  pk: this.pk,
                  sk: `AUDIT#${op.audit.at}#${auditId}`,
                  ...op.audit,
                },
              },
            });
            break;
          }
          case "put_idempotency": {
            const ttl = Math.floor(op.expiresAtMs / 1000);
            transactItems.push({
              Put: {
                TableName: this.tableName,
                Item: {
                  pk: this.pk,
                  sk: `IDEM#${op.key}`,
                  result: op.result,
                  expiresAtMs: op.expiresAtMs,
                  ttl,
                },
              },
            });
            break;
          }
          case "reset_household": {
            // Re-seed state
            return this.initSeed(op.state).then(() => ({ version: nextVersion }));
          }
        }
      }

      try {
        await this.docClient.send(
          new TransactWriteCommand({
            TransactItems: transactItems,
          })
        );
        return { version: nextVersion };
      } catch (err: unknown) {
        const errorName = (err as Error)?.name;
        if (
          errorName === "TransactionCanceledException" ||
          errorName === "ConditionalCheckFailedException"
        ) {
          const conflictErr = new Error(
            `Version conflict: expected ${expectedVersion}`
          );
          (conflictErr as unknown as { code: string }).code = "CONFLICT";
          throw conflictErr;
        }
        throw err;
      }
  }

  async listAudit(): Promise<AuditEntry[]> {
    const res = await this.docClient.send(
      new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
        ExpressionAttributeValues: {
          ":pk": this.pk,
          ":prefix": "AUDIT#",
        },
      })
    );

    const items = res.Items ?? [];
    return items
      .map((item) => {
        const { pk: _pk, sk: _sk, ...entry } = item;
        return entry as AuditEntry;
      })
      .sort((a, b) => a.at.localeCompare(b.at));
  }

  async getIdempotency(key: string): Promise<unknown | null> {
    const res = await this.docClient.send(
      new GetCommand({
        TableName: this.tableName,
        Key: {
          pk: this.pk,
          sk: `IDEM#${key}`,
        },
      })
    );

    const item = res.Item;
    if (!item) return null;
    if (item.expiresAtMs && item.expiresAtMs <= Date.now()) {
      return null;
    }
    return item.result;
  }
}
