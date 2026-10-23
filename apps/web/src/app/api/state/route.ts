import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { MCP_BASE_URL } from "@/lib/mcp-client";
import { getFallbackSeedState } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const viewer = request.nextUrl.searchParams.get("viewer") ?? "priya";
  try {
    const res = await fetch(`${MCP_BASE_URL}/state?viewer=${encodeURIComponent(viewer)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.ok) {
        return NextResponse.json(data, { status: 200 });
      }
    }
  } catch {
    // If backend is not deployed as a separate microservice, serve seed state
  }

  // Gracefully fallback to seed state so UI, Globe, and caregivers render perfectly
  return NextResponse.json({
    ok: true,
    data: getFallbackSeedState(viewer),
  });
}
