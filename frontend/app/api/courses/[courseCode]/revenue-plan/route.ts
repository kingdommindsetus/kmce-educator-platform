import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

const defaultPipeline=[
  {stage:"Faculty investment and offer",owner:"Founder + Ledger",status:"PLAN"},
  {stage:"Course packet and authorization",owner:"Faculty + KMCE",status:"GATED"},
  {stage:"Positioning and launch assets",owner:"Sofia + Maven",status:"PLAN"},
  {stage:"Registration campaign and follow-up",owner:"Sofia + Echo + Booker",status:"PLAN"},
  {stage:"Live delivery and CE closeout",owner:"KMCE Operations",status:"GATED"},
  {stage:"On-demand and office-training follow-on",owner:"Faculty + Flow",status:"PLAN"},
];

function economics(plan:any){
  const price=Number(plan.course_price_minor||0), registrations=Number(plan.target_registrations||0), investment=Number(plan.faculty_investment_minor||0), expenses=Number(plan.approved_direct_expenses_minor||0);
  const gross=price*registrations, fees=Math.round(gross*Number(plan.processing_fee_bps||0)/10000), distributable=Math.max(0,gross-fees-expenses), faculty=Math.round(distributable*Number(plan.faculty_share_bps||0)/10000), target=Math.round(investment*Number(plan.target_return_multiple||0));
  return {gross_minor:gross,processing_fees_minor:fees,distributable_minor:distributable,faculty_projected_minor:faculty,kmce_projected_minor:distributable-faculty,faculty_target_minor:target,faculty_target_gap_minor:Math.max(0,target-faculty),break_even_registrations:price>0?Math.ceil((investment+expenses)/(price*(1-Number(plan.processing_fee_bps||0)/10000)*(Number(plan.faculty_share_bps||0)/10000))):null};
}

async function getPlan(courseCode:string){
  const q=sql();
  const course:any=await q`SELECT id,course_code,title,authorization_status FROM courses WHERE course_code=${courseCode} LIMIT 1`;
  if(!course.length)return null;
  const existing:any=await q`SELECT * FROM faculty_revenue_plans WHERE course_id=${course[0].id} LIMIT 1`;
  const plan=existing[0]||{course_id:course[0].id,faculty_investment_minor:0,course_price_minor:null,capacity:0,target_registrations:0,processing_fee_bps:300,approved_direct_expenses_minor:0,faculty_share_bps:8000,kmce_share_bps:2000,target_return_multiple:2,pipeline:defaultPipeline};
  return {course:course[0],plan,economics:economics(plan)};
}

export async function GET(_:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema(); const data=await getPlan(String((await params).courseCode||"").toUpperCase());
  return data?NextResponse.json(data):NextResponse.json({error:"Course not found"},{status:404});
}

export async function PUT(req:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema(); const body:any=await req.json().catch(()=>({})); const courseCode=String((await params).courseCode||"").toUpperCase(); const current=await getPlan(courseCode);
  if(!current)return NextResponse.json({error:"Course not found"},{status:404});
  const n=(value:any)=>Math.max(0,Math.round(Number(value)||0)); const price=body.course_price_minor===""||body.course_price_minor==null?null:n(body.course_price_minor);
  const facultyShare=n(body.faculty_share_bps??8000), kmceShare=n(body.kmce_share_bps??2000);
  if(facultyShare+kmceShare!==10000)return NextResponse.json({error:"Revenue shares must total 100%"},{status:400});
  const q=sql(); const rows:any=await q`INSERT INTO faculty_revenue_plans(course_id,faculty_investment_minor,course_price_minor,capacity,target_registrations,processing_fee_bps,approved_direct_expenses_minor,faculty_share_bps,kmce_share_bps,target_return_multiple,pipeline,updated_by)
  VALUES(${current.course.id},${n(body.faculty_investment_minor)},${price},${n(body.capacity)},${n(body.target_registrations)},${n(body.processing_fee_bps??300)},${n(body.approved_direct_expenses_minor)},${facultyShare},${kmceShare},${Math.max(0,Number(body.target_return_multiple)||0)},${JSON.stringify(Array.isArray(body.pipeline)?body.pipeline:defaultPipeline)}::jsonb,${founder.email})
  ON CONFLICT(course_id) DO UPDATE SET faculty_investment_minor=EXCLUDED.faculty_investment_minor,course_price_minor=EXCLUDED.course_price_minor,capacity=EXCLUDED.capacity,target_registrations=EXCLUDED.target_registrations,processing_fee_bps=EXCLUDED.processing_fee_bps,approved_direct_expenses_minor=EXCLUDED.approved_direct_expenses_minor,faculty_share_bps=EXCLUDED.faculty_share_bps,kmce_share_bps=EXCLUDED.kmce_share_bps,target_return_multiple=EXCLUDED.target_return_multiple,pipeline=EXCLUDED.pipeline,updated_by=EXCLUDED.updated_by,updated_at=now() RETURNING *`;
  return NextResponse.json({course:current.course,plan:rows[0],economics:economics(rows[0])});
}
