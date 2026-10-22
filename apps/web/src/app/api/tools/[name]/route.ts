import type { NextRequest} from "next/server";
import { NextResponse } from "next/server";
import { executeTool } from "@/lib/mcp-client";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ name: string }> }
) {
  const { name } = await context.params;
  try {
    const body = await request.json().catch(() => ({}));
    const result = await executeTool(name, body);
    return NextResponse.json(result);
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
