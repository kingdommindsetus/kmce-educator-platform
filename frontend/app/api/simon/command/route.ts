import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
export const runtime="nodejs";
const AGENTS=["Marie","Scout","Claire","Atlas","Sofia","Maven","Gatekeeper","Echo","Booker","Flow","Ledger"];
function agentFrom(s:string){return AGENTS.find(a=>new RegExp("\\b"+a+"\\b","i").test(s))||null}
export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body=await req.json().catch(()=>({})); const input=String(body.message||"").trim();
 if(!input)return NextResponse.json({error:"Message required"},{status:400});
 let sessionId=Number(body.session_id||0); if(!sessionId){const s:any=await q`INSERT INTO simon_sessions(founder_email) VALUES(${founder.email}) RETURNING id`;sessionId=Number(s[0].id)}
 await q`INSERT INTO simon_messages(session_id,role,content) VALUES(${sessionId},'FOUNDER',${input})`;
 let response="",action:any={type:"ASK",status:"COMPLETED"}; const a=agentFrom(input);
 if(a&&/(have|ask|tell|assign|task|work|put|give)/i.test(input)){
  const instruction=input.trim(),title=instruction.slice(0,90); const rows:any=await q`INSERT INTO agent_tasks(assigned_agent,title,instruction,requested_by) VALUES(${a},${title},${instruction},${founder.email}) RETURNING id`;
  action={type:"DELEGATE",status:"QUEUED",target:a,task_id:Number(rows[0].id)}; response=`Certainly. I've added that to ${a}'s workload as task ${rows[0].id}. I'll keep watch on it.`;
 }else if(/(draft|write|prepare).*(email|message)|email.*(draft|write|prepare)/i.test(input)){
  const draft="Subject: KMCE follow-up\n\nHello,\n\nI'm following up on behalf of Kingdom Mindset CE regarding the matter Kimberly referenced. Please let us know a convenient next step.\n\nBest,\nKingdom Mindset CE";
  action={type:"DRAFT",status:"DRAFT_ONLY",draft}; response="Of course. I've prepared a draft and recorded the request. I have not sent anything. The draft is ready for review.";
 }else{
  const stages:any=await q`SELECT pipeline_stage,count(*)::int count FROM leads GROUP BY pipeline_stage`; const tasks:any=await q`SELECT assigned_agent,count(*)::int count FROM agent_tasks WHERE status IN ('QUEUED','IN_PROGRESS') GROUP BY assigned_agent`;
  const total=stages.reduce((n:number,x:any)=>n+Number(x.count),0),pending=stages.find((x:any)=>x.pipeline_stage==="PENDING_APPROVAL")?.count||0,approved=stages.find((x:any)=>x.pipeline_stage==="APPROVED")?.count||0;
  response=`KMCE currently has ${total} leads recorded. ${pending} are pending approval and ${approved} are approved for Echo. ${tasks.length?"I also have "+tasks.map((x:any)=>x.assigned_agent+" "+x.count).join(", ")+" active assignment(s).":"There are no Simon-created agent assignments waiting."} What would you like me to handle next?`;
 }
 await q`INSERT INTO simon_actions(session_id,action_type,target,payload,status,requested_by) VALUES(${sessionId},${action.type},${action.target||null},${JSON.stringify(action)}::jsonb,${action.status},${founder.email})`;
 await q`INSERT INTO simon_messages(session_id,role,content) VALUES(${sessionId},'SIMON',${response})`; return NextResponse.json({session_id:sessionId,response,action});
}
