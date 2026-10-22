import "dotenv/config";
import { classifyText, explainRouting, writeBrief } from "../apps/mcp-server/src/agents/bedrock.js";

async function main() {
  console.log("🤖 Running LoadBearing AI Agent Smoke Test...");
  const modelId = process.env.BEDROCK_MODEL_ID;
  const region = process.env.AWS_REGION ?? "us-east-1";

  console.log(`Region: ${region}`);
  console.log(`Model ID: ${modelId ?? "(not set, will test fallback)"}`);

  const startTotal = Date.now();

  // 1. Classifier Smoke
  console.log("\n[1/3] Testing Classifier Agent...");
  const t0 = Date.now();
  const cRes = await classifyText(
    "I booked Dadi's eye checkup for Thursday and paid the advance fee."
  );
  console.log(`✓ Classifier done in ${Date.now() - t0}ms: Source=${cRes.aiSource}, Kind=${cRes.classification.kind}`);

  // 2. Explainer Smoke
  console.log("\n[2/3] Testing Explainer Agent...");
  const t1 = Date.now();
  const eRes = await explainRouting({
    assigneeName: "Arjun",
    assigneeLocalTime: "18:30",
    targetLanguage: "en",
    loadVisible: true,
    reasonCodes: ["AWAKE", "LOWEST_LOAD"],
  });
  console.log(`✓ Explainer done in ${Date.now() - t1}ms: Source=${eRes.aiSource}`);
  console.log(`  "${eRes.text}"`);

  // 3. Brief Writer Smoke
  console.log("\n[3/3] Testing Brief Writer Agent...");
  const t2 = Date.now();
  const bRes = await writeBrief({
    memberName: "Dadi",
    language: "hi",
    stats: { resolved: 2, open: 1, memories_shared: 1, unowned: 0 },
  });
  console.log(`✓ Brief Writer done in ${Date.now() - t2}ms: Source=${bRes.aiSource}`);
  console.log(`  "${bRes.text}"`);

  console.log(`\n🎉 AI Smoke Completed successfully in ${Date.now() - startTotal}ms!`);
}

main().catch((err) => {
  console.error("AI Smoke failed:", err);
  process.exit(1);
});
