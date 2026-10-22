import { NextResponse } from "next/server";
import { MCP_BASE_URL, ADMIN_TOKEN } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const res = await fetch(`${MCP_BASE_URL}/admin/reset`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
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
