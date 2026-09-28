import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({})); const completionId=Number(body.completion_id||0);
 if(!completionId)return NextResponse.json({error:"completion_id required"},{status:400});
 const rows:any=await q`SELECT c.*,e.learner_email,e.course_code FROM ce_completion_records c JOIN learning_enrollments e ON e.id=c.enrollment_id WHERE c.id=${completionId} LIMIT 1`;
 if(!rows.length)return NextResponse.json({error:"Completion not found"},{status:404}); const c=rows[0];
 if(c.eligibility_status!=="ELIGIBLE"||!c.attendance_verified||!c.assessment_passed||!c.evaluation_completed)return NextResponse.json({error:"CE eligibility requirements not satisfied"},{status:409});
 const certNo=`KMCE-${new Date().getUTCFullYear()}-${String(completionId).padStart(8,"0")}`;
 const cert:any=await q`INSERT INTO ce_certificates(completion_id,certificate_number,issued_to_email,course_code,ce_hours,issued_by,metadata) VALUES(${completionId},${certNo},${c.learner_email},${c.course_code},${Number(c.ce_hours)},${founder.email},${JSON.stringify({provider:"KMCE",agdp_ace_national_id:"441585",agdp_ace_local_id:"217702"})}::jsonb) ON CONFLICT(completion_id) DO UPDATE SET status='ISSUED' RETURNING *`;
 return NextResponse.json({certificate:cert[0]});
}
