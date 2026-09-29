import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {fetchEchoThread} from "../../../../lib/echo-provider";
import {classifyReply,inboundMessages,normalizeThreadMessages} from "../../../../lib/echo-replies";
import {parseApprovedDraft} from "../../../../lib/echo-delivery";
export const runtime="nodejs";

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const body:any=await req.json().catch(()=>({}));
  const outreachId=Number(body.outreach_job_id||0);
  if(!outreachId)return NextResponse.json({error:"outreach_job_id required"},{status:400});

  const rows:any=await q`
    SELECT o.*,l.pipeline_stage,l.assigned_agent,l.email AS lead_email
    FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id
    WHERE o.id=${outreachId}
    LIMIT 1
  `;
  if(!rows.length)return NextResponse.json({error:"Outreach job not found"},{status:404});
  const job=rows[0];
  if(!job.provider_thread_id || job.provider!=="gmail"){
    return NextResponse.json({error:"Gmail thread id required",reason:"THREAD_NOT_AVAILABLE"},{status:409});
  }
  if(!["SENT","REPLIED"].includes(String(job.status))){
    return NextResponse.json({error:"Outreach must be sent before replies can be synced",reason:"OUTREACH_NOT_SENT"},{status:409});
  }

  const parsed:any=parseApprovedDraft(job.draft_content);
  if(!parsed.ok)return NextResponse.json({error:"Approved outreach subject unavailable",reason:"SUBJECT_REQUIRED"},{status:409});

  let providerResult:any;
  try{
    providerResult=await fetchEchoThread(String(job.provider_thread_id),parsed.subject);
  }catch(error){
    return NextResponse.json({error:"Gmail thread fetch failed",reason:"PROVIDER_READ_FAILED",detail:String(error instanceof Error?error.message:error).slice(0,300)},{status:502});
  }

  const messages:any[]=normalizeThreadMessages(providerResult?.result||providerResult)
    .filter((m:any)=>String(m.threadId||"")===String(job.provider_thread_id));
  const founderEmail=process.env.FOUNDER_EMAIL||"kingdommindsetus@gmail.com";
  const inbound:any[]=inboundMessages(messages,founderEmail,job.sent_at);
  const inserted:any[]=[];

  for(const message of inbound){
    const classified:any=classifyReply(message.body);
    const saved:any=await q`
      INSERT INTO inbound_replies(
        outreach_job_id,lead_id,provider,provider_message_id,provider_thread_id,
        sender,recipient,subject,body,message_at,classification
      ) VALUES(
        ${outreachId},${job.lead_id},'gmail',${message.messageId},${job.provider_thread_id},
        ${message.sender||null},${message.recipient||null},${message.subject||null},
        ${classified.body||message.body||null},${message.timestamp||null},${classified.classification}
      )
      ON CONFLICT(provider,provider_message_id) DO NOTHING
      RETURNING *
    `;
    if(saved.length)inserted.push({...saved[0],routing:classified});
  }

  if(!inserted.length){
    return NextResponse.json({
      ok:true,
      outreach_job_id:outreachId,
      lead_id:Number(job.lead_id),
      thread_message_count:messages.length,
      inbound_message_count:inbound.length,
      new_replies:0,
      lead_stage:job.pipeline_stage,
      assigned_agent:job.assigned_agent,
      external_actions_executed:false
    });
  }

  const latest=inserted[inserted.length-1];
  const routing=latest.routing;
  const allowedStages=["CONTACTED","FOLLOW_UP","REPLIED","INTERESTED"];
  if(allowedStages.includes(String(job.pipeline_stage))){
    await q`UPDATE leads SET pipeline_stage=${routing.pipeline_stage},assigned_agent=${routing.assigned_agent},updated_at=now() WHERE id=${job.lead_id}`;
  }
  await q`UPDATE outreach_jobs SET status='REPLIED',delivery_status='REPLIED',follow_up_due_at=NULL,updated_at=now() WHERE id=${outreachId} AND status IN ('SENT','REPLIED')`;
  await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
    VALUES(${job.lead_id},'Echo','INBOUND_REPLY_RECEIVED',${`Gmail reply ${latest.provider_message_id} classified ${routing.classification}; routed to ${routing.assigned_agent}.`})`;

  return NextResponse.json({
    ok:true,
    outreach_job_id:outreachId,
    lead_id:Number(job.lead_id),
    thread_message_count:messages.length,
    inbound_message_count:inbound.length,
    new_replies:inserted.length,
    latest_reply:{
      provider_message_id:latest.provider_message_id,
      message_at:latest.message_at,
      classification:routing.classification
    },
    pipeline_stage:routing.pipeline_stage,
    assigned_agent:routing.assigned_agent,
    booker_ready_stage:["REPLIED","INTERESTED"].includes(routing.pipeline_stage),
    external_actions_executed:false
  });
}
