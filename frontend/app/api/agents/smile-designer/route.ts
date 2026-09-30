import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";
import { handleSmileDesignerRequest, executeSmileDesignerAction } from "../../../../lib/smile-designer-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple auth - in production use proper JWT
function getDentistIdFromAuth(req: Request): number | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  const token = header.slice(7);
  const decoded = Buffer.from(token, "base64").toString();
  const parts = decoded.split(":");
  return parts[0] ? parseInt(parts[0]) : null;
}

export async function POST(req: Request) {
  try {
    await ensureSchema();

    const dentistId = getDentistIdFromAuth(req);
    if (!dentistId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { message, action, action_params } = body;

    if (!message && !action) {
      return NextResponse.json(
        { error: "message or action required" },
        { status: 400 }
      );
    }

    const q = sql();

    // Verify dentist exists
    const dentist = await q`SELECT id FROM dentist_accounts WHERE id = ${dentistId}`;
    if (!dentist || dentist.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    // If user message, get agent response
    if (message) {
      const agentResponse = await handleSmileDesignerRequest(dentistId, message);
      return NextResponse.json({
        role: agentResponse.role,
        content: agentResponse.content,
        action: agentResponse.action,
      });
    }

    // If explicit action, execute it
    if (action) {
      const result = await executeSmileDesignerAction(dentistId, action, action_params || {});
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "No message or action provided" }, { status: 400 });

  } catch (error) {
    console.error("Agent error:", error);
    return NextResponse.json(
      { error: "Agent request failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await ensureSchema();

    const dentistId = getDentistIdFromAuth(req);
    if (!dentistId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const q = sql();

    // Get dentist's mockups and subscription status
    const dentist = await q`
      SELECT
        email,
        practice_name,
        subscription_status,
        subscription_plan,
        stripe_subscription_id,
        shopify_store_url
      FROM dentist_accounts
      WHERE id = ${dentistId}
    `;

    if (!dentist || dentist.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    const mockups = await q`
      SELECT
        id,
        treatment_type,
        ai_generation_status,
        is_listed_for_sale,
        created_at
      FROM smile_mockups
      WHERE dentist_id = ${dentistId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    return NextResponse.json({
      dentist: dentist[0],
      mockups,
      stats: {
        total_mockups: mockups.length,
        published: mockups.filter((m: any) => m.is_listed_for_sale).length,
        generating: mockups.filter((m: any) => m.ai_generation_status === "PROCESSING").length,
      },
    });

  } catch (error) {
    console.error("Status error:", error);
    return NextResponse.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
