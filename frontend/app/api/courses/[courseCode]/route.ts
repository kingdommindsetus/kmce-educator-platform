import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";

export const runtime="nodejs";

export async function PATCH(req:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder();
  if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();
  const body:any=await req.json().catch(()=>({}));
  const q=sql();
  const courseCode=String((await params).courseCode||"").toUpperCase();
  const existing:any=await q`SELECT * FROM courses WHERE course_code=${courseCode} LIMIT 1`;
  if(!existing.length)return NextResponse.json({error:"Course not found"},{status:404});
  if(existing[0].authorization_status==="UNDER_REVIEW"||existing[0].authorization_status==="APPROVED"||existing[0].authorization_status==="APPROVED_WITH_CONDITIONS")return NextResponse.json({error:"Course packet is locked. Record a revision decision before editing."},{status:409});
  const objectives=Array.isArray(body.learning_objectives)?body.learning_objectives.map((x:any)=>String(x).trim()).filter(Boolean):[];
  const updated:any=await q`UPDATE courses SET
    course_format=${String(body.course_format||"").trim()},target_audience=${String(body.target_audience||"").trim()},educational_need=${String(body.educational_need||"").trim()},learning_objectives=${JSON.stringify(objectives)}::jsonb,agenda=${String(body.agenda||"").trim()},instructional_minutes=${Number(body.instructional_minutes||0)},proposed_ce_hours=${Number(body.proposed_ce_hours||0)},subject_code=${String(body.subject_code||"").trim()||null},reference_resources=${JSON.stringify(Array.isArray(body.reference_resources)?body.reference_resources.map((x:any)=>String(x).trim()).filter(Boolean):[])}::jsonb,attendance_method=${String(body.attendance_method||"").trim()},completion_criteria=${String(body.completion_criteria||"").trim()},evaluation_method=${String(body.evaluation_method||"").trim()},assessment_plan=${String(body.assessment_plan||"").trim()||null},course_status='Development',authorization_status='NOT_SUBMITTED',updated_at=now()
    WHERE id=${existing[0].id} RETURNING *`;
  return NextResponse.json(updated[0]);
}
