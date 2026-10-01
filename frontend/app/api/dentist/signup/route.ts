import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));

    const { email, practice_name, phone, plan } = body;

    if (!email || !practice_name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const q = sql();

    // Check if dentist already exists
    const existing = await q`
      SELECT id FROM dentist_accounts WHERE email = ${email}
    `;

    if (existing && existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    // Create dentist account
    const dentist = await q`
      INSERT INTO dentist_accounts (
        email,
        practice_name,
        status,
        subscription_status,
        subscription_plan,
        trial_ends_at
      ) VALUES (
        ${email},
        ${practice_name},
        'ACTIVE',
        'TRIAL',
        ${plan || 'starter'},
        now() + interval '14 days'
      )
      RETURNING id, email, practice_name, subscription_plan, trial_ends_at
    `;

    return NextResponse.json({
      success: true,
      dentist: dentist[0],
      message: "Account created successfully. Your 14-day trial has started.",
    });

  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
