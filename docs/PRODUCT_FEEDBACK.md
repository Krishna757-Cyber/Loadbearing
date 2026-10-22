# Product Feedback: Developer Experience & Tooling

Constructive, actionable developer feedback based on real implementation of LoadBearing for the hackathon.

---

## 1. Model Context Protocol (MCP) TypeScript SDK (`@modelcontextprotocol/sdk`)
- **Strengths**: The transition to `StreamableHTTPServerTransport` is a massive improvement over older legacy SSE transports. Session handling via `Mcp-Session-Id` works cleanly.
- **Feedback & Suggestions**:
  1. *Schema Inference with Zod*: When registering tools with `registerTool`, the TypeScript inference for the tool arguments from `inputSchema` occasionally requires explicit casting when accessing properties in TypeScript strict mode. Providing a helper `inferSchema<typeof schema>` would streamline development.
  2. *Inspector Streamable HTTP Feedback*: The MCP Inspector (`@modelcontextprotocol/inspector`) currently defaults to legacy SSE in several UI presets. Adding an explicit one-click "Streamable HTTP" toggle with pre-filled headers would reduce developer confusion when testing 2025-11-25 servers.

---

## 2. Amazon Bedrock Runtime SDK (`@aws-sdk/client-bedrock-runtime`)
- **Strengths**: The `ConverseCommand` API is clean, fast, and unifies system prompts, messages, and inference configuration into a single ergonomic object across models.
- **Feedback & Suggestions**:
  1. *JSON Mode / Structured Outputs*: While `Claude 3.5 Haiku` reliably formats JSON when prompted, native `response_format: { type: "json_object" }` at the Bedrock API level (similar to OpenAI or Anthropic direct) would eliminate the need for manual regex code-fence stripping (`stripCodeFences`).
  2. *Standard Error Payloads*: Throttling errors vs model access validation errors would benefit from typed SDK error subclasses (e.g. `ModelNotAccessibleException`, `ThrottlingException`) to make circuit-breaker logic even simpler.

---

## 3. Amazon DynamoDB Document Client (`@aws-sdk/lib-dynamodb`)
- **Strengths**: Single-table transactional writes (`TransactWriteItems`) combined with conditional version checks (`ConditionExpression: version = :expectedVersion`) provide rock-solid optimistic concurrency control without distributed locks.
- **Feedback & Suggestions**:
  1. *Batch Transaction Limits*: `TransactWriteItems` has a limit of 100 operations. While plenty for a single family household, helper utilities for chunking large atomic transactions into sequential commits would be helpful for large-scale enterprise use cases.

---

## 4. Next.js 16 + React 19 + React Three Fiber
- **Strengths**: Turbopack performance in Next.js 16 is remarkably fast, compiling the production bundle in under 7 seconds.
- **Feedback & Suggestions**:
  1. *React 19 Types with Three.js*: React 19 replaced `JSX.Element` with `React.ReactNode` in standard components, which can create subtle type errors when third-party libraries expect older JSX namespaces. Specifying clean monorepo hoisting guides for R3F helps developers avoid manual typing workarounds.
