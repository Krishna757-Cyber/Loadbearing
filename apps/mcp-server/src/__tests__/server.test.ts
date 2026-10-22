import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createServer } from "../server.js";
import { LocalJsonAdapter } from "../storage/local-json-adapter.js";
import { setStorageAdapter } from "../storage/index.js";

describe("LoadBearing MCP Server & HTTP endpoints", () => {
  let httpServer: Server;
  let port: number;
  let baseUrl: string;
  let serverInstance: ReturnType<typeof createServer>;
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "lb-mcp-test-"));
    const tmpDb = path.join(tmpDir, "db.json");
    const testAdapter = new LocalJsonAdapter(tmpDb);
    setStorageAdapter(testAdapter);

    serverInstance = createServer();
    await new Promise<void>((resolve) => {
      httpServer = serverInstance.app.listen(0, () => {
        const addr = httpServer.address();
        if (typeof addr === "object" && addr) {
          port = addr.port;
          baseUrl = `http://localhost:${port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    serverInstance.cleanup();
    await new Promise<void>((resolve) => httpServer.close(() => { resolve(); }));
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  // ─── Health check ─────────────────────────────────────────────────────────
  it("GET /healthz returns 200 with ok, version, and simNow", async () => {
    const res = await fetch(`${baseUrl}/healthz`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.version).toBeGreaterThanOrEqual(1);
    expect(body.simNow).toBeDefined();
  });

  // ─── State & Privacy ──────────────────────────────────────────────────────
  it("GET /state without viewer returns 400 with VALIDATION error", async () => {
    const res = await fetch(`${baseUrl}/state`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION");
  });

  it("GET /state?viewer=priya returns Priya's view with other shares null", async () => {
    const res = await fetch(`${baseUrl}/state?viewer=priya`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.viewerId).toBe("priya");
    expect(body.data.allConsented).toBe(false);

    // Priya's share is visible to herself
    const priya = body.data.members.find((m: { id: string }) => m.id === "priya");
    expect(priya.computedShare).toBeCloseTo(60.0, 0);

    // Others' shares are null because Priya has not consented
    const arjun = body.data.members.find((m: { id: string }) => m.id === "arjun");
    expect(arjun.computedShare).toBeNull();
  });

  it("GET /state?viewer=dadi only reveals shared memories and non-sensitive resolved tasks", async () => {
    const res = await fetch(`${baseUrl}/state?viewer=dadi`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.viewerRole).toBe("recipient");

    // Dadi sees the kheer memory
    const moments = body.data.moments;
    expect(moments.every((m: { classification: { sensitive: boolean } }) => !m.classification.sensitive)).toBe(true);
    const kheer = moments.find((m: { id: string }) => m.id === "mo_seed_kheer");
    expect(kheer).toBeDefined();
  });

  // ─── Admin Endpoints ──────────────────────────────────────────────────────
  it("POST /admin/clock requires x-admin-token", async () => {
    const res = await fetch(`${baseUrl}/admin/clock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "advance", minutes: 10 }),
    });
    expect(res.status).toBe(403);
  });

  it("POST /admin/clock advances simulation time with valid token", async () => {
    const res = await fetch(`${baseUrl}/admin/clock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "demo-admin-token",
      },
      body: JSON.stringify({ action: "advance", minutes: 30 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("POST /admin/consent updates Priya's consent and reveals all load shares", async () => {
    const res = await fetch(`${baseUrl}/admin/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": "demo-admin-token",
      },
      body: JSON.stringify({ member_id: "priya", consent_share: true }),
    });
    expect(res.status).toBe(200);

    // Now all 3 caregivers have consented -> shares should be visible to everyone
    const stateRes = await fetch(`${baseUrl}/state?viewer=arjun`);
    const stateBody = await stateRes.json();
    expect(stateBody.data.allConsented).toBe(true);

    const priya = stateBody.data.members.find((m: { id: string }) => m.id === "priya");
    const arjun = stateBody.data.members.find((m: { id: string }) => m.id === "arjun");
    const meera = stateBody.data.members.find((m: { id: string }) => m.id === "meera");

    expect(priya.computedShare).toBeCloseTo(60.0, 0);
    expect(arjun.computedShare).toBeCloseTo(18.6, 0);
    expect(meera.computedShare).toBeCloseTo(21.4, 0);
  });

  // ─── MCP Client Protocol Inspection & Tools ───────────────────────────────
  it("connects official MCP client over Streamable HTTP and negotiates protocol with EXACTLY 5 tools", async () => {
    const client = new Client(
      {
        name: "test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );

    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);

    const toolsRes = await client.listTools();
    const toolNames = toolsRes.tools.map((t) => t.name).sort();

    expect(toolNames).toEqual([
      "capture_moment",
      "create_handoff",
      "get_continuity_brief",
      "propose_rebalance",
      "record_resolution",
    ]);

    // Test capture_moment tool call
    const captureRes = await client.callTool({
      name: "capture_moment",
      arguments: {
        text: "I called the pharmacy and ordered Dadi's eye drops.",
        source: "voice",
        captured_by: "priya",
      },
    });

    expect(captureRes.isError).toBeFalsy();
    const structured = captureRes.structuredContent as Record<string, unknown>;
    expect(structured.moment_id).toBeDefined();
    expect(structured.ai_source).toBe("rules");
    expect((structured.credits as unknown[]).length).toBeGreaterThan(0);

    // Test get_continuity_brief tool call
    const briefRes = await client.callTool({
      name: "get_continuity_brief",
      arguments: {
        member_id: "priya",
        language: "en",
      },
    });

    expect(briefRes.isError).toBeFalsy();
    const briefData = briefRes.structuredContent as Record<string, unknown>;
    expect(briefData.text).toBeDefined();
    expect(briefData.stats).toBeDefined();

    await client.close();
  });
});
