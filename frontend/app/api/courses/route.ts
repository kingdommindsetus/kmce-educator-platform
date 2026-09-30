import {NextResponse} from "next/server";
import {requireFounder} from "../../../lib/auth";
import {ensureSchema,sql} from "../../../lib/db";

export const runtime="nodejs";

export async function GET(){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const q=sql();
  const rows:any=await q`SELECT c.*,e.public_name AS faculty_name,
    (SELECT json_build_object('decision',a.decision,'decided_by',a.decided_by,'decision_notes',a.decision_notes,'decided_at',a.decided_at)
     FROM course_authorizations a WHERE a.course_id=c.id ORDER BY a.decided_at DESC LIMIT 1) AS latest_authorization
    FROM courses c JOIN educators e ON e.id=c.educator_id ORDER BY c.updated_at DESC,c.id DESC`;
  return NextResponse.json(rows);
}

export async function POST(req:Request){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const body:any=await req.json().catch(()=>({}));
  const courseCode=String(body.course_code||"").trim().toUpperCase();
  const educatorId=Number(body.educator_id||0);
  const title=String(body.title||"").trim();
  const courseFormat=String(body.course_format||"").trim();
  const targetAudience=String(body.target_audience||"").trim();
  const educationalNeed=String(body.educational_need||"").trim();
  if(!/^KM-\d{4}-\d{3}$/.test(courseCode))return NextResponse.json({error:"Course ID must use KM-YYYY-###"},{status:400});
  if(!educatorId||!title||!courseFormat||!targetAudience||!educationalNeed)return NextResponse.json({error:"Faculty, title, format, audience, and educational need are required"},{status:400});
  const q=sql();
  const rows:any=await q`INSERT INTO courses(course_code,educator_id,title,course_format,target_audience,educational_need,learning_objectives,agenda,instructional_minutes,proposed_ce_hours,subject_code,reference_resources,attendance_method,completion_criteria,evaluation_method,assessment_plan)
    VALUES(${courseCode},${educatorId},${title},${courseFormat},${targetAudience},${educationalNeed},${JSON.stringify(Array.isArray(body.learning_objectives)?body.learning_objectives:[])}::jsonb,${String(body.agenda||"").trim()},${Number(body.instructional_minutes||0)},${Number(body.proposed_ce_hours||0)},${String(body.subject_code||"").trim()||null},${JSON.stringify(Array.isArray(body.reference_resources)?body.reference_resources:[])}::jsonb,${String(body.attendance_method||"").trim()},${String(body.completion_criteria||"").trim()},${String(body.evaluation_method||"").trim()},${String(body.assessment_plan||"").trim()||null}) RETURNING *`;
  return NextResponse.json(rows[0],{status:201});
}
