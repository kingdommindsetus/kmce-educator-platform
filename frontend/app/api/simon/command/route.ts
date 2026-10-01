import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {triageWorkItem} from "../../../../lib/simon/marie";
import {createPegasusTask,createPegasusWorkflow} from "../../../../lib/pegasus";

export const runtime="nodejs";

const AGENTS=[
  "Marie","IRIS","Mark","Cammy","Evan","Tube","Lucy","Snake","Alice","Echo","Booker",
  // Legacy specialist workers retained during migration.
  "Scout","Claire","Atlas","Sofia","Maven","Gatekeeper","Flow","Ledger"
];

function agentFrom(s:string){
  return AGENTS.find(a=>new RegExp("\\b"+a+"\\b","i").test(s))||null;
}

function approvalPolicyFor(text:string){
  return /(send|publish|post live|delete|refund|charge|pay|purchase|sign|execute agreement|change price|change bank|production)/i.test(text)
    ?"before_external_action"
    :"none";
}

function capabilityFor(agent:string,text:string){
  const map:Record<string,string>={
    Marie:"operations.coordinate",IRIS:"quality.verify",Mark:"marketing.strategy",
    Cammy:"campaign.plan",Evan:"creative.produce",Tube:"video.produce",
    Lucy:"social.distribute",Snake:"growth.measure",Alice:"commerce.operate",
    Echo:"sales.outreach",Booker:"calendar.schedule",Scout:"business.search",
    Claire:"lead.enrich",Atlas:"lead.qualify",Sofia:"growth.plan",
    Maven:"campaign.content",Gatekeeper:"approval.review",Flow:"onboarding.coordinate",
    Ledger:"revenue.record"
  };
  if(agent==="Echo"&&/(send|email|outreach)/i.test(text))return "outreach.prepare";
  if(agent==="Lucy"&&/(publish|post)/i.test(text))return "social.publish";
  if(agent==="Alice"&&/(publish|price|delete|product)/i.test(text))return "commerce.change";
  return map[agent]||"work.execute";
}


function shouldBuildGrowthWorkflow(text:string){
  return /(campaign|fill.*seat|launch|promote|marketing|social|content|sell|growth)/i.test(text)
    && !/(refund|change bank|delete|sign|execute agreement)/i.test(text);
}

async function buildGrowthWorkflow(input:{objective:string;founderEmail:string;sessionId:number}){
  const workflow=await createPegasusWorkflow({
    company_id:"KMCE",
    workflow_key:"growth-campaign-v1",
    objective:input.objective,
    requested_by:input.founderEmail,
    correlation_id:`simon-session:${input.sessionId}:growth`,
    steps:[
      {key:"mark-strategy",agent:"Mark",capability:"marketing.strategy",objective:`Create the marketing strategy for: ${input.objective}`},
      {key:"cammy-campaign",agent:"Cammy",capability:"campaign.plan",objective:`Turn Mark's strategy into a campaign plan for: ${input.objective}`},
      {key:"evan-creative",agent:"Evan",capability:"creative.produce",objective:`Create the campaign content/creative package for: ${input.objective}`},
      {key:"lucy-distribution",agent:"Lucy",capability:"social.distribute",objective:`Prepare channel distribution for: ${input.objective}`,approval_policy:"before_external_action"},
      {key:"snake-measure",agent:"Snake",capability:"growth.measure",objective:`Measure verified campaign performance for: ${input.objective}`},
      {key:"iris-verify",agent:"IRIS",capability:"quality.verify",objective:`Verify the campaign workflow, evidence and failures for: ${input.objective}`}
    ]
  });
  return workflow;
}

async function delegate(input:{
  agent:string; instruction:string; founderEmail:string; sessionId:number; routedBy:string; triage?:unknown;
}){
  const policy=approvalPolicyFor(input.instruction);
  const correlationId=`simon-session:${input.sessionId}`;
  const task=await createPegasusTask({
    company_id:"KMCE",
    capability:capabilityFor(input.agent,input.instruction),
    assigned_agent:input.agent,
    objective:input.instruction,
    requested_by:input.founderEmail,
    approval_policy:policy,
    completion_contract:[
      {type:"evidence_required",description:"Attach at least one verifiable work-result evidence record before completion."}
    ],
    payload:{source:"SIMON",routed_by:input.routedBy,triage:input.triage||null},
    correlation_id:correlationId,
    idempotency_key:`simon:${input.sessionId}:${input.agent}:${crypto.randomUUID()}`
  });
  return task;
}

