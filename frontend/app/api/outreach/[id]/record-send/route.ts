import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../lib/db";
import {requireFounder} from "../../../../../lib/auth";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const u=await requireFounder(); if(!u)return NextResponse.json({error:"forbidden"},{status:403});
 if(process.env.ECHO_PROVIDER_ENABLED!=="true")return NextResponse.json({error:"External delivery provider is not enabled"},{status:409});
 await ensureSchema(); const q=sql(); const id=Number((await params).id); const actor=u.display_name||u.email;
 const body=await req.json(); const token=String(body.send_token||"").trim();
 if(!token)return NextResponse.json({error:"send_token required"},{status:400});
 const jobs=await q`UPDATE outreach_jobs o SET status='SENT',send_token=${token},sent_at=now(),sent_by=${actor},delivery_status='SUBMITTED',follow_up_due_at=now()+interval '3 days',updated_at=now()
 WHERE o.id=${id} AND o.status='APPROVED' AND o.sent_at IS NULL
 AND EXISTS(SELECT 1 FROM leads l WHERE l.id=o.lead_id AND l.pipeline_stage='APPROVED' AND l.email IS NOT NULL AND l.contact_source_url IS NOT NULL AND l.contact_verified_at IS NOT NULL)
 RETURNING *`;
 if(!jobs.length)return NextResponse.json({error:"Send state transition blocked"},{status:409});
 const job=jobs[0];
 await q`UPDATE leads SET pipeline_stage='CONTACTED',assigned_agent='Echo',updated_at=now() WHERE id=${job.lead_id}`;
 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${job.lead_id},${actor},'OUTREACH_SENT',${"Controlled provider send recorded; follow-up scheduled in 3 days."})`;
 return NextResponse.json({ok:true,job});
}
