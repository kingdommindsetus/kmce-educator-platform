import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const counts:any=await q`SELECT status,count(*)::int count FROM autonomy_jobs GROUP BY status ORDER BY status`;
 const recent:any=await q`SELECT id,idempotency_key,capability,owner_agent,authority,status,entity_type,entity_id,attempts,max_attempts,run_after,result,error_text,created_at,updated_at FROM autonomy_jobs ORDER BY created_at DESC LIMIT 50`;
 const runs:any=await q`SELECT * FROM autonomy_runs ORDER BY started_at DESC LIMIT 20`;
 const events:any=await q`SELECT * FROM autonomy_events ORDER BY created_at DESC LIMIT 50`;
 const catalog:any=await q`SELECT service_code,service_name,active,fulfillment_type,payment_mode,responsible_agent,onboarding_requirements,entitlement_rules,metadata FROM service_catalog ORDER BY service_code`;
 const map:Record<string,number>={}; for(const x of counts)map[x.status]=Number(x.count);
 return NextResponse.json({generated_at:new Date().toISOString(),counts:map,recent_jobs:recent,recent_runs:runs,recent_events:events,service_catalog:catalog});
}
