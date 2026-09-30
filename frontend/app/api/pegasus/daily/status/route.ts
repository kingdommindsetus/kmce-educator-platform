import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

const ALLOWED=new Set(["RUNNING","COMPLETED","FAILED","CANCELLED"]);

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder) return NextResponse.json({error:"Founder access required"},{status:403});

  const body=await req.json().catch(()=>({}));
  const meetingId=Number(body.meeting_id);
  const status=String(body.status||"").toUpperCase();

  if(!Number.isInteger(meetingId)||meetingId<=0) return NextResponse.json({error:"Valid meeting_id required"},{status:400});
  if(!ALLOWED.has(status)) return NextResponse.json({error:"Invalid meeting status"},{status:400});

  await ensureSchema();
  const q=sql();

  const rows=status==="RUNNING"
    ? await q`
        UPDATE pegasus_meeting_runs
        SET status='RUNNING',started_at=COALESCE(started_at,now()),completed_at=NULL
        WHERE id=${meetingId}
        RETURNING id,status,started_at,completed_at
      `
    : await q`
        UPDATE pegasus_meeting_runs
        SET status=${status},completed_at=now()
        WHERE id=${meetingId}
        RETURNING id,status,started_at,completed_at
      `;

  if(!(rows as any[]).length) return NextResponse.json({error:"Meeting not found"},{status:404});
  return NextResponse.json((rows as any[])[0]);
}
