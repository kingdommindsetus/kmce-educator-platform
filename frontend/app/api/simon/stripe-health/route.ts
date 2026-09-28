import { NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";
export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const events:any=await q`SELECT count(*)::int count,max(processed_at) last_event_at FROM stripe_webhook_events`;
 const paid:any=await q`SELECT count(*)::int total,count(*) FILTER (WHERE product_type='UNCLASSIFIED')::int unclassified FROM commerce_transactions WHERE provider='stripe' AND status IN ('succeeded','paid')`;
 const failed:any=await q`SELECT count(*)::int count FROM commerce_transactions WHERE provider='stripe' AND status='failed' AND occurred_at>=now()-interval '24 hours'`;
 const exceptions:string[]=[]; if(Number(paid[0]?.unclassified||0)>0)exceptions.push("UNCLASSIFIED_SALE"); if(Number(failed[0]?.count||0)>0)exceptions.push("PAYMENT_FAILURE");
 return NextResponse.json({service:"stripe",armed:Boolean(process.env.STRIPE_SECRET_KEY&&process.env.STRIPE_WEBHOOK_SECRET),authentic_events:Number(events[0]?.count||0),last_event_at:events[0]?.last_event_at||null,paid_transactions:Number(paid[0]?.total||0),unclassified_paid_sales:Number(paid[0]?.unclassified||0),failed_payments_24h:Number(failed[0]?.count||0),exceptions,acceptance_status:Number(events[0]?.count||0)>0?"LIVE_EVENT_OBSERVED":"AWAITING_FIRST_GENUINE_EVENT"});
}