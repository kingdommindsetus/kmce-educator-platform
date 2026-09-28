import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {buildVerifiedOutreachDraft} from "../../../../lib/simon/maven-v1";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({})); const leadId=Number(body.lead_id||0);
 if(!leadId)return NextResponse.json({error:"lead_id required"},{status:400});
 const rows:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:"Lead not found"},{status:404});
 const lead=rows[0]; const built:any=buildVerifiedOutreachDraft(lead);
 if(!built.ok)return NextResponse.json({error:"Maven draft gate failed",reason:built.reason},{status:409});
 const hash=createHash("sha256").update(String(built.draft)).digest("hex");
 const jobs:any=await q`INSERT INTO outreach_jobs(lead_id,channel,status,draft_content,draft_sha256,draft_version) VALUES(${leadId},'email','PENDING_APPROVAL',${built.draft},${hash},1) RETURNING *`;
 await q`UPDATE leads SET pipeline_stage='PENDING_APPROVAL',assigned_agent='Gatekeeper',approval_status='PENDING',updated_at=now() WHERE id=${leadId}`;
 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Maven','DRAFT_CREATED',${"Verified-facts outreach draft created and handed to Gatekeeper. SHA-256 "+hash+". No message sent."})`;
 return NextResponse.json({job:jobs[0],facts_used:built.facts_used,next_agent:"Gatekeeper",sent:false,provider_configured:false});
}
