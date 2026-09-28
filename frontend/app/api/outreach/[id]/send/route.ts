import {createHash,randomUUID} from "node:crypto";
import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../../lib/db";
import {requireFounder} from "../../../../../lib/auth";
import {evaluateEchoSend} from "../../../../../lib/echo-gate";
import {echoProviderReadiness,sendWithEcho} from "../../../../../lib/echo-provider";
import {extractProviderIds,parseApprovedDraft,wantsExternalSend} from "../../../../../lib/echo-delivery";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const u=await requireFounder(); if(!u)return NextResponse.json({error:"forbidden"},{status:403});
 await ensureSchema(); const q=sql(); const id=Number((await params).id);
 const body:any=await req.json().catch(()=>({}));
 const rows:any=await q`SELECT o.*,l.email,l.pipeline_stage,l.contact_source_url,l.contact_verified_at
 FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE o.id=${id}`;
 if(!rows.length)return NextResponse.json({error:"Outreach job not found"},{status:404});
 const job=rows[0];
 const currentHash=createHash("sha256").update(String(job.draft_content)).digest("hex");
 if(!job.approved_sha256 || job.approved_sha256!==currentHash){
  return NextResponse.json({error:"Approved draft no longer matches current content",reason:"APPROVED_DRAFT_MISMATCH"},{status:409});
 }
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

 const readiness=echoProviderReadiness();
 const providerReady=readiness.apiKeyConfigured&&readiness.connectedAccountConfigured&&readiness.deliveryEnabled;
 if(!wantsExternalSend(body,currentHash)){
   return NextResponse.json({
     ok:true,
     send_eligible:true,
     provider_configured:providerReady,
     provider_readiness:readiness,
     reason:providerReady?"EXPLICIT_SEND_CONFIRMATION_REQUIRED":"PROVIDER_DISABLED",
     message:providerReady
       ?"Echo gate passed. External delivery is configured, but no message was sent because execute=true plus the exact approved draft hash are required."
       :"Echo gate passed. No external message was sent because delivery is not enabled."
   });
 }
 if(!providerReady){
   return NextResponse.json({error:"Echo delivery provider is not fully enabled",reason:"PROVIDER_DISABLED",provider_readiness:readiness},{status:409});
 }

 const parsed:any=parseApprovedDraft(job.draft_content);
 if(!parsed.ok)return NextResponse.json({error:"Approved draft cannot be delivered",reason:parsed.reason},{status:409});

 const attemptId=randomUUID();
 const actor=u.display_name||u.email;
 const reserved:any=await q`
   UPDATE outreach_jobs SET
     status='SENDING',
     send_attempt_id=${attemptId},
     send_attempted_at=now(),
     send_error=NULL,
     delivery_status='SUBMITTING',
     updated_at=now()
   WHERE id=${id} AND status='APPROVED' AND sent_at IS NULL
   RETURNING *
 `;
 if(!reserved.length)return NextResponse.json({error:"Send reservation failed",reason:"SEND_ALREADY_RESERVED"},{status:409});

 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
 VALUES(${job.lead_id},${actor},'OUTREACH_SEND_STARTED',${`Echo reserved send attempt ${attemptId}. No retry is permitted if provider outcome becomes uncertain.`})`;

 try{
   const providerResult:any=await sendWithEcho({recipient:job.email,subject:parsed.subject,body:parsed.body});
   const ids:any=extractProviderIds(providerResult);
   if(!ids.messageId){
     await q`UPDATE outreach_jobs SET status='SEND_UNKNOWN',delivery_status='UNKNOWN',send_error='Provider returned no message id',updated_at=now() WHERE id=${id} AND send_attempt_id=${attemptId}`;
     await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
       VALUES(${job.lead_id},'Echo','OUTREACH_SEND_UNCERTAIN','Provider returned without a durable Gmail message id. Automatic retry blocked; manual reconciliation required.')`;
     return NextResponse.json({error:"Provider result could not be reconciled",reason:"PROVIDER_RESULT_UNCERTAIN",retry_allowed:false},{status:502});
   }

   const tx:any=await q.transaction([
     q`UPDATE outreach_jobs SET
        status='SENT',
        send_token=${ids.messageId},
        provider='gmail',
        provider_message_id=${ids.messageId},
        provider_thread_id=${ids.threadId},
        sent_at=now(),
        sent_by=${actor},
        delivery_status='SUBMITTED',
        follow_up_due_at=now()+interval '3 days',
        send_error=NULL,
        updated_at=now()
      WHERE id=${id} AND status='SENDING' AND send_attempt_id=${attemptId} AND sent_at IS NULL
      RETURNING *`,
     q`UPDATE leads SET pipeline_stage='CONTACTED',assigned_agent='Echo',updated_at=now()
        WHERE id=${job.lead_id} AND pipeline_stage='APPROVED'`,
     q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
        VALUES(${job.lead_id},'Echo','OUTREACH_SENT',${`Gmail provider confirmed send with message id ${ids.messageId}; follow-up scheduled in 3 days.`})`
   ]);
   const updated=tx[0]||[];
   if(!updated.length){
     return NextResponse.json({error:"Provider sent but database finalization did not complete",reason:"SEND_RECONCILIATION_REQUIRED",provider_message_id:ids.messageId,retry_allowed:false},{status:500});
   }
   return NextResponse.json({ok:true,sent:true,provider:"gmail",provider_message_id:ids.messageId,provider_thread_id:ids.threadId||null,job:updated[0]});
 }catch(error){
   const detail=String(error instanceof Error?error.message:error).slice(0,500);
   await q`UPDATE outreach_jobs SET status='SEND_UNKNOWN',delivery_status='UNKNOWN',send_error=${detail},updated_at=now() WHERE id=${id} AND send_attempt_id=${attemptId}`;
   await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
     VALUES(${job.lead_id},'Echo','OUTREACH_SEND_UNCERTAIN',${`Provider call ended without a confirmed Gmail message id: ${detail}. Automatic retry blocked; manual reconciliation required.`})`;
   return NextResponse.json({error:"Provider outcome uncertain; automatic retry blocked",reason:"PROVIDER_RESULT_UNCERTAIN",retry_allowed:false},{status:502});
 }
}
