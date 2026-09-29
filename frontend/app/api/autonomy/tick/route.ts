import {NextResponse} from "next/server";
import {ensureSchema,sql} from "../../../../lib/db";
import {requireFounder} from "../../../../lib/auth";
import {executionDisposition,retryDelaySeconds,idempotencyKey} from "../../../../lib/simon/autonomy-core";
import {SERVICE_CATALOG} from "../../../../lib/simon/service-catalog";
import {fetchEchoThread} from "../../../../lib/echo-provider";
import {classifyReply,inboundMessages,normalizeThreadMessages} from "../../../../lib/echo-replies";

export const runtime="nodejs";

async function authorized(req:Request){
  const secret=process.env.AUTONOMY_WORKER_SECRET;
  const auth=req.headers.get("authorization")||"";
  if(secret && auth===`Bearer ${secret}`) return {ok:true,actor:"SIMON_WORKER"};
  const founder=await requireFounder();
  if(founder) return {ok:true,actor:founder.email};
  return {ok:false,actor:null};
}

async function seedServiceCatalog(q:any){
  for(const item of SERVICE_CATALOG as any[]){
    await q`INSERT INTO service_catalog(service_code,service_name,fulfillment_type,payment_mode,responsible_agent,onboarding_requirements,entitlement_rules,metadata)
      VALUES(${item.service_code},${item.service_name},${item.fulfillment_type},${item.payment_mode},${item.responsible_agent},${JSON.stringify(item.onboarding_requirements||[])}::jsonb,${JSON.stringify(item.entitlement_rules||{})}::jsonb,${JSON.stringify(item.metadata||{})}::jsonb)
      ON CONFLICT(service_code) DO UPDATE SET service_name=EXCLUDED.service_name,fulfillment_type=EXCLUDED.fulfillment_type,payment_mode=EXCLUDED.payment_mode,responsible_agent=EXCLUDED.responsible_agent,onboarding_requirements=EXCLUDED.onboarding_requirements,entitlement_rules=EXCLUDED.entitlement_rules,metadata=EXCLUDED.metadata,updated_at=now()`;
  }
  return SERVICE_CATALOG.length;
}

