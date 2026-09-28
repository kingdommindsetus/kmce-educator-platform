import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../../lib/db";
import {requireFounder} from "../../../../../../lib/auth";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const u=await requireFounder(); if(!u)return NextResponse.json({error:"forbidden"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const body=await req.json(); const source=String(body.source_url||"").trim();
 if(!/^https:\/\//i.test(source)) return NextResponse.json({error:"Official HTTPS source URL required"},{status:400});
 const jobs=await q`SELECT * FROM outreach_jobs WHERE id=${id} AND status='APPROVED'`;
 if(!jobs.length)return NextResponse.json({error:"Only an approved outreach job can be verified for Echo"},{status:409});
 const job=jobs[0];
 const leads=await q`UPDATE leads SET contact_source_url=${source},contact_verified_at=now(),updated_at=now()
   WHERE id=${job.lead_id} AND email IS NOT NULL AND email<>'' RETURNING *`;
 if(!leads.length)return NextResponse.json({error:"A verified email address is required before send eligibility"},{status:409});
 const actor=u.display_name||u.email;
 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${job.lead_id},${actor},'CONTACT_VERIFIED',${"Founder verified contact against official source: "+source})`;
 return NextResponse.json({ok:true,lead:leads[0]});
}
