import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

export async function GET(){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  await ensureSchema();
  const q=sql();

  const meetings=await q`
    SELECT id,meeting_date,meeting_type,timezone,status,summary,started_at,completed_at,created_at,
      notion_sync_status,notion_page_id,notion_page_url,notion_synced_at,notion_sync_error
    FROM pegasus_meeting_runs
    ORDER BY meeting_date DESC,id DESC
    LIMIT 30
  `;

  const ids=(meetings as any[]).map(row=>row.id);
  let reports:any[]=[];
  let actions:any[]=[];
  if(ids.length){
    reports=await q`
      SELECT meeting_id,agent_name,department,speaking_order,win,blocker,next_action,ask_of_team,evidence,voice_script,audio_status,created_at
      FROM pegasus_meeting_reports
      WHERE meeting_id = ANY(${ids})
      ORDER BY meeting_id DESC,speaking_order ASC,id ASC
    `;
    actions=await q`
      SELECT id,meeting_id,source_agent,assigned_agent,title,instruction,priority,authority,status,metadata,created_at,updated_at
      FROM pegasus_meeting_actions
      WHERE meeting_id = ANY(${ids})
      ORDER BY meeting_id DESC,
        CASE priority WHEN 'URGENT' THEN 1 WHEN 'HIGH' THEN 2 WHEN 'NORMAL' THEN 3 ELSE 4 END,
        id ASC
    `;
  }

  const grouped=new Map<number,any[]>();
  for(const report of reports as any[]){
    const id=Number(report.meeting_id);
    const list=grouped.get(id)||[];
    list.push(report);
    grouped.set(id,list);
  }

  const groupedActions=new Map<number,any[]>();
  for(const action of actions as any[]){
    const id=Number(action.meeting_id);
    const list=groupedActions.get(id)||[];
    list.push(action);
    groupedActions.set(id,list);
  }

  return NextResponse.json({
    meetings:(meetings as any[]).map(meeting=>({
      ...meeting,
      id:Number(meeting.id),
      reports:grouped.get(Number(meeting.id))||[],
      actions:groupedActions.get(Number(meeting.id))||[],
    })),
  });
}
