import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";
import {ceEligibility} from "../../../../../lib/simon/ledger-delivery-v1";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({}));
 const enrollmentId=Number(body.enrollment_id||0); if(!enrollmentId)return NextResponse.json({error:"enrollment_id required"},{status:400});
 const rows:any=await q`SELECT * FROM learning_enrollments WHERE id=${enrollmentId} LIMIT 1`; if(!rows.length)return NextResponse.json({error:"Enrollment not found"},{status:404});
 const eligibility:any=ceEligibility(body);
 const rec:any=await q`INSERT INTO ce_completion_records(enrollment_id,ce_hours,attendance_verified,assessment_passed,evaluation_completed,eligibility_status,evidence,verified_by,verified_at)
 VALUES(${enrollmentId},${Number(body.ce_hours||0)},${Boolean(body.attendance_verified)},${Boolean(body.assessment_passed)},${Boolean(body.evaluation_completed)},${eligibility.status},${JSON.stringify(body.evidence||{})}::jsonb,${founder.email},now())
 ON CONFLICT(enrollment_id) DO UPDATE SET ce_hours=EXCLUDED.ce_hours,attendance_verified=EXCLUDED.attendance_verified,assessment_passed=EXCLUDED.assessment_passed,evaluation_completed=EXCLUDED.evaluation_completed,eligibility_status=EXCLUDED.eligibility_status,evidence=EXCLUDED.evidence,verified_by=EXCLUDED.verified_by,verified_at=EXCLUDED.verified_at,updated_at=now() RETURNING *`;
 if(eligibility.eligible)await q`UPDATE learning_enrollments SET status='COMPLETED',completed_at=COALESCE(completed_at,now()) WHERE id=${enrollmentId}`;
 return NextResponse.json({completion:rec[0],eligibility,certificate_issued:false});
}
