import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { executeTool } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

const DOORSTEP_PRESETS: Record<string, { text: string; label: string }> = {
  delivery: {
    text: "A delivery box was left at Dadi's front porch. Someone needs to bring it inside.",
    label: "Delivery at door",
  },
  visitor: {
    text: "An unexpected visitor is knocking at Dadi's front door late in the evening. Please check in on her.",
    label: "Unexpected visitor",
  },
  courier: {
    text: "Regular postal courier dropped the daily newspaper and standard letters through the mail slot.",
    label: "Regular courier",
  },
};

export async function POST(request: NextRequest) {
  try {
    const { type } = await request.json();
    const preset = DOORSTEP_PRESETS[type] ?? DOORSTEP_PRESETS.delivery;

    // 1. Capture moment as source doorstep, captured_by system
    const captureResult = await executeTool("capture_moment", {
      text: preset.text,
      source: "doorstep",
      captured_by: "system",
      language: "en",
    });

    const structured = (captureResult as { structuredContent?: Record<string, unknown> })?.structuredContent;
    const momentId = (structured?.moment_id as string) ?? "";
    const classification = structured?.classification as { kind?: string } | undefined;

    let handoffResult = null;

    // 2. If care_task, create handoff sharing with all caregivers
    if (momentId && classification?.kind === "care_task") {
      handoffResult = await executeTool("create_handoff", {
        moment_id: momentId,
        actor_id: "system",
        share_with: ["priya", "arjun", "meera"],
      });
    }

    return NextResponse.json({
      ok: true,
      capture: captureResult,
      handoff: handoffResult,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: { code: "INTERNAL", message: (err as Error).message },
      },
      { status: 500 }
    );
  }
}
