import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { MCP_BASE_URL } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const viewer = request.nextUrl.searchParams.get("viewer") ?? "priya";
  try {
    const res = await fetch(`${MCP_BASE_URL}/state?viewer=${encodeURIComponent(viewer)}`, {
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "INTERNAL",
          message: `Failed to reach MCP server: ${(err as Error).message}`,
          fix: "Ensure MCP server is running on port 8787",
        },
      },
      { status: 502 }
    );
  }
}
