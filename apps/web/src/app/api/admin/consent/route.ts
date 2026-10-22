import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { MCP_BASE_URL, ADMIN_TOKEN } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { member_id, consent_share, viewer_id } = body;

    // Enforce that only the viewed member can change their own consent
    if (viewer_id && viewer_id !== member_id) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only update your own consent settings.",
            fix: `Switch 'View as' to ${member_id} to modify their consent.`,
          },
        },
        { status: 403 }
      );
    }

    const res = await fetch(`${MCP_BASE_URL}/admin/consent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-token": ADMIN_TOKEN,
      },
      body: JSON.stringify({ member_id, consent_share }),
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
