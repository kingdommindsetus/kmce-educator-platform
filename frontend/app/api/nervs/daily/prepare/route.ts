import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
import {labelAgentTask} from "../../../../../lib/course-task-labels";

export const runtime="nodejs";

const AGENTS=[
  {id:"simon",name:"Simon",department:"Executive"},
  {id:"marie",name:"Marie",department:"Operations"},
  {id:"eyes",name:"Eyes",department:"Intelligence"},
  {id:"mark",name:"Mark",department:"Marketing"},
  {id:"cammy",name:"Cammy",department:"Campaigns"},
  {id:"eve",name:"Evan",department:"Brand"},
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

function naturalSpeech(
  agent:(typeof AGENTS)[number],
  completed:any|undefined,
  blocker:any|undefined,
  open:any|undefined,
  nextAgentName:string|undefined,
){
  const winTitle=completed?clean(completed.title):"";
  const blockerTitle=blocker?clean(blocker.title):"";
  const nextTitle=open?clean(open.title):(blocker?clean(blocker.title):"");
  const founderGate=blocker&&/approval|kimberly|founder/i.test(String(blocker.title||"")+" "+String(blocker.instruction||""));

  const openings:Record<string,string>={
    Simon:"Good morning, Kimberly.",
    Marie:"Morning, Kimberly.",
    Eyes:"Here’s what I’m seeing.",
    Mark:"Quick marketing update.",
    Cammy:"Here’s where the campaign work stands.",
    Evan:"Quick brand update.",
    Tube:"Here’s my video update.",
    Lucy:"Here’s what’s happening on social.",
    Snake:"I’ve been watching the numbers.",
    Alice:"Quick storefront update.",
    Echo:"Here’s where outreach stands.",
    Booker:"Here’s the scheduling update.",
  };

  const parts:string[]=[openings[agent.name]||"Quick update."];

  if(winTitle){
    const winLead:Record<string,string>={
      Simon:"We closed out ",
      Marie:"I finished ",
      Eyes:"I verified ",
      Mark:"I wrapped up ",
      Cammy:"I completed ",
      Evan:"I finished ",
      Tube:"I wrapped ",
      Lucy:"I finished ",
      Snake:"I confirmed ",
      Alice:"I completed ",
      Echo:"I finished ",
      Booker:"I wrapped up ",
    };
    parts.push((winLead[agent.name]||"I finished ")+winTitle+".");
  }else{
    parts.push(agent.name==="Snake"
      ?"Nothing new is fully closed yet, but I’m still tracking movement."
      :"I don’t have a completed item to call out since the last check.");
  }

  if(blockerTitle){
    parts.push(founderGate
      ?"I’m held up on "+blockerTitle+" because it needs your decision."
      :"The only thing slowing me down is "+blockerTitle+".");
  }else{
    const clearLine=agent.name==="Snake"
      ?"Nothing is stuck right now."
      :agent.name==="Eyes"
        ?"I’m not seeing a blocker at the moment."
        :"Nothing is blocking me right now.";
    parts.push(clearLine);
  }

  if(nextTitle){
    const nextLead:Record<string,string>={
      Simon:"My next move is ",
      Marie:"I’m moving next into ",
      Eyes:"Next I’m checking ",
      Mark:"Next I’m moving on ",
      Cammy:"Next I’m working through ",
      Evan:"Next I’m tightening up ",
      Tube:"Next I’m building ",
      Lucy:"Next I’m pushing ",
      Snake:"Next I’m watching ",
      Alice:"Next I’m cleaning up ",
      Echo:"Next I’m following through on ",
      Booker:"Next I’m working on ",
    };
    parts.push((nextLead[agent.name]||"Next I’m handling ")+nextTitle+".");
  }else{
    parts.push("My queue is clear for the moment.");
  }

  if(founderGate){
    parts.push("I need you to make that call before I move forward.");
  }else if(blockerTitle){
    parts.push("Once that dependency clears, I can keep moving.");
  }else{
    const noAsk=agent.name==="Simon"
      ?"I don’t need anything from you right now."
      :agent.name==="Marie"
        ?"I’m good to keep moving unless you want to redirect me."
        :"I don’t need anything from the team right now.";
    parts.push(noAsk);
  }

  if(nextAgentName){
    parts.push("Hey "+nextAgentName+", you’re up next.");
  }else{
    parts.push("Hey Simon, you’re up next to close us out.");
  }

  return parts.join(" ");
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

  const nextAgent=AGENTS[speakingOrder]?.name;
  const script=naturalSpeech(agent,completed,blocker,open,nextAgent);

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
  const rawTasks=await q`
    SELECT id,assigned_agent,title,instruction,status,source,requested_by,created_at,updated_at
    FROM agent_tasks
    WHERE lower(assigned_agent) IN ('simon','marie','eyes','mark','cammy','eve','tube','lucy','snake','alice','echo','booker')
    ORDER BY updated_at DESC,id DESC
    LIMIT 400
  `;
  const courses:any=await q`SELECT c.course_code,c.working_name,c.title,c.course_format,e.public_name AS faculty_name FROM courses c JOIN educators e ON e.id=c.educator_id`;
  const tasks=(rawTasks as any[]).map(task=>labelAgentTask(task,courses as any[]));

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
      'HUDDLE'
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
    meeting_type:"HUDDLE_DAILY_V1",
    generated_at:new Date().toISOString(),
    reports,
    authority_note:"Prepared Huddle reports are read-only meeting evidence. Spoken statements do not create external effects.",
  });
}
