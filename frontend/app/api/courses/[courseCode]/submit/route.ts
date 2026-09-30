import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

function missing(course:any){
  const objectives=Array.isArray(course.learning_objectives)?course.learning_objectives:[];
  return [!course.educational_need&&"educational need",objectives.length===0&&"learning objectives",!course.agenda&&"agenda",Number(course.instructional_minutes)<=0&&"instructional time",Number(course.proposed_ce_hours)<=0&&"proposed CE hours",!course.attendance_method&&"attendance method",!course.completion_criteria&&"completion criteria",!course.evaluation_method&&"evaluation method"].filter(Boolean);
}

export async function POST(_:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema(); const q=sql();
  const courseCode=String((await params).courseCode||"").toUpperCase();
  const rows:any=await q`SELECT * FROM courses WHERE course_code=${courseCode} LIMIT 1`;
  if(!rows.length)return NextResponse.json({error:"Course not found"},{status:404});
  const course=rows[0]; const incomplete=missing(course);
  if(incomplete.length)return NextResponse.json({error:"Course packet is incomplete",missing:incomplete},{status:409});
  await q`INSERT INTO course_review_submissions(course_id,submitted_by,packet_snapshot) VALUES(${course.id},${founder.email},${JSON.stringify(course)}::jsonb)`;
  const updated:any=await q`UPDATE courses SET course_status='Under Review',authorization_status='UNDER_REVIEW',updated_at=now() WHERE id=${course.id} RETURNING *`;
  return NextResponse.json({course:updated[0]});
}
