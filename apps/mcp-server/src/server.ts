import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { makeId, makeError } from "@loadbearing/shared";
import { getStorageAdapter } from "./storage/index.js";
import { createSeedState, createSeedClock } from "./storage/seed.js";
import { ClockManager } from "./clock.js";
import { registerAllTools } from "./tools.js";
import { filterHouseholdForViewer } from "./privacy.js";
import { checkAndApplyEscalations } from "./escalation.js";

// Logger with correlation IDs and text redaction
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: ["req.body.text", "req.body.message", "text", "message", "explanation"],
    censor: "[REDACTED_TEXT]",
  },
});

export interface ServerInstance {
  app: express.Express;
  clock: ClockManager;
  storage: ReturnType<typeof getStorageAdapter>;
  cleanup: () => void;
}

export function createServer(): ServerInstance {
  const app = express();
  const storage = getStorageAdapter();
  const clock = new ClockManager();

  // Initialize clock from storage
  storage.loadHousehold().then((household) => {
    clock.setClock(household.clock);
  }).catch(() => {
    // Keep initial clock
  });

  const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "demo-admin-token";
  const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN ?? "*";

  // SSE Subscribers
  const sseClients = new Set<{ res: Response; lastId?: number }>();

  function broadcastVersion(version: number) {
    const eventData = `event: state_changed\nid: ${version}\ndata: ${JSON.stringify({ version })}\n\n`;
    for (const client of sseClients) {
      try {
        client.res.write(eventData);
        client.lastId = version;
      } catch {
        sseClients.delete(client);
      }
    }
  }

  // Periodic heartbeat every 15s
  const heartbeatTimer = setInterval(() => {
    for (const client of sseClients) {
      try {
        client.res.write(": heartbeat\n\n");
      } catch {
        sseClients.delete(client);
      }
    }
  }, 15000);

  // Periodic escalations check every 1s
  const escalationTimer = setInterval(async () => {
    try {
      const res = await checkAndApplyEscalations(storage, clock);
      if (res.changed && res.version !== undefined) {
        broadcastVersion(res.version);
      }
    } catch {
      // Ignore background evaluation errors
    }
  }, 1000);

  // Middlewares
  app.use(cors({ origin: ALLOWED_ORIGIN, credentials: true }));
  app.use(express.json({ limit: "64kb" }));

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req.headers["x-request-id"] as string) || makeId("req"),
    })
  );

  // Rate limiting (120 req/min/IP)
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT ?? "120", 10),
    standardHeaders: true,
    legacyHeaders: false,
    message: makeError("RATE_LIMITED", "Too many requests, please slow down"),
  });
  app.use(limiter);

  // ─── Root Landing Endpoint ────────────────────────────────────────────────
  app.get("/", async (_req: Request, res: Response) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LoadBearing MCP Server</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; background: #14182B; color: #EDEAF6; padding: 2rem; max-width: 600px; margin: auto; }
            h1 { color: #FFC66B; margin-bottom: 0.25rem; }
            p { color: #9AA3D6; line-height: 1.5; }
            .card { background: #262B52; border: 1px solid #3A4178; padding: 1.25rem; border-radius: 8px; margin-top: 1.5rem; }
            a { color: #5B9CFF; text-decoration: none; font-weight: bold; }
            a:hover { text-decoration: underline; }
            .btn { display: inline-block; background: #FFC66B; color: #14182B; padding: 0.6rem 1.2rem; border-radius: 6px; font-weight: bold; margin-top: 1rem; }
          </style>
        </head>
        <body>
          <h1>LoadBearing MCP Server</h1>
          <p>Streamable HTTP Model Context Protocol (MCP) Server running on port 8787.</p>
          <div class="card">
            <p><strong>Web UI Frontend:</strong> Running on <a href="http://localhost:3000">http://localhost:3000</a></p>
            <p><strong>Health Check:</strong> <a href="/healthz">/healthz</a></p>
            <p><strong>MCP Protocol Endpoint:</strong> <code>/mcp</code></p>
            <p><strong>SSE Events Stream:</strong> <a href="/events">/events</a></p>
            <a class="btn" href="http://localhost:3000">Open LoadBearing Web App →</a>
          </div>
        </body>
      </html>
    `);
  });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get("/healthz", async (_req: Request, res: Response) => {
    try {
      const household = await storage.loadHousehold();
      res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        storage: process.env.STORAGE ?? "local",
        version: household.version,
        simNow: clock.now(),
      });
    } catch (err: unknown) {
      res.status(500).json(makeError("INTERNAL", (err as Error).message));
    }
  });

  // ─── State endpoint with privacy rules ────────────────────────────────────
  app.get("/state", async (req: Request, res: Response) => {
    const viewerId = req.query.viewer as string | undefined;
    if (!viewerId) {
      const err = makeError(
        "VALIDATION",
        "Missing required 'viewer' query parameter",
        "Pass ?viewer=<member_id>, e.g. ?viewer=priya"
      );
      res.status(400).json(err);
      return;
    }

    try {
      const household = await storage.loadHousehold();
      const viewer = household.members.find((m) => m.id === viewerId);
      if (!viewer) {
        const err = makeError(
          "VALIDATION",
          `Viewer id '${viewerId}' does not exist in demo household`,
          "Valid members: dadi, priya, arjun, meera"
        );
        res.status(400).json(err);
        return;
      }

      const filtered = filterHouseholdForViewer(household, viewerId, clock.now());
      res.json({
        ok: true,
        data: {
          ...filtered,
          clock: clock.getWireState(),
        },
      });
    } catch (err: unknown) {
      res.status(500).json(makeError("INTERNAL", (err as Error).message));
    }
  });

  // ─── SSE Events endpoint ──────────────────────────────────────────────────
  app.get("/events", async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const client = { res };
    sseClients.add(client);

    // Initial event
    try {
      const household = await storage.loadHousehold();
      const lastEventId = req.headers["last-event-id"] as string | undefined;
      const lastIdNum = lastEventId ? parseInt(lastEventId, 10) : 0;
      if (!lastIdNum || lastIdNum < household.version) {
        res.write(
          `event: state_changed\nid: ${household.version}\ndata: ${JSON.stringify({
            version: household.version,
          })}\n\n`
        );
      }
    } catch {
      // Ignore initial load failure
    }

    req.on("close", () => {
      sseClients.delete(client);
    });
  });

  // ─── Admin routes ─────────────────────────────────────────────────────────
  const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers["x-admin-token"];
    if (token !== ADMIN_TOKEN) {
      res.status(403).json(makeError("FORBIDDEN", "Invalid or missing x-admin-token header"));
      return;
    }
    next();
  };

  app.post("/admin/clock", adminAuth, async (req: Request, res: Response) => {
    const { action, iso, minutes, speed } = req.body;
    let updatedClock = clock.getClock();

    if (action === "set" && typeof iso === "string") {
      updatedClock = clock.set(iso);
    } else if (action === "advance" && typeof minutes === "number") {
      updatedClock = clock.advance(minutes);
    } else if (action === "play") {
      updatedClock = clock.play();
    } else if (action === "pause") {
      updatedClock = clock.pause();
    } else if (action === "speed" && typeof speed === "number") {
      updatedClock = clock.speed(speed);
    } else {
      res.status(400).json(makeError("VALIDATION", "Invalid clock action or parameters"));
      return;
    }

    try {
      const household = await storage.loadHousehold();
      const resTransact = await storage.transact(
        [{ type: "update_clock", clock: updatedClock }],
        household.version
      );

      // Check escalations on clock change
      const escRes = await checkAndApplyEscalations(storage, clock);
      const latestVer = escRes.version ?? resTransact.version;
      broadcastVersion(latestVer);

      res.json({ ok: true, clock: clock.getWireState() });
    } catch (err: unknown) {
      res.status(500).json(makeError("INTERNAL", (err as Error).message));
    }
  });

  app.post("/admin/reset", adminAuth, async (_req: Request, res: Response) => {
    try {
      const household = await storage.loadHousehold();
      const freshSeed = createSeedState();
      const resTransact = await storage.transact(
        [{ type: "reset_household", state: freshSeed }],
        household.version
      );
      clock.setClock(createSeedClock());
      broadcastVersion(resTransact.version);

      res.json({ ok: true, message: "Household reset to seed state" });
    } catch (err: unknown) {
      res.status(500).json(makeError("INTERNAL", (err as Error).message));
    }
  });

  app.post("/admin/consent", adminAuth, async (req: Request, res: Response) => {
    const { member_id, consent_share } = req.body;
    if (typeof member_id !== "string" || typeof consent_share !== "boolean") {
      res.status(400).json(makeError("VALIDATION", "member_id and consent_share required"));
      return;
    }

    try {
      const household = await storage.loadHousehold();
      const resTransact = await storage.transact(
        [{ type: "update_member_consent", memberId: member_id, consentShare: consent_share }],
        household.version
      );
      broadcastVersion(resTransact.version);

      res.json({ ok: true, member_id, consent_share });
    } catch (err: unknown) {
      res.status(500).json(makeError("INTERNAL", (err as Error).message));
    }
  });

  // ─── Stateful MCP Sessions ────────────────────────────────────────────────
  interface SessionEntry {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
    lastActive: number;
  }

  const sessions = new Map<string, SessionEntry>();

  // Idle session cleanup (30 minutes)
  const sessionCleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [id, s] of sessions.entries()) {
      if (now - s.lastActive > 30 * 60 * 1000) {
        s.transport.close().catch(() => {});
        sessions.delete(id);
      }
    }
  }, 60 * 1000);

  function createSession(sessionId: string): SessionEntry {
    const server = new McpServer(
      {
        name: "LoadBearing",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    registerAllTools(server, storage, clock, async () => {
      try {
        const hh = await storage.loadHousehold();
        broadcastVersion(hh.version);
        const esc = await checkAndApplyEscalations(storage, clock);
        if (esc.changed && esc.version !== undefined) {
          broadcastVersion(esc.version);
        }
      } catch {
        // ignore
      }
    });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: true,
      enableDnsRebindingProtection: false,
    });

    server.connect(transport).catch((err) => {
      logger.error({ err }, "Failed to connect McpServer to transport");
    });

    const entry: SessionEntry = { server, transport, lastActive: Date.now() };
    sessions.set(sessionId, entry);
    return entry;
  }

  // ─── Single /mcp endpoint for POST, GET, DELETE ───────────────────────────
  app.all("/mcp", async (req: Request, res: Response) => {
    const sessionIdHeader = req.headers["mcp-session-id"] as string | undefined;

    if (req.method === "POST") {
      // Check if session ID provided
      if (sessionIdHeader) {
        const session = sessions.get(sessionIdHeader);
        if (!session) {
          res.status(404).json(makeError("NOT_FOUND", "Session not found or expired"));
          return;
        }
        session.lastActive = Date.now();
        await session.transport.handleRequest(req, res, req.body);
        return;
      }

      // No session header -> this must be an initialize request
      const isInit =
        req.body &&
        (req.body.method === "initialize" ||
          (Array.isArray(req.body) && req.body.some((m: { method?: string }) => m.method === "initialize")));

      if (!isInit) {
        res.status(400).json(
          makeError(
            "VALIDATION",
            "Mcp-Session-Id header is required for non-initialize requests"
          )
        );
        return;
      }

      // Create new session
      const newSessionId = makeId("sess");
      const session = createSession(newSessionId);
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    if (req.method === "GET") {
      if (!sessionIdHeader) {
        res.status(400).json(makeError("VALIDATION", "Mcp-Session-Id header required"));
        return;
      }
      const session = sessions.get(sessionIdHeader);
      if (!session) {
        res.status(404).json(makeError("NOT_FOUND", "Session not found"));
        return;
      }
      session.lastActive = Date.now();
      await session.transport.handleRequest(req, res);
      return;
    }

    if (req.method === "DELETE") {
      if (!sessionIdHeader) {
        res.status(400).json(makeError("VALIDATION", "Mcp-Session-Id header required"));
        return;
      }
      const session = sessions.get(sessionIdHeader);
      if (!session) {
        res.status(404).json(makeError("NOT_FOUND", "Session not found"));
        return;
      }
      await session.transport.handleRequest(req, res);
      await session.transport.close().catch(() => {});
      sessions.delete(sessionIdHeader);
      return;
    }

    res.status(405).json(makeError("VALIDATION", `Method ${req.method} not allowed on /mcp`));
  });

  const cleanup = () => {
    clearInterval(heartbeatTimer);
    clearInterval(escalationTimer);
    clearInterval(sessionCleanupTimer);
    for (const s of sessions.values()) {
      s.transport.close().catch(() => {});
    }
    sessions.clear();
  };

  return { app, clock, storage, cleanup };
}
