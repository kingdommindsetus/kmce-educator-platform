import { NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";
export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const tx:any=await q`SELECT product_type,product_name,quantity,amount_minor,currency,status,occurred_at FROM commerce_transactions WHERE occurred_at>=date_trunc('day',now() AT TIME ZONE 'America/New_York')-interval '1 day' AND occurred_at<date_trunc('day',now() AT TIME ZONE 'America/New_York') AND status IN ('succeeded','paid') ORDER BY occurred_at`;
 const leads:any=await q`SELECT pipeline_stage,count(*)::int count FROM leads GROUP BY pipeline_stage`;
 const gross=tx.reduce((n:number,x:any)=>n+Number(x.amount_minor),0); const units=tx.reduce((n:number,x:any)=>n+Number(x.quantity||1),0);
 return NextResponse.json({created_by:"Simon",period:"previous_day",metrics:{transactions:tx.length,units,gross_amount_minor:gross,currency:tx[0]?.currency||"usd",lead_stages:Object.fromEntries(leads.map((x:any)=>[x.pipeline_stage,x.count]))},transactions:tx,note:"Factual preview from the permanent commerce ledger and CRM."});
}