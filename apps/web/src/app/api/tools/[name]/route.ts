import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { executeTool } from "@/lib/mcp-client";
import { executeToolFallback } from "@/lib/tool-fallback";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await executeTool(name, body);
    return NextResponse.json(result);
  } catch {
    // If the external MCP daemon is unreachable (e.g. running standalone on Vercel),
    // gracefully execute our deterministic in-process fallback engine.
    try {
      const fallbackResult = executeToolFallback(name, body);
      return NextResponse.json(fallbackResult);
    } catch (err: unknown) {
      return NextResponse.json(
        {
          isError: true,
          error: {
            code: "INTERNAL",
            message: `Tool execution failed: ${(err as Error).message}`,
          },
        },
        { status: 500 }
      );
    }
  }
}
