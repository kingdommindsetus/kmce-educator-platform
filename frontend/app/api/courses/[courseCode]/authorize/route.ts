import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

export const runtime="nodejs";

function missingForAuthorization(course:any){
  const objectives=Array.isArray(course.learning_objectives)?course.learning_objectives:[];
  return [
    !course.title&&"title",
    !course.educator_id&&"faculty owner",
    !course.educational_need&&"educational need",
    objectives.length===0&&"learning objectives",
    !course.agenda&&"agenda",
    Number(course.instructional_minutes)<=0&&"instructional time",
    Number(course.proposed_ce_hours)<=0&&"proposed CE hours",
    !course.attendance_method&&"attendance method",
    !course.completion_criteria&&"completion criteria",
    !course.evaluation_method&&"evaluation method",
  ].filter(Boolean);
}

export async function POST(req:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const body:any=await req.json().catch(()=>({}));
  const decision=String(body.decision||"").toUpperCase();
  if(!["APPROVED","APPROVED_WITH_CONDITIONS","REVISION_REQUIRED","DENIED"].includes(decision))return NextResponse.json({error:"Valid authorization decision required"},{status:400});
  const q=sql();
  const courseCode=String((await params).courseCode||"").toUpperCase();
  const rows:any=await q`SELECT * FROM courses WHERE course_code=${courseCode} LIMIT 1`;
  if(!rows.length)return NextResponse.json({error:"Course not found"},{status:404});
  const course=rows[0];
  const missing=missingForAuthorization(course);
  if((decision==="APPROVED"||decision==="APPROVED_WITH_CONDITIONS")&&missing.length)return NextResponse.json({error:"Course file is incomplete",missing},{status:409});
  const notes=String(body.decision_notes||"").trim()||null;
  await q`INSERT INTO course_authorizations(course_id,decision,decided_by,decision_notes,review_snapshot) VALUES(${course.id},${decision},${founder.email},${notes},${JSON.stringify(course)}::jsonb)`;
  const status=decision==="APPROVED"?"Approved":decision==="APPROVED_WITH_CONDITIONS"?"Approved With Conditions":decision==="REVISION_REQUIRED"?"Revision Required":"On Hold";
  const updated:any=await q`UPDATE courses SET authorization_status=${decision},course_status=${status},updated_at=now() WHERE id=${course.id} RETURNING *`;
  return NextResponse.json({course:updated[0],missing:[]});
}
