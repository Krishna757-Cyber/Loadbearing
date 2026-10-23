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
      signal: AbortSignal.timeout(2000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
  } catch {
    // Standalone fallback: accept reset
  }
  return NextResponse.json({ ok: true, data: { success: true } });
}
