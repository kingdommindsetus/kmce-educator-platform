import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

const AGENTS=[
  {id:"mark",name:"Mark"},
  {id:"tube",name:"Tube"},
  {id:"lucy",name:"Lucy"},
  {id:"booker",name:"Booker"},
  {id:"alice",name:"Alice"},
  {id:"snake",name:"Snake"},
] as const;

const DONE=new Set(["DONE","COMPLETED","SUCCESS","SUCCEEDED"]);
const BLOCKED=new Set(["BLOCKED","FAILED","ERROR","WAITING","NEEDS KIMBERLY","PENDING_APPROVAL"]);

function clean(value:unknown){
  return String(value??"").replace(/\s+/g," ").trim();
}

function reportFor(agent:{id:string;name:string},tasks:any[]){
  const mine=tasks.filter(t=>String(t.assigned_agent||"").toLowerCase()===agent.name.toLowerCase());
  const completed=mine.find(t=>DONE.has(String(t.status||"").toUpperCase()));
  const blocker=mine.find(t=>BLOCKED.has(String(t.status||"").toUpperCase()));
  const open=mine.find(t=>!DONE.has(String(t.status||"").toUpperCase())&&!BLOCKED.has(String(t.status||"").toUpperCase()));

  const win=completed?clean(completed.title):"No verified completed task recorded yet.";
  const blocked=blocker?clean(blocker.title):"No active blocker recorded.";
  const next=open?clean(open.title):(blocker?("Resolve: "+clean(blocker.title)):"No queued task recorded.");
  const ask=blocker?(
    /approval|kimberly|founder/i.test(String(blocker.title||"")+" "+String(blocker.instruction||""))
      ? ("Founder decision needed for "+clean(blocker.title)+".")
      : ("Dependency needs resolution for "+clean(blocker.title)+".")
  ):"No ask.";

  const script=agent.name+" reporting. Win: "+win+" Blocker: "+blocked+" Next: "+next+" Ask: "+ask;

  return {
    agent_id:agent.id,
    agent_name:agent.name,
    win,
    blocker:blocked,
    next,
    ask,
    script,
    evidence_task_ids:mine.slice(0,5).map(t=>t.id),
  };
}

export async function POST(){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  await ensureSchema();
  const q=sql();
  const tasks=await q`
    SELECT id,assigned_agent,title,instruction,status,source,requested_by,created_at,updated_at
    FROM agent_tasks
    WHERE lower(assigned_agent) IN ('mark','tube','lucy','booker','alice','snake')
    ORDER BY updated_at DESC,id DESC
    LIMIT 250
  `;

  const reports=AGENTS.map(agent=>reportFor(agent,tasks as any[]));
  return NextResponse.json({
    status:"READY",
    meeting_type:"NERVS_DAILY_V1",
    generated_at:new Date().toISOString(),
    reports,
    authority_note:"Prepared reports are read-only meeting evidence. Spoken statements do not create external effects.",
  });
}