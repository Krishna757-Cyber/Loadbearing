import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createMockDocClient(): { docClient: DynamoDBDocumentClient; items: Map<string, Record<string, unknown>> } {
  const store = new Map<string, Record<string, unknown>>();

  const keyOf = (pk: string, sk: string) => `${pk}##${sk}`;

  const mockSend = async (command: { constructor: { name: string }; input: Record<string, unknown> }) => {
    const cmdName = command.constructor.name;
    const input = command.input;

    if (cmdName === "QueryCommand") {
      const pk = (input.ExpressionAttributeValues as Record<string, unknown>)?.[":pk"] as string;
      const prefix = (input.ExpressionAttributeValues as Record<string, unknown>)?.[":prefix"] as string | undefined;

      const results: Record<string, unknown>[] = [];
      for (const item of store.values()) {
        if (item.pk === pk) {
          if (!prefix || (item.sk as string).startsWith(prefix)) {
            results.push(JSON.parse(JSON.stringify(item)));
          }
        }
      }
      return { Items: results };
    }

    if (cmdName === "GetCommand") {
      const key = input.Key as { pk: string; sk: string };
      const item = store.get(keyOf(key.pk, key.sk));
      return { Item: item ? JSON.parse(JSON.stringify(item)) : undefined };
    }

    if (cmdName === "TransactWriteCommand") {
      const transactItems = (input.TransactItems as Record<string, unknown>[]) ?? [];

      // Phase 1: check conditions
      for (const t of transactItems) {
        if (t.Update) {
          const u = t.Update as {
            Key: { pk: string; sk: string };
            ConditionExpression?: string;
            ExpressionAttributeValues?: Record<string, unknown>;
          };
          const existing = store.get(keyOf(u.Key.pk, u.Key.sk));
          if (u.ConditionExpression?.includes("version = :expectedVer")) {
            const expected = u.ExpressionAttributeValues?.[":expectedVer"];
            const current = existing?.version;
            if (current !== expected) {
              const err = new Error("Conditional check failed");
              err.name = "TransactionCanceledException";
              throw err;
            }
          }
        }
      }

      // Phase 2: apply updates
      for (const t of transactItems) {
        if (t.Put) {
          const p = t.Put as { Item: Record<string, unknown> };
          store.set(keyOf(p.Item.pk as string, p.Item.sk as string), JSON.parse(JSON.stringify(p.Item)));
        } else if (t.Update) {
          const u = t.Update as {
            Key: { pk: string; sk: string };
            UpdateExpression: string;
            ExpressionAttributeValues?: Record<string, unknown>;
          };
          let existing = store.get(keyOf(u.Key.pk, u.Key.sk));
          if (!existing) {
            existing = { pk: u.Key.pk, sk: u.Key.sk };
            store.set(keyOf(u.Key.pk, u.Key.sk), existing);
          }
          if (u.ExpressionAttributeValues?.[":nextVer"]) {
            existing.version = u.ExpressionAttributeValues[":nextVer"];
          }
          if (u.ExpressionAttributeValues?.[":clock"]) {
            existing.clock = u.ExpressionAttributeValues[":clock"];
          }
          if (u.ExpressionAttributeValues?.[":consent"] !== undefined) {
            existing.consentShare = u.ExpressionAttributeValues[":consent"];
          }
        } else if (t.Delete) {
          const d = t.Delete as { Key: { pk: string; sk: string } };
          store.delete(keyOf(d.Key.pk, d.Key.sk));
        }
      }

      return {};
    }

    throw new Error(`Unhandled command: ${cmdName}`);
  };

  const docClient = {
    send: mockSend,
  } as unknown as DynamoDBDocumentClient;

  return { docClient, items: store };
}