export async function POST(req:Request){
 const founder=await requireFounder();
 if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});

 await ensureSchema();
 const q=sql();
 const body=await req.json().catch(()=>({}));
 const input=String(body.message||"").trim();
 if(!input)return NextResponse.json({error:"Message required"},{status:400});

 let sessionId=Number(body.session_id||0);
 if(!sessionId){
   const s:any=await q`INSERT INTO simon_sessions(founder_email) VALUES(${founder.email}) RETURNING id`;
   sessionId=Number(s[0].id);
 }
 await q`INSERT INTO simon_messages(session_id,role,content) VALUES(${sessionId},'FOUNDER',${input})`;

 let response="";
 let action:any={type:"ASK",status:"COMPLETED"};
 const explicitAgent=agentFrom(input);

 if(!explicitAgent&&shouldBuildGrowthWorkflow(input)){
   const workflow:any=await buildGrowthWorkflow({objective:input,founderEmail:founder.email,sessionId});
   action={
     type:"WORKFLOW",
     status:"QUEUED",
     target:"Pegasus",
     workflow_key:"growth-campaign-v1",
     parent_task_id:Number(workflow.parent.id),
     correlation_id:workflow.correlation_id,
     child_tasks:workflow.tasks.map((t:any)=>({id:Number(t.id),agent:t.owner_agent,status:t.status,capability:t.capability}))
   };
   response=`I created Pegasus workflow ${workflow.parent.id} for this objective. Mark, Cammy, Evan, Lucy, Snake and IRIS are now represented as governed child tasks. Lucy is held at the Founder approval gate before external distribution.`;
 }else if(explicitAgent&&/(have|ask|tell|assign|task|work|put|give)/i.test(input)){
   const task:any=await delegate({
     agent:explicitAgent,instruction:input,founderEmail:founder.email,
     sessionId,routedBy:"FOUNDER_EXPLICIT"
   });
   action={
     type:"DELEGATE",
     status:task.status,
     target:explicitAgent,
     task_id:Number(task.id),
     pegasus_task_id:Number(task.id),
     routed_by:"FOUNDER_EXPLICIT",
     approval_policy:task.approval_policy
   };
   response=task.status==="WAITING_APPROVAL"
     ?`I created Pegasus task ${task.id} for ${explicitAgent}. It is stopped at the Founder approval gate before any external action can run.`
     :`I created Pegasus task ${task.id} for ${explicitAgent}. It is in the governed work queue, and completion requires evidence.`;
 }else if(/(draft|write|prepare).*(email|message)|email.*(draft|write|prepare)/i.test(input)){
   const draft="Subject: KMCE follow-up\n\nHello,\n\nI'm following up on behalf of Kingdom Mindset CE regarding the matter Kimberly referenced. Please let us know a convenient next step.\n\nBest,\nKingdom Mindset CE";
   action={type:"DRAFT",status:"DRAFT_ONLY",draft};
   response="Of course. I've prepared a draft and recorded the request. I have not sent anything. The draft is ready for review.";
 }else{
   const marie:any=triageWorkItem({text:input,source:"FOUNDER"});

   if(marie.outcome==="DELEGATE"&&marie.agent){
     const task:any=await delegate({
       agent:marie.agent,instruction:input,founderEmail:founder.email,
       sessionId,routedBy:"MARIE",triage:marie
     });
     action={
       type:"DELEGATE",status:task.status,target:marie.agent,
       task_id:Number(task.id),pegasus_task_id:Number(task.id),
       routed_by:"MARIE",triage:marie,approval_policy:task.approval_policy
     };
     response=task.status==="WAITING_APPROVAL"
       ?`Marie routed this to ${marie.agent} as Pegasus task ${task.id}, but Pegasus stopped it at the approval gate before execution.`
       :`Marie routed this to ${marie.agent} as Pegasus task ${task.id}. Simon will receive verified evidence, not just a completion claim.`;
   }else if(marie.outcome==="HANDLE"){
     const task:any=await delegate({
       agent:"Marie",instruction:input,founderEmail:founder.email,
       sessionId,routedBy:"MARIE",triage:marie
     });
     action={
       type:"HANDLE",status:task.status,target:"Marie",
       task_id:Number(task.id),pegasus_task_id:Number(task.id),
       routed_by:"MARIE",triage:marie,approval_policy:task.approval_policy
     };
     response=`Marie has taken this as Pegasus coordination task ${task.id}. Completion requires evidence.`;
   }else if(marie.outcome==="ASK_SIMON"){
     action={type:"ASK_SIMON",status:"NEEDS_SIMON",target:"Simon",routed_by:"MARIE",triage:marie};
     response="Marie flagged this for Simon because it needs executive prioritization, policy evaluation, or clarification before action.";
   }else if(marie.outcome==="ESCALATE_KIMBERLY"){
     action={type:"ESCALATE_KIMBERLY",status:"REQUIRES_FOUNDER",target:"Kimberly",routed_by:"MARIE",triage:marie};
     response="Marie stopped this at the Founder boundary. No financial, contractual, security, publishing, or external action was executed.";
   }else{
     const stages:any=await q`SELECT pipeline_stage,count(*)::int count FROM leads GROUP BY pipeline_stage`;
     const tasks:any=await q`
       SELECT owner_agent,count(*)::int count
       FROM autonomy_jobs
       WHERE status IN ('PENDING','RUNNING','WAITING_APPROVAL')
       GROUP BY owner_agent
     `;
     const total=stages.reduce((n:number,x:any)=>n+Number(x.count),0);
     const pending=stages.find((x:any)=>x.pipeline_stage==="PENDING_APPROVAL")?.count||0;
     const approved=stages.find((x:any)=>x.pipeline_stage==="APPROVED")?.count||0;
     response=`KMCE currently has ${total} leads recorded. ${pending} are pending approval and ${approved} are approved for Echo. ${tasks.length?"Pegasus also has "+tasks.map((x:any)=>x.owner_agent+" "+x.count).join(", ")+" active task(s).":"There are no active Pegasus assignments."} What would you like me to handle next?`;
     action={type:"ASK",status:"COMPLETED",routed_by:"MARIE",triage:marie};
   }
 }

 await q`INSERT INTO simon_actions(session_id,action_type,target,payload,status,requested_by)
          VALUES(${sessionId},${action.type},${action.target||null},${JSON.stringify(action)}::jsonb,${action.status},${founder.email})`;
 await q`INSERT INTO simon_messages(session_id,role,content) VALUES(${sessionId},'SIMON',${response})`;

 return NextResponse.json({session_id:sessionId,response,action,system:"PEGASUS"});
}
