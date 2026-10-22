import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { MCP_BASE_URL, ADMIN_TOKEN } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${MCP_BASE_URL}/admin/clock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL", message: (err as Error).message },
      },
      { status: 502 }
    );
  }
}
