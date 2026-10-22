import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { LocalJsonAdapter } from "../local-json-adapter.js";
import { runStorageContractSuite } from "./contract.suite.js";

runStorageContractSuite("LocalJsonAdapter", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lb-test-"));
  const tmpDbPath = path.join(tmpDir, "db.json");
  const adapter = new LocalJsonAdapter(tmpDbPath);

  return {
    adapter,
    cleanup: async () => {
      try {
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    },
  };
});
