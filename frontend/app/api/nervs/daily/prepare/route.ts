import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

const AGENTS=[
  {id:"simon",name:"Simon",department:"Executive"},
  {id:"marie",name:"Marie",department:"Operations"},
  {id:"eyes",name:"Eyes",department:"Intelligence"},
  {id:"mark",name:"Mark",department:"Marketing"},
  {id:"cammy",name:"Cammy",department:"Campaigns"},
  {id:"eve",name:"Eve",department:"Brand"},
  {id:"tube",name:"Tube",department:"Video"},
  {id:"lucy",name:"Lucy",department:"Social"},
  {id:"snake",name:"Snake",department:"Growth"},
  {id:"alice",name:"Alice",department:"Store"},
  {id:"echo",name:"Echo",department:"Sales Outreach"},
  {id:"booker",name:"Booker",department:"Sales Scheduling"},
] as const;

const DONE=new Set(["DONE","COMPLETED","SUCCESS","SUCCEEDED"]);
const BLOCKED=new Set(["BLOCKED","FAILED","ERROR","WAITING","NEEDS KIMBERLY","PENDING_APPROVAL"]);

function clean(value:unknown){
  return String(value??"").replace(/\s+/g," ").trim();
}

function meetingDate(){
  return new Intl.DateTimeFormat("en-CA",{
    timeZone:"America/New_York",
    year:"numeric",
    month:"2-digit",
    day:"2-digit",
  }).format(new Date());
}

function reportFor(agent:(typeof AGENTS)[number],tasks:any[],speakingOrder:number){
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
    department:agent.department,
    speaking_order:speakingOrder,
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
    WHERE lower(assigned_agent) IN ('simon','marie','eyes','mark','cammy','eve','tube','lucy','snake','alice','echo','booker')
    ORDER BY updated_at DESC,id DESC
    LIMIT 400
  `;

  const reports=AGENTS.map((agent,index)=>reportFor(agent,tasks as any[],index+1));
  const date=meetingDate();
  const agenda=AGENTS.map(agent=>agent.name);
  const snapshot={
    task_count:(tasks as any[]).length,
    task_ids:(tasks as any[]).map(task=>task.id),
    captured_at:new Date().toISOString(),
  };

  const meetingRows=await q`
    INSERT INTO nervs_meeting_runs(meeting_date,meeting_type,timezone,status,agenda,source_snapshot,created_by)
    VALUES (
      ${date},
      'DAILY_8AM',
      'America/New_York',
      'READY',
      ${JSON.stringify(agenda)}::jsonb,
      ${JSON.stringify(snapshot)}::jsonb,
      'NERVS'
    )
    ON CONFLICT(meeting_date,meeting_type) DO UPDATE SET
      timezone=EXCLUDED.timezone,
      status='READY',
      agenda=EXCLUDED.agenda,
      source_snapshot=EXCLUDED.source_snapshot,
      summary=NULL,
      completed_at=NULL
    RETURNING id,status
  `;
  const meetingId=Number((meetingRows as any[])[0].id);

  for(const report of reports){
    await q`
      INSERT INTO nervs_meeting_reports(
        meeting_id,agent_name,department,speaking_order,win,blocker,next_action,ask_of_team,evidence,voice_script,audio_status
      )
      VALUES(
        ${meetingId},
        ${report.agent_name},
        ${report.department},
        ${report.speaking_order},
        ${report.win},
        ${report.blocker},
        ${report.next},
        ${report.ask},
        ${JSON.stringify({task_ids:report.evidence_task_ids})}::jsonb,
        ${report.script},
        'SCRIPT_READY'
      )
      ON CONFLICT(meeting_id,agent_name) DO UPDATE SET
        department=EXCLUDED.department,
        speaking_order=EXCLUDED.speaking_order,
        win=EXCLUDED.win,
        blocker=EXCLUDED.blocker,
        next_action=EXCLUDED.next_action,
        ask_of_team=EXCLUDED.ask_of_team,
        evidence=EXCLUDED.evidence,
        voice_script=EXCLUDED.voice_script,
        audio_status='SCRIPT_READY',
        audio_url=NULL,
        provider_audio_ref=NULL
    `;
  }

  return NextResponse.json({
    status:"READY",
    meeting_id:meetingId,
    meeting_date:date,
    meeting_type:"NERVS_DAILY_V1",
    generated_at:new Date().toISOString(),
    reports,
    authority_note:"Prepared reports are read-only meeting evidence. Spoken statements do not create external effects.",
  });
}