async function seedDueJobs(q:any){
  const followups:any=await q`SELECT o.id,o.lead_id,l.practice_name FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE o.follow_up_due_at IS NOT NULL AND o.follow_up_due_at<=now() AND l.pipeline_stage='FOLLOW_UP' LIMIT 100`;
  for(const row of followups){
    const key=idempotencyKey(["followup",row.id,new Date().toISOString().slice(0,10)]);
    await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by) VALUES(${key},'lead.follow_up.review','Echo','CONTROLLED','lead',${String(row.lead_id)},${JSON.stringify({lead_id:Number(row.lead_id),practice_name:row.practice_name,outreach_job_id:Number(row.id)})}::jsonb,'Simon') ON CONFLICT(idempotency_key) DO NOTHING`;
  }
  const replyHour=new Date().toISOString().slice(0,13);
  const replyCandidates:any=await q`SELECT o.id,o.lead_id,o.provider_thread_id
    FROM outreach_jobs o
    WHERE o.provider='gmail'
      AND o.provider_thread_id IS NOT NULL
      AND o.status IN ('SENT','REPLIED')
    ORDER BY o.updated_at DESC
    LIMIT 100`;
  for(const row of replyCandidates){
    const key=idempotencyKey(["reply-sync",row.id,replyHour]);
    await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by)
      VALUES(${key},'outreach.reply.sync','Echo','CONTROLLED','outreach_job',${String(row.id)},${JSON.stringify({lead_id:Number(row.lead_id),outreach_job_id:Number(row.id),provider_thread_id:row.provider_thread_id})}::jsonb,'Simon')
      ON CONFLICT(idempotency_key) DO NOTHING`;
  }

  const interested:any=await q`SELECT id,practice_name,email,contact_verified_at
    FROM leads
    WHERE pipeline_stage='INTERESTED' AND assigned_agent='Booker'
    ORDER BY updated_at DESC
    LIMIT 100`;
  for(const row of interested){
    const key=idempotencyKey(["discovery-prepare",row.id]);
    await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by)
      VALUES(${key},'discovery.prepare','Booker','CONTROLLED','lead',${String(row.id)},
      ${JSON.stringify({lead_id:Number(row.id),practice_name:row.practice_name,email:row.email,contact_verified_at:row.contact_verified_at})}::jsonb,'Simon')
      ON CONFLICT(idempotency_key) DO NOTHING`;
  }

  const ready:any=await q`SELECT id,lead_id FROM onboarding_cases WHERE status='READY_FOR_PAYMENT' LIMIT 100`;
  for(const row of ready){
    const key=idempotencyKey(["onboarding-ready",row.id]);
    await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by) VALUES(${key},'onboarding.review','Flow','CONTROLLED','onboarding_case',${String(row.id)},${JSON.stringify({lead_id:Number(row.lead_id),onboarding_case_id:Number(row.id)})}::jsonb,'Simon') ON CONFLICT(idempotency_key) DO NOTHING`;
  }
  const campaigns:any=await q`SELECT c.id,c.name,
    count(a.id) FILTER (WHERE a.status='DRAFT')::int AS draft_count,
    count(a.id) FILTER (WHERE a.status='APPROVED')::int AS approved_count
    FROM growth_campaigns c LEFT JOIN content_assets a ON a.campaign_id=c.id
    WHERE c.status='ACTIVE' GROUP BY c.id,c.name LIMIT 100`;
  for(const row of campaigns){
    if(Number(row.draft_count||0)===0 && Number(row.approved_count||0)===0){
      const key=idempotencyKey(["growth-review",row.id,new Date().toISOString().slice(0,10)]);
      await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by)
        VALUES(${key},'growth.campaign.review','Sofia','CONTROLLED','growth_campaign',${String(row.id)},${JSON.stringify({campaign_id:Number(row.id),campaign_name:row.name})}::jsonb,'Simon')
        ON CONFLICT(idempotency_key) DO NOTHING`;
    }
  }
  const day=new Date().toISOString().slice(0,10);
  const briefKey=idempotencyKey(["executive-brief",day]);
  await q`INSERT INTO autonomy_jobs(idempotency_key,capability,owner_agent,authority,entity_type,entity_id,payload,created_by) VALUES(${briefKey},'executive.brief.queue','Marie','CONTROLLED','company','KMCE',${JSON.stringify({brief_date:day})}::jsonb,'Simon') ON CONFLICT(idempotency_key) DO NOTHING`;
  return {followups:followups.length,reply_sync_candidates:replyCandidates.length,interested_for_booker:interested.length,onboarding_ready:ready.length,active_campaigns:campaigns.length,brief_date:day};
}

async function handleJob(q:any,job:any){
  const disposition:any=executionDisposition(job.capability,Boolean(job.payload?.policy_approved));
  if(disposition.status==="WAITING_APPROVAL") return {status:"WAITING_APPROVAL",result:{reason:disposition.reason}};
  if(disposition.status==="DEAD") return {status:"DEAD",result:{reason:disposition.reason}};

  if(job.capability==="agent.task.ensure"){
    const p=job.payload||{}; const agent=String(p.assigned_agent||job.owner_agent||"Marie"); const title=String(p.title||job.capability); const instruction=String(p.instruction||"Review autonomous work item.");
    const existing:any=await q`SELECT id FROM agent_tasks WHERE assigned_agent=${agent} AND title=${title} AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1`;
    if(existing.length)return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true}};
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by) VALUES(${agent},${title},${instruction},'AUTONOMY','Simon') RETURNING id`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false}};
  }

  if(job.capability==="outreach.reply.sync"){
    const outreachId=Number(job.payload?.outreach_job_id||job.entity_id||0);
    const rows:any=await q`SELECT o.*,l.pipeline_stage,l.assigned_agent
      FROM outreach_jobs o
      JOIN leads l ON l.id=o.lead_id
      WHERE o.id=${outreachId}
      LIMIT 1`;
    if(!rows.length)return {status:"DEAD",result:{reason:"OUTREACH_NOT_FOUND"}};

    const outreach=rows[0];
    if(outreach.provider!=="gmail" || !outreach.provider_thread_id){
      return {status:"SUCCEEDED",result:{skipped:true,reason:"THREAD_NOT_AVAILABLE"}};
    }
    if(!["SENT","REPLIED"].includes(String(outreach.status))){
      return {status:"SUCCEEDED",result:{skipped:true,reason:"OUTREACH_NOT_ELIGIBLE"}};
    }

    const providerResult:any=await fetchEchoThread(String(outreach.provider_thread_id),"");
    const messages:any[]=normalizeThreadMessages(providerResult?.result||providerResult)
      .filter((m:any)=>String(m.threadId||"")===String(outreach.provider_thread_id));

    const founderEmail=process.env.FOUNDER_EMAIL||"kingdommindsetus@gmail.com";
    const inbound:any[]=inboundMessages(messages,founderEmail,outreach.sent_at);
    const inserted:any[]=[];

    for(const message of inbound){
      const classified:any=classifyReply(message.body);
      const saved:any=await q`INSERT INTO inbound_replies(
        outreach_job_id,lead_id,provider,provider_message_id,provider_thread_id,
        sender,recipient,subject,body,message_at,classification
      ) VALUES(
        ${outreachId},${outreach.lead_id},'gmail',${message.messageId},${outreach.provider_thread_id},
        ${message.sender||null},${message.recipient||null},${message.subject||null},
        ${classified.body||message.body||null},${message.timestamp||null},${classified.classification}
      )
      ON CONFLICT(provider,provider_message_id) DO NOTHING
      RETURNING *`;
      if(saved.length)inserted.push({...saved[0],routing:classified});
    }

    if(!inserted.length){
      return {status:"SUCCEEDED",result:{
        outreach_job_id:outreachId,
        thread_message_count:messages.length,
        inbound_message_count:inbound.length,
        new_replies:0
      }};
    }

    const latest=inserted[inserted.length-1];
    const routing=latest.routing;
    const allowedStages=["CONTACTED","FOLLOW_UP","REPLIED","INTERESTED"];
    if(allowedStages.includes(String(outreach.pipeline_stage))){
      await q`UPDATE leads
        SET pipeline_stage=${routing.pipeline_stage},assigned_agent=${routing.assigned_agent},updated_at=now()
        WHERE id=${outreach.lead_id}`;
    }

    await q`UPDATE outreach_jobs
      SET status='REPLIED',delivery_status='REPLIED',follow_up_due_at=NULL,updated_at=now()
      WHERE id=${outreachId} AND status IN ('SENT','REPLIED')`;

    await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
      VALUES(${outreach.lead_id},'Echo','INBOUND_REPLY_RECEIVED',${`Gmail reply ${latest.provider_message_id} classified ${routing.classification}; routed to ${routing.assigned_agent}.`})`;

    return {status:"SUCCEEDED",result:{
      outreach_job_id:outreachId,
      new_replies:inserted.length,
      classification:routing.classification,
      pipeline_stage:routing.pipeline_stage,
      assigned_agent:routing.assigned_agent
    }};
  }

  if(job.capability==="discovery.prepare"){
    const leadId=Number(job.payload?.lead_id||job.entity_id||0);
    const leads:any=await q`SELECT id,practice_name,email,contact_verified_at,pipeline_stage,assigned_agent
      FROM leads WHERE id=${leadId} LIMIT 1`;
    if(!leads.length)return {status:"DEAD",result:{reason:"LEAD_NOT_FOUND"}};
    const lead=leads[0];
    if(lead.pipeline_stage!=="INTERESTED" || lead.assigned_agent!=="Booker"){
      return {status:"SUCCEEDED",result:{skipped:true,reason:"LEAD_NOT_READY_FOR_BOOKER"}};
    }
    if(!lead.contact_verified_at){
      return {status:"WAITING_APPROVAL",result:{reason:"CONTACT_NOT_VERIFIED"}};
    }
    const title=`Prepare discovery scheduling: ${lead.practice_name}`;
    const existing:any=await q`SELECT id FROM agent_tasks
      WHERE assigned_agent='Booker' AND title=${title} AND status IN ('QUEUED','IN_PROGRESS')
      LIMIT 1`;
    if(existing.length){
      return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true,lead_id:leadId}};
    }
    const instruction=`Prepare discovery scheduling for ${lead.practice_name}. Confirm appropriate meeting length, gather available Founder calendar slots, and prepare the scheduling handoff. Do not send external messages or create a calendar event without policy approval.`;
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by)
      VALUES('Booker',${title},${instruction},'AUTONOMY','Simon') RETURNING id`;
    await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail)
      VALUES(${leadId},'Booker','DISCOVERY_PREPARED','Autonomy queued internal discovery scheduling preparation. No external action executed.')`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false,lead_id:leadId,external_actions_executed:false}};
  }

  if(job.capability==="lead.follow_up.review"){
    const leadId=Number(job.payload?.lead_id||job.entity_id||0);
    const leads:any=await q`SELECT id,practice_name,pipeline_stage FROM leads WHERE id=${leadId} LIMIT 1`;
    if(!leads.length)return {status:"DEAD",result:{reason:"LEAD_NOT_FOUND"}};
    if(leads[0].pipeline_stage!=="FOLLOW_UP")return {status:"SUCCEEDED",result:{skipped:true,reason:"NO_LONGER_FOLLOW_UP"}};
    const title=`Follow up: ${leads[0].practice_name}`;
    const existing:any=await q`SELECT id FROM agent_tasks WHERE assigned_agent='Echo' AND title=${title} AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1`;
    if(existing.length)return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true}};
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by) VALUES('Echo',${title},${"Review due follow-up for "+leads[0].practice_name+". Draft only; external send remains approval-gated."},'AUTONOMY','Simon') RETURNING id`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false}};
  }

  if(job.capability==="onboarding.review"){
    const caseId=Number(job.payload?.onboarding_case_id||job.entity_id||0);
    const cases:any=await q`SELECT id,lead_id,status,service_code FROM onboarding_cases WHERE id=${caseId} LIMIT 1`;
    if(!cases.length)return {status:"DEAD",result:{reason:"ONBOARDING_CASE_NOT_FOUND"}};
    if(cases[0].status!=="READY_FOR_PAYMENT")return {status:"SUCCEEDED",result:{skipped:true,reason:"NOT_READY_FOR_PAYMENT"}};
    const title=`Payment path ready: onboarding ${caseId}`;
    const existing:any=await q`SELECT id FROM agent_tasks WHERE assigned_agent='Ledger' AND title=${title} AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1`;
    if(existing.length)return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true}};
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by) VALUES('Ledger',${title},${"Onboarding case "+caseId+" is complete. Prepare payment path for service "+cases[0].service_code+". Do not charge or send a payment request without approval."},'AUTONOMY','Simon') RETURNING id`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false}};
  }

  if(job.capability==="growth.campaign.review"){
    const campaignId=Number(job.payload?.campaign_id||job.entity_id||0);
    const campaigns:any=await q`SELECT id,name,status FROM growth_campaigns WHERE id=${campaignId} LIMIT 1`;
    if(!campaigns.length)return {status:"DEAD",result:{reason:"CAMPAIGN_NOT_FOUND"}};
    if(campaigns[0].status!=="ACTIVE")return {status:"SUCCEEDED",result:{skipped:true,reason:"CAMPAIGN_NOT_ACTIVE"}};
    const title="Growth campaign needs content: "+campaigns[0].name;
    const existing:any=await q`SELECT id FROM agent_tasks WHERE assigned_agent='Sofia' AND title=${title} AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1`;
    if(existing.length)return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true}};
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by) VALUES('Sofia',${title},'Create or refresh the approved-channel content plan. Draft only; external publishing remains approval-gated.','AUTONOMY','Simon') RETURNING id`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false}};
  }

  if(job.capability==="executive.brief.queue"){
    const day=String(job.payload?.brief_date||new Date().toISOString().slice(0,10));
    const title=`Prepare Simon executive brief ${day}`;
    const existing:any=await q`SELECT id FROM agent_tasks WHERE assigned_agent='Marie' AND title=${title} AND status IN ('QUEUED','IN_PROGRESS') LIMIT 1`;
    if(existing.length)return {status:"SUCCEEDED",result:{task_id:Number(existing[0].id),deduped:true}};
    const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,source,requested_by) VALUES('Marie',${title},'Compile company state, blockers, approvals, revenue movement, and next actions for Simon.','AUTONOMY','Simon') RETURNING id`;
    return {status:"SUCCEEDED",result:{task_id:Number(rows[0].id),deduped:false}};
  }

  return {status:"DEAD",result:{reason:"NO_HANDLER"}};
}

export async function POST(req:Request){
  const gate=await authorized(req); if(!gate.ok)return NextResponse.json({error:"Unauthorized"},{status:403});
  await ensureSchema(); const q=sql(); const worker="simon-autonomy-v1";
  const runs:any=await q`INSERT INTO autonomy_runs(worker_name) VALUES(${worker}) RETURNING id`; const runId=Number(runs[0].id);
  const catalog_count=await seedServiceCatalog(q);
  const seeded=await seedDueJobs(q);
  let claimed=0,succeeded=0,failed=0,waiting=0; const results:any[]=[];
  for(let i=0;i<20;i++){
    const rows:any=await q`UPDATE autonomy_jobs SET status='RUNNING',locked_at=now(),locked_by=${worker},attempts=attempts+1,updated_at=now() WHERE id=(SELECT id FROM autonomy_jobs WHERE status='PENDING' AND run_after<=now() ORDER BY run_after,id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
    if(!rows.length)break; const job=rows[0]; claimed++;
    try{
      const out:any=await handleJob(q,job);
      if(out.status==="WAITING_APPROVAL"){waiting++;await q`UPDATE autonomy_jobs SET status='WAITING_APPROVAL',result=${JSON.stringify(out.result)}::jsonb,locked_at=null,locked_by=null,updated_at=now() WHERE id=${job.id}`;}
      else if(out.status==="DEAD"){failed++;await q`UPDATE autonomy_jobs SET status='DEAD',result=${JSON.stringify(out.result)}::jsonb,locked_at=null,locked_by=null,updated_at=now() WHERE id=${job.id}`;}
      else{succeeded++;await q`UPDATE autonomy_jobs SET status='SUCCEEDED',result=${JSON.stringify(out.result)}::jsonb,locked_at=null,locked_by=null,updated_at=now() WHERE id=${job.id}`;}
      await q`INSERT INTO autonomy_events(event_type,entity_type,entity_id,payload,source,correlation_id) VALUES('JOB_RESULT',${job.entity_type},${job.entity_id},${JSON.stringify({job_id:Number(job.id),capability:job.capability,status:out.status,result:out.result})}::jsonb,${worker},${String(runId)})`;
      results.push({id:Number(job.id),capability:job.capability,status:out.status,result:out.result});
    }catch(e:any){
      const attempts=Number(job.attempts||1); const max=Number(job.max_attempts||3); const message=String(e?.message||e);
      if(attempts>=max){failed++;await q`UPDATE autonomy_jobs SET status='DEAD',error_text=${message},locked_at=null,locked_by=null,updated_at=now() WHERE id=${job.id}`;}
      else{const delay=retryDelaySeconds(attempts);await q`UPDATE autonomy_jobs SET status='PENDING',error_text=${message},run_after=now()+make_interval(secs => ${delay}),locked_at=null,locked_by=null,updated_at=now() WHERE id=${job.id}`;}
      results.push({id:Number(job.id),capability:job.capability,status:"ERROR",error:message});
    }
  }
  await q`UPDATE autonomy_runs SET finished_at=now(),claimed_count=${claimed},succeeded_count=${succeeded},failed_count=${failed},waiting_approval_count=${waiting},summary=${JSON.stringify({seeded,results})}::jsonb WHERE id=${runId}`;
  return NextResponse.json({ok:true,run_id:runId,catalog_count,seeded,claimed,succeeded,failed,waiting_approval:waiting,results});
}

export async function GET(req:Request){return POST(req)}
