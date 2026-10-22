# Devpost Project Submission: LoadBearing

## Title
**LoadBearing**

## Tagline
**Care shared fairly. Nothing falls between people.**

---

## 100-Word Pitch
Families caring for elderly parents across time zones face a hidden crisis: invisible planning piles up on one sibling, urgent tasks drop when someone is asleep, and remote relatives cannot handle local emergencies. LoadBearing solves this through a self-hosted Model Context Protocol (MCP) server over Streamable HTTP paired with a stunning 3D Twilight Globe. Using Amazon Bedrock and DynamoDB, spoken commitments are converted into structured care moments, credited with verifiable evidence, and routed across awake time zones. With privacy-first mutual consent, fair-share load rebalancing, and multilingual continuity briefs, LoadBearing ensures no responsibility is left unowned.

---

## Inspiration
Caring for aging parents is one of the most universal, emotionally demanding challenges families encounter. In distributed families, care work is deeply asymmetric: one sibling often shoulders the mental burden of scheduling, tracking bills, and researching clinics without any recognition. Meanwhile, brothers and sisters living thousands of miles away want to help, but don't know what needs doing or reach out when their family is asleep. We wanted to build a system that illuminates invisible care, respects sleep, and distributes responsibility fairly.

---

## What It Does
1. **Spoken Capture & Crediting**: Spoken reflections or Alexa+ voice prompts are analyzed by Amazon Bedrock. Work the speaker has already done is verified and credited with verbatim evidence.
2. **Follow-the-Sun Routing**: Open tasks are routed deterministically based on awake windows, time-zone tax ($2\times$ weight for sleep-hour work), local physical presence requirements, and 7-day accumulated load shares.
3. **3D Twilight Globe ("TwilightGlobe")**: A dotted Three.js day/night globe where each caregiver is a pillar of light whose height represents their load. As the sun moves, pillars glow when awake and dim into moonlit indigo when asleep.
4. **Mutual Consent & Privacy Rings**: Exact pillar heights and burden percentages are withheld until all caregivers mutually consent to share, preventing unfair guilt.
5. **Automatic Escalation & Continuity**: Tasks unacknowledged within a configurable deadline reroute automatically to the next awake caregiver. A daily family brief provides warm summaries in English or Hindi (Devanagari).

---

## How We Built It
- **Architecture**: A modular npm monorepo with strict TypeScript and zero compiler warnings.
- **MCP Server**: Implements the official `@modelcontextprotocol/sdk` (protocol `2025-11-25`) with `StreamableHTTPServerTransport` behind an Express server on port `8787`. Stateful sessions and real-time SSE (`/events`) provide push updates.
- **AI Agents**: Amazon Bedrock (`ConverseCommand` targeting Claude 3.5 Haiku) with strict JSON schema parsing, 8-second timeouts, circuit breakers, and deterministic rules fallback.
- **Database**: Swappable storage architecture supporting a local JSON adapter with atomic writes and an Amazon DynamoDB single-table implementation with optimistic concurrency control and TTL pruning.
- **Frontend**: Next.js 16 App Router, React Three Fiber, Three.js custom GLSL terminator shaders, Zustand state management, Tailwind CSS, and Web Speech API.

---

## AWS Builder Challenge Answers
- **Amazon Bedrock**: Used as the multi-agent inference engine for:
  - Care Moment Classification (distinguishing physical doing, mental planning, and emotional care).
  - Rational Explainer (crafting concise, calm explanations in the assignee's native language).
  - Family Continuity Brief Writer (authoring letter-style daily summaries with strict grounding).
- **Amazon DynamoDB**: Single-table design (`HOUSEHOLD#demo`) with composite sort keys, conditional writes (`ConditionExpression: version = :expectedVersion`), and TTL expiration for ephemeral doorstep moments (+48h).

---

## Open Source Challenge Answer
We extracted the core mathematical and routing engine into a standalone MIT-licensed library: **`followthesun-router`** (located at `packages/router`). It operates as a pure TypeScript library with zero I/O and full Luxon IANA time zone support, achieving over 90% test coverage across DST transitions, leap years, and daylight boundaries.
