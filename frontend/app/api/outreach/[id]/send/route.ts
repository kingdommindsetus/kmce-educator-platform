import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../lib/db";
import {requireFounder} from "../../../../../lib/auth";
import {evaluateEchoSend} from "../../../../../lib/echo-gate";

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 const u=await requireFounder(); if(!u)return NextResponse.json({error:"forbidden"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const rows=await q`SELECT o.*,l.email,l.pipeline_stage,l.contact_source_url,l.contact_verified_at
 FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE o.id=${id}`;
 if(!rows.length)return NextResponse.json({error:"Outreach job not found"},{status:404});
 const job=rows[0];
 const gate=evaluateEchoSend({
  jobStatus:job.status,
  sentAt:job.sent_at,
  pipelineStage:job.pipeline_stage,
  email:job.email,
  contactSourceUrl:job.contact_source_url,
  contactVerifiedAt:job.contact_verified_at
 });
 if(!gate.ok){
  const error=gate.reason==="DUPLICATE_SEND"?"Already sent; duplicate send blocked":
   gate.reason==="NOT_APPROVED"?"Founder-approved outreach required":
   "Verified recipient, official source, and verification timestamp required";
  return NextResponse.json({error,reason:gate.reason},{status:409});
 }
 return NextResponse.json({ok:true,send_eligible:true,provider_configured:false,reason:gate.reason,message:"Echo gate passed. No external message was sent because a delivery provider is not configured."});
}
