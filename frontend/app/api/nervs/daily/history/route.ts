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
    SELECT id,meeting_date,meeting_type,timezone,status,summary,started_at,completed_at,created_at
    FROM nervs_meeting_runs
    ORDER BY meeting_date DESC,id DESC
    LIMIT 30
  `;

  const ids=(meetings as any[]).map(row=>row.id);
  let reports:any[]=[];
  if(ids.length){
    reports=await q`
      SELECT meeting_id,agent_name,department,speaking_order,win,blocker,next_action,ask_of_team,evidence,voice_script,audio_status,created_at
      FROM nervs_meeting_reports
      WHERE meeting_id = ANY(${ids})
      ORDER BY meeting_id DESC,speaking_order ASC,id ASC
    `;
  }

  const grouped=new Map<number,any[]>();
  for(const report of reports as any[]){
    const id=Number(report.meeting_id);
    const list=grouped.get(id)||[];
    list.push(report);
    grouped.set(id,list);
  }

  return NextResponse.json({
    meetings:(meetings as any[]).map(meeting=>({
      ...meeting,
      id:Number(meeting.id),
      reports:grouped.get(Number(meeting.id))||[],
    })),
  });
}
