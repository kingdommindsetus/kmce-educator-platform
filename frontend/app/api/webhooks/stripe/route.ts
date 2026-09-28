import { NextRequest,NextResponse } from "next/server";
import Stripe from "stripe";
import { ensureSchema,sql } from "../../../lib/db";

export const runtime="nodejs";
const stripe=new Stripe(process.env.STRIPE_SECRET_KEY||"");

function classify(meta:Record<string,string>={}){
 return {
  product_type:meta.product_type||"UNCLASSIFIED",
  product_name:meta.product_name||null,
  educator_name:meta.educator_name||null,
  course_name:meta.course_name||null,
  event_name:meta.event_name||null,
  quantity:Number(meta.quantity||1)
 };
}

export async function POST(req:NextRequest){
 const secret=process.env.STRIPE_WEBHOOK_SECRET;
 if(!secret||!process.env.STRIPE_SECRET_KEY)return NextResponse.json({error:"Stripe webhook is not configured"},{status:503});
 const sig=req.headers.get("stripe-signature"); if(!sig)return NextResponse.json({error:"Missing Stripe signature"},{status:400});
 const raw=await req.text(); let event:Stripe.Event;
 try{event=stripe.webhooks.constructEvent(raw,sig,secret)}catch{return NextResponse.json({error:"Invalid Stripe signature"},{status:400})}
 await ensureSchema(); const q=sql();
 const seen:any=await q`SELECT event_id FROM stripe_webhook_events WHERE event_id=${event.id} LIMIT 1`; if(seen[0])return NextResponse.json({ok:true,duplicate:true});
 let tx:any=null;
 if(event.type==="payment_intent.succeeded"||event.type==="payment_intent.payment_failed"){
   const pi=event.data.object as Stripe.PaymentIntent; const m=classify(pi.metadata||{});
   const status=event.type==="payment_intent.succeeded"?"succeeded":"failed";
   const rows:any=await q`INSERT INTO commerce_transactions(provider,provider_transaction_id,provider_customer_id,status,amount_minor,currency,product_type,product_name,educator_name,course_name,event_name,quantity,customer_email,occurred_at,metadata)
   VALUES('stripe',${pi.id},${typeof pi.customer==="string"?pi.customer:null},${status},${pi.amount_received||pi.amount},${pi.currency},${m.product_type},${m.product_name},${m.educator_name},${m.course_name},${m.event_name},${m.quantity},${pi.receipt_email||null},to_timestamp(${event.created}),${JSON.stringify(pi.metadata||{})}::jsonb)
   ON CONFLICT(provider,provider_transaction_id) DO UPDATE SET status=EXCLUDED.status,amount_minor=EXCLUDED.amount_minor,metadata=EXCLUDED.metadata RETURNING id`; tx=rows[0]?.id||null;
 }
 if(event.type==="charge.refunded"){
   const ch=event.data.object as Stripe.Charge; if(ch.payment_intent){const pid=typeof ch.payment_intent==="string"?ch.payment_intent:ch.payment_intent.id;await q`UPDATE commerce_transactions SET status='refunded',metadata=metadata||${JSON.stringify({refunded_amount:ch.amount_refunded})}::jsonb WHERE provider='stripe' AND provider_transaction_id=${pid}`;}
 }
 await q`INSERT INTO stripe_webhook_events(event_id,event_type,livemode,payload) VALUES(${event.id},${event.type},${event.livemode},${JSON.stringify(event)}::jsonb) ON CONFLICT(event_id) DO NOTHING`;
 return NextResponse.json({ok:true,event_id:event.id,event_type:event.type,transaction_id:tx});
}