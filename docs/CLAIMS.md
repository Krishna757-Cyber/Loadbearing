# Project Claims & Verification Boundaries

To uphold the highest standards of engineering honesty and transparency, this document articulates what is real and what is simulated in the LoadBearing project.

---

## 1. Real Implementations

1. **Model Context Protocol (MCP) Server**:
   - Implements official protocol specification version `2025-11-25`.
   - Uses `StreamableHTTPServerTransport` over standard HTTP.
   - Stateful session tracking via `Mcp-Session-Id` header with idle eviction.
   - Server-Sent Events (SSE) live updates on `/events`.
   - Five complete, registered MCP tools tested via official `@modelcontextprotocol/sdk`.

2. **Amazon Bedrock AI Agents**:
   - Real multi-agent pipeline using `@aws-sdk/client-bedrock-runtime`.
   - Targets Anthropic Claude 3.5 Haiku via `ConverseCommand`.
   - Strict Zod schema validation on all outputs with single-retry recovery and circuit breaker fallback to the deterministic rules engine.

3. **Amazon DynamoDB Adapter**:
   - Single-table design (`HOUSEHOLD#demo`) using `@aws-sdk/lib-dynamodb`.
   - Atomic multi-item updates using `TransactWriteItems`.
   - Optimistic concurrency control using `ConditionExpression: version = :expectedVersion`.
   - Time-to-Live (TTL) automatic pruning for ephemeral doorstep moments (+48h) and idempotency cache records (+24h).

4. **Follow-the-Sun Routing Engine (`followthesun-router`)**:
   - Pure TypeScript, zero I/O standalone package published in `packages/router/`.
   - Calculations use Luxon IANA zones (never static UTC offsets).
   - Proven DST transition handling (e.g. Europe/Berlin and America/Toronto autumn fallbacks).
   - Time-zone tax ($2\times$ weight for work performed in a member's sleep hours).
   - 90%+ unit test coverage with Vitest.

5. **3D Twilight Globe**:
   - Three.js and React Three Fiber rendering 7,000 instanced land dots.
   - Custom GLSL terminator shaders calculating real subsolar declination based on UTC simulation time.
   - Responsive performance monitoring with automatic fallback to a 2D SVG time-zone strip if WebGL is unavailable.

---

## 2. Simulated Elements

1. **Simulated Alexa+ Voice Surface**:
   - The voice UI operates in the browser using the HTML5 Web Speech API (`SpeechRecognition` and `SpeechSynthesis`) and Web Audio API (`AnalyserNode`).
   - It is **not** a physical Echo device and does not integrate with private Ring or Alexa hardware APIs.

2. **Simulated Doorstep Events**:
   - Doorbell and doorstep camera triggers are generated via the demo simulator (`POST /api/simulate/doorstep`).
   - There is no physical Ring camera or smart lock integration.

3. **Demo World & Authentication**:
   - The demo household operates with seeded family data (Dadi in Toronto, Priya in Pune, Arjun in Berlin, Meera in Toronto).
   - Switching perspective is achieved through the "View as" role selector. There is no multi-user OAuth or password authentication.

---

## 3. Strict Non-Claims

- **No Medical Advice**: LoadBearing is an emotional and logistics coordination system. It never diagnoses conditions, prescribes medication, or provides emergency dispatch.
- **No Novelty Superlatives**: We do not claim to be the "first ever" care application; we simply aim to build a beautifully executed, reliable tool for distributed families.
