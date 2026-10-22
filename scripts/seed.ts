import "dotenv/config";
import { getStorageAdapter } from "../apps/mcp-server/src/storage/index.js";
import { createSeedState } from "../apps/mcp-server/src/storage/seed.js";

async function main() {
  console.log("Seeding LoadBearing demo data...");
  const storage = getStorageAdapter();
  const seedState = createSeedState();

  try {
    const existing = await storage.loadHousehold();
    await storage.transact(
      [{ type: "reset_household", state: seedState }],
      existing.version
    );
    console.log(`Database seeded successfully! Household version: ${existing.version + 1}`);
  } catch (err: unknown) {
    console.log("Initializing fresh seed state...");
    const household = await storage.loadHousehold();
    console.log(`Household initialized at version: ${household.version}`);
  }
}

main().catch((err) => {
  console.error("Failed to seed database:", err);
  process.exit(1);
});
