import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripe() {
  const apiKey = process.env.STRIPE_SECRET_KEY;
  if (!apiKey) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(apiKey, { apiVersion: "2025-08-27.basil" });
}

export async function POST(req: Request) {
  try {
    await ensureSchema();
    const body = await req.json().catch(() => ({}));
    const { action, dentist_id, email, plan } = body;

    if (!action) {
      return NextResponse.json({ error: "action required" }, { status: 400 });
    }

    if (action === "create") {
      return createSubscription(dentist_id, email, plan);
    } else if (action === "get") {
      return getSubscription(dentist_id);
    } else if (action === "cancel") {
      return cancelSubscription(dentist_id);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Error in subscription handler:", error);
    return NextResponse.json(
      { error: "Subscription operation failed" },
      { status: 500 }
    );
  }
}

async function createSubscription(dentistId: number, email: string, plan: string = "starter") {
  try {
    const stripe = getStripe();
    const q = sql();

    // Verify dentist exists
    const dentist = await q`SELECT id FROM dentist_accounts WHERE id = ${dentistId}`;
    if (!dentist || dentist.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    // Plan pricing (in cents)
    const plans: Record<string, { price: number; interval: string }> = {
      starter: { price: 4999, interval: "month" }, // $49.99/month
      professional: { price: 9999, interval: "month" }, // $99.99/month
      enterprise: { price: 29999, interval: "month" }, // $299.99/month
    };

    const selectedPlan = plans[plan] || plans.starter;

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email,
      metadata: {
        dentist_id: dentistId.toString(),
      },
    });

    // Create Stripe price
    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: selectedPlan.price,
      recurring: {
        interval: selectedPlan.interval as "day" | "week" | "month" | "year",
        trial_period_days: 14,
      },
      product_data: {
        name: `Smile Designer - ${plan}`,
      },
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id }],
      trial_period_days: 14,
    });

    // Update dentist account
    await q`
      UPDATE dentist_accounts
      SET stripe_customer_id = ${customer.id},
          stripe_subscription_id = ${subscription.id},
          subscription_plan = ${plan},
          subscription_status = ${subscription.status as string},
          trial_ends_at = to_timestamp(${subscription.trial_end || 0}),
          current_period_start = to_timestamp(${subscription.items.data[0]?.current_period_start ?? 0}),
          current_period_end = to_timestamp(${subscription.items.data[0]?.current_period_end ?? 0}),
          updated_at = now()
      WHERE id = ${dentistId}
    `;

    // Create subscription record
    await q`
      INSERT INTO smile_designer_subscriptions (
        dentist_id,
        stripe_subscription_id,
        stripe_customer_id,
        plan_name,
        price_cents,
        status,
        current_period_start,
        current_period_end,
        trial_start,
        trial_end,
        stripe_data
      ) VALUES (
        ${dentistId},
        ${subscription.id},
        ${customer.id},
        ${plan},
        ${selectedPlan.price},
        ${subscription.status},
        to_timestamp(${subscription.items.data[0]?.current_period_start ?? 0}),
        to_timestamp(${subscription.items.data[0]?.current_period_end ?? 0}),
        to_timestamp(${subscription.trial_start || 0}),
        to_timestamp(${subscription.trial_end || 0}),
        ${JSON.stringify(subscription)}::jsonb
      )
    `;

    return NextResponse.json({
      success: true,
      subscription_id: subscription.id,
      customer_id: customer.id,
      status: subscription.status,
      trial_ends_at: new Date((subscription.trial_end || 0) * 1000),
      message: "Subscription created successfully",
    });

  } catch (error) {
    console.error("Error creating subscription:", error);
    return NextResponse.json(
      { error: `Failed to create subscription: ${String(error).slice(0, 200)}` },
      { status: 500 }
    );
  }
}

async function getSubscription(dentistId: number) {
  try {
    const stripe = getStripe();
    const q = sql();

    const result = await q`
      SELECT stripe_subscription_id, stripe_customer_id, subscription_status, subscription_plan
      FROM dentist_accounts
      WHERE id = ${dentistId}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    const dentist = result[0];
    if (!dentist.stripe_subscription_id) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const subscription = await stripe.subscriptions.retrieve(dentist.stripe_subscription_id);

    return NextResponse.json({
      subscription_id: subscription.id,
      status: subscription.status,
      plan: dentist.subscription_plan,
      customer_id: dentist.stripe_customer_id,
      current_period_start: new Date((subscription.items.data[0]?.current_period_start ?? 0) * 1000),
      current_period_end: new Date((subscription.items.data[0]?.current_period_end ?? 0) * 1000),
    });

  } catch (error) {
    console.error("Error getting subscription:", error);
    return NextResponse.json(
      { error: "Failed to retrieve subscription" },
      { status: 500 }
    );
  }
}

async function cancelSubscription(dentistId: number) {
  try {
    const stripe = getStripe();
    const q = sql();

    const result = await q`
      SELECT stripe_subscription_id
      FROM dentist_accounts
      WHERE id = ${dentistId}
    `;

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Dentist not found" }, { status: 404 });
    }

    const stripeSubId = result[0].stripe_subscription_id;
    if (!stripeSubId) {
      return NextResponse.json({ error: "No subscription found" }, { status: 404 });
    }

    const canceledSubscription = await stripe.subscriptions.cancel(stripeSubId);

    // Update status
    await q`
      UPDATE dentist_accounts
      SET subscription_status = 'CANCELLED', updated_at = now()
      WHERE id = ${dentistId}
    `;

    return NextResponse.json({
      success: true,
      subscription_id: canceledSubscription.id,
      status: canceledSubscription.status,
    });

  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
