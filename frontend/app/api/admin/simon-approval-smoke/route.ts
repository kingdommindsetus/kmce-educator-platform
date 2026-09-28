import {randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../lib/db";
import {requireFounder} from "../../../../lib/auth";

export async function POST(){
  const u=await requireFounder();
  if(!u)return NextResponse.json({error:"forbidden"},{status:403});
  await ensureSchema(); const q=sql(); const token=randomUUID();
  const marker=`SIMON_APPROVAL_SMOKE:${token}`;
  const educatorName=`Simon Approval Smoke ${token.slice(0,8)}`;
  const [educator]=await q`INSERT INTO educators(public_name,credentials,professional_title,status) VALUES(${educatorName},'TEST ONLY','Synthetic PR smoke fixture','ACTIVE') RETURNING *`;
  const [lead]=await q`INSERT INTO leads(educator_id,practice_name,decision_maker,city,state,email,evidence,qualification_reason,qualification_score,pipeline_stage,assigned_agent,approval_status) VALUES(${educator.id},${`SIMON SMOKE ${token.slice(0,8)}`},'Synthetic Founder','Aston','PA','proof@example.invalid',${marker},'Synthetic Founder-auth approval lifecycle test only',100,'PENDING_APPROVAL','Gatekeeper','PENDING') RETURNING *`;
  const [job]=await q`INSERT INTO outreach_jobs(lead_id,channel,status,draft_content) VALUES(${lead.id},'email','PENDING_APPROVAL','Initial Simon Founder-auth smoke draft.') RETURNING *`;
  await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${lead.id},${u.display_name||u.email},'SIMON_SMOKE_CREATED',${marker})`;
  return NextResponse.json({token,educator_id:educator.id,lead_id:lead.id,job_id:job.id});
}

export async function DELETE(req:Request){
  const u=await requireFounder();
  if(!u)return NextResponse.json({error:"forbidden"},{status:403});
  await ensureSchema(); const q=sql(); const body=await req.json().catch(()=>({}));
  const token=String(body.token||""); const marker=`SIMON_APPROVAL_SMOKE:${token}`;
  if(!token)return NextResponse.json({error:"token required"},{status:400});
  const rows=await q`SELECT l.id,l.educator_id FROM leads l WHERE l.id=${Number(body.lead_id)} AND l.evidence=${marker}`;
  if(!rows.length)return NextResponse.json({error:"synthetic fixture not found"},{status:404});
  const lead=rows[0];
  await q.transaction([
    q`DELETE FROM lead_activities WHERE lead_id=${lead.id}`,
    q`DELETE FROM outreach_jobs WHERE lead_id=${lead.id}`,
    q`DELETE FROM leads WHERE id=${lead.id} AND evidence=${marker}`,
    q`DELETE FROM educators WHERE id=${lead.educator_id} AND public_name LIKE 'Simon Approval Smoke %'`
  ]);
  return NextResponse.json({ok:true,cleaned:true});
}
