import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {postJournal} from "../../../../lib/ledger";
import {revenueRecognitionEntries} from "../../../../lib/simon/ledger-delivery-v1";
export const runtime="nodejs";
export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({})); const entitlementId=Number(body.entitlement_id||0);
 if(!entitlementId||!body.fulfillment_evidence)return NextResponse.json({error:"entitlement_id and fulfillment_evidence required"},{status:400});
 const ents:any=await q`SELECT * FROM entitlements WHERE id=${entitlementId} LIMIT 1`; if(!ents.length)return NextResponse.json({error:"Entitlement not found"},{status:404});
 const ent=ents[0]; if(ent.status!=="ACTIVE")return NextResponse.json({error:"Entitlement is not active"},{status:409});
 const txs:any=await q`SELECT * FROM commerce_transactions WHERE provider=${ent.source_provider} AND provider_transaction_id=${ent.source_transaction_id} AND status='succeeded' LIMIT 1`; if(!txs.length)return NextResponse.json({error:"Successful source transaction not found"},{status:409});
 const tx=txs[0]; const entries:any=revenueRecognitionEntries(Number(tx.amount_minor),tx.currency||"usd");
 const journal=await postJournal(q,{source_provider:ent.source_provider,source_transaction_id:ent.source_transaction_id,journal_type:"REVENUE_RECOGNITION",description:"Fulfillment evidenced; recognize previously unearned revenue.",currency:tx.currency||"usd",entries,metadata:{entitlement_id:entitlementId,fulfillment_evidence:body.fulfillment_evidence,recognized_by:founder.email}});
 await q`UPDATE entitlements SET status='COMPLETED',fulfilled_at=now(),metadata=metadata||${JSON.stringify({fulfillment_evidence:body.fulfillment_evidence,recognized_by:founder.email})}::jsonb,updated_at=now() WHERE id=${entitlementId}`;
 return NextResponse.json({ok:true,journal,entitlement_id:entitlementId,revenue_recognized_minor:Number(tx.amount_minor)});
}
