/**
 * Server-side MCP client helper for Next.js route handlers.
 * Communicates with the LoadBearing MCP server via HTTP and official MCP SDK.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const MCP_PORT = process.env.MCP_PORT ?? "8787";
export const MCP_BASE_URL = process.env.MCP_URL ? new URL(process.env.MCP_URL).origin : `http://localhost:${MCP_PORT}`;
export const MCP_ENDPOINT = `${MCP_BASE_URL}/mcp`;
export const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "demo-admin-token";

let clientInstance: Client | null = null;

export async function getMcpClient(): Promise<Client> {
  if (clientInstance) {
    return clientInstance;
  }

  const client = new Client(
    {
      name: "loadbearing-web-client",
      version: "1.0.0",
    },
    {
      capabilities: {},
    }
  );

  const transport = new StreamableHTTPClientTransport(new URL(MCP_ENDPOINT));
  await client.connect(transport);

  clientInstance = client;
  return client;
}

/**
 * Execute a registered MCP tool. If the client disconnects, reconnects once.
 */
export async function executeTool(name: string, args: Record<string, unknown>) {
  try {
    const client = await getMcpClient();
    const result = await client.callTool({
      name,
      arguments: args,
    });
    return result;
  } catch {
    // Reset client instance on failure to reconnect cleanly
    clientInstance = null;
    const client = await getMcpClient();
    return await client.callTool({
      name,
      arguments: args,
    });
  }
}
