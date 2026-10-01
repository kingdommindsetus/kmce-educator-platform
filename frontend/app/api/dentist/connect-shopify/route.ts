import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));

    const { email, store_url, access_token, shop_id } = body;

    if (!email || !access_token || !shop_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const q = sql();

    // Get dentist by email
    const dentist = await q`
      SELECT id FROM dentist_accounts WHERE email = ${email}
    `;

    if (!dentist || dentist.length === 0) {
      return NextResponse.json(
        { error: "Dentist account not found" },
        { status: 404 }
      );
    }

    const dentistId = dentist[0].id;

    // Verify Shopify connection
    try {
      const response = await fetch(
        `https://${shop_id}.myshopify.com/admin/api/2024-01/shop.json`,
        {
          headers: {
            "X-Shopify-Access-Token": access_token,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Invalid Shopify credentials");
      }
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to connect to Shopify. Check your credentials." },
        { status: 400 }
      );
    }

    // Update dentist with Shopify info
    const updated = await q`
      UPDATE dentist_accounts
      SET shopify_store_url = ${store_url || `${shop_id}.myshopify.com`},
          shopify_shop_id = ${shop_id},
          shopify_access_token = ${access_token},
          updated_at = now()
      WHERE id = ${dentistId}
      RETURNING id, email, practice_name, shopify_shop_id
    `;

    return NextResponse.json({
      success: true,
      dentist: updated[0],
      message: "Shopify connected successfully!",
    });

  } catch (error) {
    console.error("Shopify connection error:", error);
    return NextResponse.json(
      { error: "Failed to connect Shopify" },
      { status: 500 }
    );
  }
}
