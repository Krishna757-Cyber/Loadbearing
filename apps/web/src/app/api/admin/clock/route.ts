import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { MCP_BASE_URL, ADMIN_TOKEN } from "@/lib/mcp-client";
import { updateServerClock } from "@/lib/server-state";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, speed, minutes } = body;

    try {
      const res = await fetch(`${MCP_BASE_URL}/admin/clock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": ADMIN_TOKEN,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { status: res.status });
      }
    } catch {
      // Standalone fallback: persist in server-side memory
    }

    const updatedClock = updateServerClock(action, { speed, minutes });
    return NextResponse.json({ ok: true, data: { success: true, clock: updatedClock } });
  } catch (err: unknown) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
