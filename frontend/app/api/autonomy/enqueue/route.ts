import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {AUTONOMY_CAPABILITIES,idempotencyKey} from "../../../../lib/simon/autonomy-core";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({}));
 const capability=String(body.capability||""); const def:any=(AUTONOMY_CAPABILITIES as any)[capability];
 if(!def)return NextResponse.json({error:"Unknown capability"},{status:400});
 const key=String(body.idempotency_key||idempotencyKey([capability,body.entity_type,body.entity_id,JSON.stringify(body.payload||{})]));
 if(!key)return NextResponse.json({error:"idempotency key could not be derived"},{status:400});
 const rows:any=await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,max_attempts,run_after,created_by)
 VALUES(${key},${capability},${def.owner},${def.authority},${body.entity_type||null},${body.entity_id==null?null:String(body.entity_id)},${JSON.stringify(body.payload||{})}::jsonb,${Math.max(1,Math.min(10,Number(body.max_attempts)||3))},COALESCE(${body.run_after||null}::timestamptz,now()),${founder.email})
 ON CONFLICT(idempotency_key) DO UPDATE SET updated_at=now() RETURNING *`;
 await q`INSERT INTO autonomy_events(event_type,entity_type,entity_id,payload,source,correlation_id) VALUES('JOB_ENQUEUED',${body.entity_type||null},${body.entity_id==null?null:String(body.entity_id)},${JSON.stringify({job_id:Number(rows[0].id),capability,authority:def.authority})}::jsonb,${founder.email},${key})`;
 return NextResponse.json({job:rows[0],external_actions_executed:false});
}
