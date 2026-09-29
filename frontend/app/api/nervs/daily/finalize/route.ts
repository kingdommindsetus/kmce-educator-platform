import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

function clean(value:unknown){
  return String(value??"").replace(/\s+/g," ").trim();
}

function meaningful(value:unknown,emptyPhrases:string[]){
  const text=clean(value);
  if(!text) return false;
  const lower=text.toLowerCase();
  return !emptyPhrases.some(phrase=>lower===phrase.toLowerCase());
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const body=await req.json().catch(()=>({}));
  const meetingId=Number(body.meeting_id);
  if(!Number.isInteger(meetingId)||meetingId<=0){
    return NextResponse.json({error:"Valid meeting_id required"},{status:400});
  }

  await ensureSchema();
  const q=sql();

  const meetings=await q`
    SELECT id,meeting_date,meeting_type,status
    FROM nervs_meeting_runs
    WHERE id=${meetingId}
    LIMIT 1
  `;
  const meeting=(meetings as any[])[0];
  if(!meeting) return NextResponse.json({error:"Meeting not found"},{status:404});
  if(String(meeting.status)!=="COMPLETED"){
    return NextResponse.json({error:"Meeting must be COMPLETED before notes are finalized"},{status:409});
  }

  const reports=await q`
    SELECT agent_name,department,speaking_order,win,blocker,next_action,ask_of_team,evidence
    FROM nervs_meeting_reports
    WHERE meeting_id=${meetingId}
    ORDER BY speaking_order ASC,id ASC
  `;
  if(!(reports as any[]).length){
    return NextResponse.json({error:"No meeting reports found"},{status:409});
  }

  const wins=(reports as any[]).filter(r=>meaningful(r.win,["No verified completed task recorded yet."]));
  const blockers=(reports as any[]).filter(r=>meaningful(r.blocker,["No active blocker recorded."]));
  const asks=(reports as any[]).filter(r=>meaningful(r.ask_of_team,["No ask."]));
  const nexts=(reports as any[]).filter(r=>meaningful(r.next_action,["No queued task recorded."]));

  const sections=[
    "NERVS Daily Meeting #"+meetingId+" — "+clean(meeting.meeting_date),
    "Executive summary: "+wins.length+" verified win(s), "+blockers.length+" blocker(s), "+asks.length+" team/founder ask(s), "+nexts.length+" actionable next move(s).",
    wins.length?"Wins: "+wins.map(r=>clean(r.agent_name)+": "+clean(r.win)).join(" | "):"Wins: none verified.",
    blockers.length?"Blockers: "+blockers.map(r=>clean(r.agent_name)+": "+clean(r.blocker)).join(" | "):"Blockers: none active.",
    asks.length?"Asks: "+asks.map(r=>clean(r.agent_name)+": "+clean(r.ask_of_team)).join(" | "):"Asks: none.",
    nexts.length?"Next actions: "+nexts.map(r=>clean(r.agent_name)+": "+clean(r.next_action)).join(" | "):"Next actions: none queued.",
  ];
  const summary=sections.join("\n");

  await q`
    UPDATE nervs_meeting_runs
    SET summary=${summary}
    WHERE id=${meetingId}
  `;

  const createdActions:any[]=[];

  for(const report of reports as any[]){
    const agent=clean(report.agent_name);
    const blocker=clean(report.blocker);
    const ask=clean(report.ask_of_team);
    const next=clean(report.next_action);

    const hasBlocker=meaningful(blocker,["No active blocker recorded."]);
    const hasAsk=meaningful(ask,["No ask."]);
    const hasNext=meaningful(next,["No queued task recorded."]);

    if(!hasBlocker&&!hasAsk&&!hasNext) continue;

    const founderGate=/founder|kimberly|approval|approve|decision needed/i.test(ask+" "+blocker);
    const authority=founderGate?"APPROVAL":"CONTROLLED";
    const status=founderGate?"WAITING_APPROVAL":"QUEUED";
    const priority=(founderGate||hasBlocker)?"HIGH":"NORMAL";
    const title=hasNext?next:(hasBlocker?"Resolve blocker: "+blocker:"Review ask: "+ask);
    const instruction=[
      hasBlocker?"Blocker: "+blocker:"",
      hasAsk?"Ask: "+ask:"",
      hasNext?"Next: "+next:"",
    ].filter(Boolean).join(" ");
    const fingerprint=["NERVS",meetingId,agent,title].join(":").toLowerCase();

    const rows=await q`
      INSERT INTO nervs_meeting_actions(
        meeting_id,source_agent,assigned_agent,title,instruction,priority,authority,status,metadata
      )
      SELECT
        ${meetingId},
        ${agent},
        ${agent},
        ${title},
        ${instruction},
        ${priority},
        ${authority},
        ${status},
        ${JSON.stringify({
          source:"NERVS_DAILY_FINALIZE",
          fingerprint,
          evidence_task_ids:report?.evidence?.task_ids||[],
        })}::jsonb
      WHERE NOT EXISTS(
        SELECT 1
        FROM nervs_meeting_actions
        WHERE meeting_id=${meetingId}
          AND metadata->>'fingerprint'=${fingerprint}
      )
      RETURNING id,meeting_id,source_agent,assigned_agent,title,instruction,priority,authority,status,metadata,created_at
    `;

    if((rows as any[])[0]) createdActions.push((rows as any[])[0]);
  }

  const actions=await q`
    SELECT id,meeting_id,source_agent,assigned_agent,title,instruction,priority,authority,status,metadata,created_at,updated_at
    FROM nervs_meeting_actions
    WHERE meeting_id=${meetingId}
    ORDER BY
      CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END,
      id ASC
  `;

  return NextResponse.json({
    status:"FINALIZED",
    meeting_id:meetingId,
    summary,
    action_count:(actions as any[]).length,
    created_action_count:createdActions.length,
    actions,
    authority_note:"Meeting notes may create internal action records only. APPROVAL items remain blocked pending founder review.",
  });
}
