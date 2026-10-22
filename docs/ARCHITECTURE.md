# LoadBearing Architecture Document

## Overview
LoadBearing coordinates care work for families distributed across global time zones. It solves three critical problems:
1. **Invisible Planning Work**: Planning, calling, and researching often pile up silently on one remote sibling.
2. **Nighttime Communication Drops**: Care tasks fall through the cracks when siblings are asleep.
3. **Physical vs Remote Separation**: Tasks requiring physical presence at Dadi's home in Toronto cannot be fulfilled by remote siblings in Pune or Berlin.

---

## 1. Monorepo Organization (npm workspaces)

```
loadbearing/
├── packages/
│   ├── shared/                # Zod domain schemas, interfaces, error envelopes
│   └── router/                # Published as "followthesun-router" (Pure TS, Luxon)
├── apps/
│   ├── mcp-server/            # Express + official MCP SDK + Bedrock agents + adapters
│   └── web/                   # Next.js App Router UI + 3D Twilight Globe
├── scripts/                   # build-dots.ts, seed.ts, demo-check.ts, ai-smoke.ts
├── infra/                     # DynamoDB CloudFormation table definition
└── docs/                      # Technical documentation & submission materials
```

---

## 2. MCP Server Protocol Implementation

The MCP server runs on port `8787` using the official `@modelcontextprotocol/sdk` package.
- **Transport**: `StreamableHTTPServerTransport` behind an Express application.
- **Protocol Version**: Negotiates spec version `2025-11-25`.
- **Session Management**: Handled via `Mcp-Session-Id` header with automatic 30-minute idle session cleanup.
- **Real-Time Notifications**: GET `/events` provides Server-Sent Events (`state_changed`) notifying connected clients whenever the household version counter increments.

### The 5 Registered MCP Tools
1. **`capture_moment`**:
   - Evaluates emergency lexicon first (English, Hindi, Hinglish); returns immediate emergency guidance if detected.
   - Invokes Classifier agent (Claude 3.5 Haiku via Bedrock, with rules fallback).
   - Computes credits with verbatim evidence for work already performed.
   - Computes sleep-tax multiplier ($2\times$) if performed during the captor's sleep window.
2. **`create_handoff`**:
   - Runs `followthesun-router` to select an eligible caregiver.
   - Generates personalized, localized explanation in assignee's language.
   - Sets acknowledgement deadline (`now + ACK_MINUTES`).
3. **`record_resolution`**:
   - Enforces that only the designated assignee can accept, decline, or resolve.
   - Declining immediately reroutes to the next awake caregiver.
   - Resolving logs an audited `LoadEntry` and attributes credit.
4. **`propose_rebalance`**:
   - Enforces mutual consent: returns `visibility: "private_only"` if any caregiver has not opted in.
   - Once all consent, computes fair-share deviation ($>10\%$) and creates a 7-day `RoutingPreference`.
5. **`get_continuity_brief`**:
   - Compiles a warm, family-letter summary in English or Hindi (Devanagari).
   - Enforces safety rule: the statement "no responsibility left unowned" is only rendered if unowned count is strictly 0.

---

## 3. Storage Architecture

LoadBearing defines a unified `StorageAdapter` contract implemented by two swappable adapters:
1. **`LocalJsonAdapter`**: File-based storage at `data/db.json` using an in-process mutex and atomic temp-file rename writes.
2. **`DynamoAdapter`**: Single-table Amazon DynamoDB implementation utilizing:
   - Partition Key: `HOUSEHOLD#demo`
   - Sort Key prefixes: `MEMBER#`, `MOMENT#`, `HANDOFF#`, `LOAD#`, `PREF#`, `PROPOSAL#`, `AUDIT#`, `IDEM#`, `META#`.
   - Optimistic concurrency control via `ConditionExpression: version = :expectedVersion`.
   - DynamoDB TTL attribute `ttl` for doorstep moments (+48h) and idempotency keys (+24h).

---

## 4. Privacy Visibility Guarantees

LoadBearing strictly enforces privacy boundaries:
- **Moment Privacy**: Moments marked private are never broadcast to other family members or included in foreign continuity briefs.
- **Load Share Privacy**: Caregiver load shares are private until all 3 caregivers provide mutual consent. Prior to mutual consent, each caregiver only sees their own percentage.
- **Doorstep Privacy**: Doorstep moments expire automatically after 48 hours to prevent long-term surveillance logs.
