import { LocalJsonAdapter } from "./local-json-adapter.js";
import { DynamoAdapter } from "./dynamo-adapter.js";
import type { StorageAdapter } from "./types.js";

export * from "./types.js";
export * from "./seed.js";
export * from "./local-json-adapter.js";
export * from "./dynamo-adapter.js";

let adapterInstance: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapterInstance) {
    return adapterInstance;
  }

  const storageType = process.env.STORAGE ?? "local";
  if (storageType === "dynamo") {
    adapterInstance = new DynamoAdapter();
  } else {
    adapterInstance = new LocalJsonAdapter();
  }

  return adapterInstance;
}

export function setStorageAdapter(adapter: StorageAdapter): void {
  adapterInstance = adapter;
}
