import { NextResponse } from "next/server";
import { sql, ensureSchema } from "../../../../lib/db";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-08-27.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    await ensureSchema();
    
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const q = sql();

    switch (event.type) {
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription, q);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription, q);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, q);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice, q);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription, q: any) {
  const customerId = subscription.customer as string;
  const dentists = await q`SELECT id FROM dentist_accounts WHERE stripe_customer_id = ${customerId}`;
  if (!dentists || dentists.length === 0) return;
  const dentistId = dentists[0].id;
  const item = subscription.items.data[0];
  await q`UPDATE dentist_accounts SET subscription_status = ${subscription.status}, current_period_start = to_timestamp(${item?.current_period_start ?? 0}), current_period_end = to_timestamp(${item?.current_period_end ?? 0}), updated_at = now() WHERE id = ${dentistId}`;
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription, q: any) {
  const customerId = subscription.customer as string;
  await q`UPDATE dentist_accounts SET subscription_status = 'CANCELLED', updated_at = now() WHERE stripe_customer_id = ${customerId}`;
}

async function handleInvoicePaid(invoice: Stripe.Invoice, q: any) {
  const customerId = invoice.customer as string;
  const dentists = await q`SELECT id FROM dentist_accounts WHERE stripe_customer_id = ${customerId}`;
  if (!dentists || dentists.length === 0) return;
  const dentistId = dentists[0].id;
  await q`INSERT INTO commerce_transactions (provider, provider_transaction_id, provider_customer_id, status, amount_minor, currency, product_type, product_name, customer_email, occurred_at, metadata) VALUES ('stripe', ${invoice.id}, ${customerId}, 'PAID', ${invoice.amount_paid || 0}, ${invoice.currency || 'usd'}, 'SUBSCRIPTION', 'Smile Designer', ${invoice.customer_email || ''}, to_timestamp(${invoice.created}), ${JSON.stringify({ dentist_id: dentistId })}::jsonb)`;
}

async function handlePaymentFailed(invoice: Stripe.Invoice, q: any) {
  const customerId = invoice.customer as string;
  await q`UPDATE dentist_accounts SET subscription_status = 'PAST_DUE', updated_at = now() WHERE stripe_customer_id = ${customerId}`;
}
