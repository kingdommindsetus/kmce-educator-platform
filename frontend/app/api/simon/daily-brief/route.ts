import { NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const tx:any=await q`SELECT product_type,product_name,quantity,amount_minor,currency,status,occurred_at FROM commerce_transactions WHERE occurred_at>=date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day' AND occurred_at<date_trunc('day',now() AT TIME ZONE 'America/New_York') AND status IN ('succeeded','paid') ORDER BY occurred_at`;
 const leads:any=await q`SELECT pipeline_stage,count(*)::int count FROM leads GROUP BY pipeline_stage`;
 const stripe:any=await q`SELECT count(*)::int event_count,max(processed_at) last_event_at,count(*) FILTER (WHERE event_type='payment_intent.payment_failed')::int failed_events FROM stripe_webhook_events`;
 const unclassified:any=await q`SELECT count(*)::int count FROM commerce_transactions WHERE provider='stripe' AND status IN ('succeeded','paid') AND product_type='UNCLASSIFIED'`;
 const failedTx:any=await q`SELECT count(*)::int count FROM commerce_transactions WHERE provider='stripe' AND status='failed' AND occurred_at>=now()-interval '24 hours'`;
 const gross=tx.reduce((n:number,x:any)=>n+Number(x.amount_minor),0); const units=tx.reduce((n:number,x:any)=>n+Number(x.quantity||1),0);
 const last=stripe[0]?.last_event_at?new Date(stripe[0].last_event_at):null; const ageHours=last?(Date.now()-last.getTime())/3600000:null;
 const exceptions:string[]=[];
 if(Number(unclassified[0]?.count||0)>0)exceptions.push(`${unclassified[0].count} paid Stripe sale(s) need product classification`);
 if(Number(failedTx[0]?.count||0)>0)exceptions.push(`${failedTx[0].count} Stripe payment failure(s) recorded in the last 24 hours`);
 const health={configured:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),event_count:Number(stripe[0]?.event_count||0),last_event_at:stripe[0]?.last_event_at||null,hours_since_last_event:ageHours===null?null:Math.round(ageHours*10)/10,unclassified_paid_sales:Number(unclassified[0]?.count||0),failed_payments_24h:Number(failedTx[0]?.count||0),exceptions};
 return NextResponse.json({created_by:"Simon",period:"previous_day",stripe_health:health,metrics:{transactions:tx.length,units,gross_amount_minor:gross,currency:tx[0]?.currency||"usd",lead_stages:Object.fromEntries(leads.map((x:any)=>[x.pipeline_stage,x.count]))},transactions:tx,note:health.event_count===0?"Stripe is armed but no authentic Stripe webhook event has been recorded yet. The next genuine Stripe transaction is the production acceptance event.":"Factual preview from Stripe webhook history, the permanent commerce ledger, and CRM."});
}