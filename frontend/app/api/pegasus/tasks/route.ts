import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {createPegasusTask} from "../../../../lib/pegasus";
export const runtime="nodejs"; export const dynamic="force-dynamic";

export async function GET(){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql();
 const tasks:any=await q`SELECT id,company_id,idempotency_key,capability,owner_agent,authority,status,objective,approval_policy,approved_by,approved_at,correlation_id,attempts,max_attempts,run_after,error_text,created_by,created_at,updated_at FROM autonomy_jobs ORDER BY updated_at DESC LIMIT 100`;
 const counts:any=await q`SELECT status,count(*)::int count FROM autonomy_jobs GROUP BY status`;
 const byStatus:Record<string,number>={}; for(const x of counts)byStatus[x.status]=Number(x.count);
 return NextResponse.json({system:"PEGASUS",generated_at:new Date().toISOString(),counts:byStatus,tasks});
}

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 const body=await req.json().catch(()=>null);
 if(!body?.capability||!body?.assigned_agent||!body?.objective)return NextResponse.json({error:"capability, assigned_agent and objective are required"},{status:400});
 const idempotency=String(body.idempotency_key||`pegasus:${body.assigned_agent}:${crypto.randomUUID()}`);
 const task=await createPegasusTask({...body,requested_by:founder.email,idempotency_key:idempotency});
 return NextResponse.json({system:"PEGASUS",task},{status:201});
}
