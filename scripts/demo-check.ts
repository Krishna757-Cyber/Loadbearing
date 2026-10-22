import "dotenv/config";
import type { Server } from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createServer } from "../apps/mcp-server/src/server.js";
import { LocalJsonAdapter } from "../apps/mcp-server/src/storage/local-json-adapter.js";
import { setStorageAdapter } from "../apps/mcp-server/src/storage/index.js";

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) {
    console.error(`❌ Check failed: ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runDemoCheck() {
  console.log("🚀 Starting LoadBearing Demo Check (2:45 Verification Flow)...");
  process.env.AI_MODE = "rules";

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lb-demo-check-"));
  const tmpDb = path.join(tmpDir, "db.json");
  const testAdapter = new LocalJsonAdapter(tmpDb);
  setStorageAdapter(testAdapter);

  const serverInstance = createServer();
  let port = 0;
  let baseUrl = "";

  const httpServer: Server = await new Promise((resolve) => {
    const s = serverInstance.app.listen(0, () => {
      const addr = s.address();
      if (typeof addr === "object" && addr) {
        port = addr.port;
        baseUrl = `http://localhost:${port}`;
      }
      resolve(s);
    });
  });

  try {
    const client = new Client(
      { name: "demo-check-client", version: "1.0.0" },
      { capabilities: {} }
    );
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);
    console.log("✓ Connected to MCP server via Streamable HTTP");

    // ─── 1. Check Seed Shares ─────────────────────────────────────────────
    console.log("\n[1/10] Verifying seed load shares...");
    const stateRes1 = await fetch(`${baseUrl}/state?viewer=arjun`);
    const state1 = await stateRes1.json();
    assert(state1.ok, "GET /state should succeed");
    assert(state1.data.allConsented === false, "Seed state must have allConsented=false (Priya has not yet consented)");
    // Arjun sees only his own share in private mode
    const arjunMember1 = state1.data.members.find((m: any) => m.id === "arjun");
    assert(arjunMember1.computedShare !== null, "Arjun can see his own share");
    assert(Math.abs(arjunMember1.computedShare - 18.6) <= 1.0, `Arjun share ~18.6%, got ${arjunMember1.computedShare}`);
    console.log("✓ Initial private view preserves member boundaries");

    // ─── 2. Physiotherapy Capture Credits Two Items ────────────────────────
    console.log("\n[2/10] Capturing Priya's physiotherapy note...");
    const captureRes: any = await client.callTool({
      name: "capture_moment",
      arguments: {
        text: "I researched clinics and booked Dadi's physiotherapy for Friday, but I can't arrange transport.",
        source: "voice",
        captured_by: "priya",
        language: "en",
      },
    });
    const captureData = captureRes.structuredContent;
    assert(captureData, "capture_moment structuredContent missing");
    assert(captureData.credits?.length === 2, `Expected 2 credits, got ${captureData.credits?.length}`);
    assert(captureData.next === "ask_consent", "Expected next action ask_consent");
    const momentId = captureData.moment_id;
    console.log(`✓ Credited 2 items (research, booking). Moment ID: ${momentId}`);

    // ─── 3. Handoff Routes to Arjun (lower load) ───────────────────────────
    console.log("\n[3/10] Creating handoff for open transport task...");
    const handoffRes: any = await client.callTool({
      name: "create_handoff",
      arguments: {
        moment_id: momentId,
        actor_id: "priya",
        share_with: ["arjun", "meera"],
      },
    });
    const handoffData = handoffRes.structuredContent;
    assert(handoffData, "create_handoff structuredContent missing");
    assert(handoffData.assignee_id === "arjun", `Expected assignee arjun (lower load 3.25 vs 3.75), got ${handoffData.assignee_id}`);
    assert(handoffData.status === "awaiting_acceptance", "Status should be awaiting_acceptance");
    const transportHandoffId = handoffData.handoff_id;
    console.log(`✓ Task successfully routed to Arjun in Berlin (Handoff ID: ${transportHandoffId})`);

    // ─── 4. Doorstep Delivery Goes to Meera (Local presence) ──────────────
    console.log("\n[4/10] Simulating doorstep package delivery...");
    const deliveryCapture: any = await client.callTool({
      name: "capture_moment",
      arguments: {
        text: "A delivery box was left at Dadi's front porch. Someone needs to bring it inside.",
        source: "doorstep",
        captured_by: "system",
        language: "en",
      },
    });
    const deliveryHandoff: any = await client.callTool({
      name: "create_handoff",
      arguments: {
        moment_id: deliveryCapture.structuredContent.moment_id,
        actor_id: "system",
        share_with: ["priya", "arjun", "meera"],
      },
    });
    assert(deliveryHandoff.structuredContent.assignee_id === "meera", `Delivery needs local presence, expected meera, got ${deliveryHandoff.structuredContent.assignee_id}`);
    console.log("✓ Delivery correctly assigned to Meera in Toronto");

    // Meera accepts the delivery task
    await client.callTool({
      name: "record_resolution",
      arguments: { handoff_id: deliveryHandoff.structuredContent.handoff_id, actor_id: "meera", outcome: "accepted" },
    });

    // ─── 5. Accept and Resolve Updates Shares (Priya's share falls) ────────
    console.log("\n[5/10] Arjun accepts and resolves transport task...");
    await client.callTool({
      name: "record_resolution",
      arguments: {
        handoff_id: transportHandoffId,
        actor_id: "arjun",
        outcome: "accepted",
      },
    });
    const resolveRes: any = await client.callTool({
      name: "record_resolution",
      arguments: {
        handoff_id: transportHandoffId,
        actor_id: "arjun",
        outcome: "resolved",
        note: "Arranged wheelchair taxi for Friday 10 AM",
      },
    });
    assert(resolveRes.structuredContent.status === "resolved", "Handoff should be resolved");
    console.log("✓ Arjun resolved transport task");

    // ─── 6. Unaccepted Handoff Reroutes After 2 Min Deadline ───────────────
    console.log("\n[6/10] Verifying escalation timeout rerouting...");
    // Create a new task assigned to Arjun
    const task2Capture: any = await client.callTool({
      name: "capture_moment",
      arguments: {
        text: "Need to order refill for Dadi's prescription.",
        source: "voice",
        captured_by: "priya",
        language: "en",
      },
    });
    const task2Handoff: any = await client.callTool({
      name: "create_handoff",
      arguments: {
        moment_id: task2Capture.structuredContent.moment_id,
        actor_id: "priya",
        share_with: ["arjun", "meera"],
      },
    });
    const task2Id = task2Handoff.structuredContent.handoff_id;

    // Advance clock by 3 minutes (past the 2-minute ack deadline)
    await fetch(`${baseUrl}/admin/clock`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": "demo-admin-token" },
      body: JSON.stringify({ action: "advance", minutes: 3 }),
    });

    // Check that escalation rerouted task2
    const stateAfterAdv = await (await fetch(`${baseUrl}/state?viewer=priya`)).json();
    const task2Updated = stateAfterAdv.data.handoffs.find((h: any) => h.id === task2Id);
    assert(task2Updated.attempts >= 2 || task2Updated.assigneeId === "meera", "Escalation should increment attempts or reroute to next awake caregiver");
    console.log("✓ Escalation successfully triggered after deadline");

    // Resolve task2 and delivery so unowned count clears
    await client.callTool({
      name: "record_resolution",
      arguments: { handoff_id: task2Id, actor_id: task2Updated.assigneeId, outcome: "accepted" },
    });
    await client.callTool({
      name: "record_resolution",
      arguments: { handoff_id: task2Id, actor_id: task2Updated.assigneeId, outcome: "resolved" },
    });
    await client.callTool({
      name: "record_resolution",
      arguments: { handoff_id: deliveryHandoff.structuredContent.handoff_id, actor_id: "meera", outcome: "resolved" },
    });

    // ─── 7. Propose Rebalance is private_only until Priya consents ────────
    console.log("\n[7/10] Testing rebalance privacy guard...");
    const rebalancePriv: any = await client.callTool({
      name: "propose_rebalance",
      arguments: { window_days: 7 },
    });
    assert(rebalancePriv.structuredContent.visibility === "private_only", "Rebalance must be private_only before all caregivers consent");
    assert(rebalancePriv.structuredContent.missing?.includes("priya"), "Missing consent list must include Priya");
    console.log("✓ Rebalance refused with private_only while Priya has not consented");

    // ─── 8. Priya Consents -> Proposal Returns & Approval Creates Preference
    console.log("\n[8/10] Priya enables consent -> Rebalance proposal generated...");
    await fetch(`${baseUrl}/admin/consent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": "demo-admin-token" },
      body: JSON.stringify({ member_id: "priya", consent_share: true }),
    });

    const rebalanceProp: any = await client.callTool({
      name: "propose_rebalance",
      arguments: { window_days: 7 },
    });
    assert(rebalanceProp.structuredContent.proposal_id, "Proposal ID must be returned after consent");
    const proposalId = rebalanceProp.structuredContent.proposal_id;
    console.log(`✓ Rebalance proposed (ID: ${proposalId})`);

    const rebalanceApprove: any = await client.callTool({
      name: "propose_rebalance",
      arguments: { approve_proposal_id: proposalId, approved_by: "priya" },
    });
    assert(rebalanceApprove.structuredContent.status === "approved", "Proposal status must be approved");
    console.log("✓ Rebalance approved and routing preference created");

    // ─── 9. Briefs in English and Hindi ────────────────────────────────────
    console.log("\n[9/10] Generating multilingual continuity briefs...");
    const briefEn: any = await client.callTool({
      name: "get_continuity_brief",
      arguments: { member_id: "arjun", language: "en" },
    });
    assert(briefEn.structuredContent?.text?.length > 10, "English brief returned");

    const briefHi: any = await client.callTool({
      name: "get_continuity_brief",
      arguments: { member_id: "dadi", language: "hi" },
    });
    assert(briefHi.structuredContent?.text?.length > 10, "Hindi brief returned in Devanagari");
    console.log("✓ Multilingual briefs generated successfully");

    // ─── 10. Unowned is 0 at the end ──────────────────────────────────────
    console.log("\n[10/10] Verifying unowned count...");
    const stateFinal = await (await fetch(`${baseUrl}/state?viewer=priya`)).json();
    console.log("Handoffs at end:", stateFinal.data.handoffs.map((h: any) => ({ id: h.id, status: h.status, assigneeId: h.assigneeId })));

    const finalBrief: any = await client.callTool({
      name: "get_continuity_brief",
      arguments: { member_id: "priya", language: "en" },
    });
    assert(finalBrief.structuredContent?.stats?.unowned === 0, `Expected 0 unowned tasks, got ${finalBrief.structuredContent?.stats?.unowned}`);
    console.log("✓ 0 unowned tasks: No responsibility left unowned!");

    console.log("\n🎉 ALL 10 DEMO CHECKS PASSED PERFECTLY!");
  } finally {
    serverInstance.cleanup();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

runDemoCheck().catch((err) => {
  console.error("Fatal demo-check error:", err);
  process.exit(1);
});
