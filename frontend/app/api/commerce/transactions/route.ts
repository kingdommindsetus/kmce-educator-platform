import { NextRequest,NextResponse } from "next/server";
import { requireFounder } from "../../../../lib/auth";
import { ensureSchema,sql } from "../../../../lib/db";
export async function POST(req:NextRequest){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const b=await req.json();
 if(!b?.provider_transaction_id||!b?.status||!Number.isFinite(Number(b?.amount_minor))||!b?.occurred_at)return NextResponse.json({error:"Missing required transaction fields"},{status:400});
 const rows:any=await q`INSERT INTO commerce_transactions(provider,provider_transaction_id,status,amount_minor,currency,product_type,product_name,educator_name,course_name,event_name,quantity,occurred_at,metadata)
 VALUES(${b.provider||"stripe"},${b.provider_transaction_id},${b.status},${Number(b.amount_minor)},${b.currency||"usd"},${b.product_type||"UNCLASSIFIED"},${b.product_name||null},${b.educator_name||null},${b.course_name||null},${b.event_name||null},${Number(b.quantity||1)},${b.occurred_at},${JSON.stringify(b.metadata||{})}::jsonb)
 ON CONFLICT(provider,provider_transaction_id) DO UPDATE SET status=EXCLUDED.status,amount_minor=EXCLUDED.amount_minor,product_type=EXCLUDED.product_type,product_name=EXCLUDED.product_name,quantity=EXCLUDED.quantity,metadata=EXCLUDED.metadata RETURNING *`;
 return NextResponse.json({transaction:rows[0]});
}