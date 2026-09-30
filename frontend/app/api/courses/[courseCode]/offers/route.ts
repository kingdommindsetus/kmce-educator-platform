import {NextResponse} from "next/server";
import {requireFounder} from "../../../../../lib/auth";
import {ensureSchema,sql} from "../../../../../lib/db";

const defaults=[
  {lane:"DIGITAL",offer_name:"Airway Screening & Referral Toolkit for General Dental Practices",description:"A practical non-CE implementation toolkit: screening checklist, team workflow, referral guide, patient conversation scripts, and implementation workbook.",proposed_price_minor:null,offer_status:"IDEA",ce_credit_offered:false,next_action:"Faculty confirms toolkit contents and approved claims."},
  {lane:"LIVE_IN_PERSON",offer_name:"Craniofacial Biodentistry & Advanced Airway Integration — Live Seminar",description:"Premium in-person educational seminar. Proposed tuition, venue, audience, and delivery details remain under faculty and KMCE review.",proposed_price_minor:null,offer_status:"DEVELOPMENT",ce_credit_offered:true,next_action:"Complete controlled course packet and internal authorization review before marketing."},
  {lane:"LIVE_IN_OFFICE",offer_name:"Dr. Timothy Adams In-Office Airway Integration Training",description:"Premium on-site office training delivered personally by Dr. Adams. Scope, travel terms, attendee cap, and deliverables must be confirmed before launch.",proposed_price_minor:650000,offer_status:"IDEA",ce_credit_offered:false,next_action:"Define the $6,500 scope, travel policy, office requirements, and whether CE credit will be requested."},
  {lane:"ONLINE",offer_name:"Airway Integration: Live Webinar & On-Demand Course",description:"A live webinar may lead into an on-demand recorded course after the initial build, production, and applicable internal review.",proposed_price_minor:null,offer_status:"IDEA",ce_credit_offered:false,next_action:"Choose webinar topic, production scope, and whether CE credit will be requested."},
];

async function courseFor(code:string){const q=sql(); const rows:any=await q`SELECT id,course_code,title FROM courses WHERE course_code=${code} LIMIT 1`;return rows[0]||null;}

export async function GET(_:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder();if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();const course=await courseFor(String((await params).courseCode||"").toUpperCase());if(!course)return NextResponse.json({error:"Course not found"},{status:404});
  const q=sql();const offers:any=await q`SELECT * FROM faculty_offers WHERE course_id=${course.id} ORDER BY CASE lane WHEN 'DIGITAL' THEN 1 WHEN 'LIVE_IN_PERSON' THEN 2 WHEN 'LIVE_IN_OFFICE' THEN 3 ELSE 4 END`;
  return NextResponse.json({course,offers:offers.length?offers:defaults,seeded:offers.length>0});
}

export async function PUT(req:Request,{params}:{params:Promise<{courseCode:string}>}){
  const founder=await requireFounder();if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
  await ensureSchema();const course=await courseFor(String((await params).courseCode||"").toUpperCase());if(!course)return NextResponse.json({error:"Course not found"},{status:404});
  const body:any=await req.json().catch(()=>({}));const inputs=Array.isArray(body.offers)?body.offers:defaults;
  if(inputs.length!==4||new Set(inputs.map((x:any)=>x.lane)).size!==4)return NextResponse.json({error:"The plan must contain each of the four controlled offers."},{status:400});
  const allowed=new Set(defaults.map(x=>x.lane));const statuses=new Set(["IDEA","DEVELOPMENT","REVIEW","READY_TO_LAUNCH","LIVE","PAUSED","RETIRED"]);const q=sql();
  for(const input of inputs){
    if(!allowed.has(input.lane)||!String(input.offer_name||"").trim()||!statuses.has(input.offer_status))return NextResponse.json({error:"Each offer needs a valid lane, name, and status."},{status:400});
    const price=input.proposed_price_minor===""||input.proposed_price_minor==null?null:Math.max(0,Math.round(Number(input.proposed_price_minor)||0));
    await q`INSERT INTO faculty_offers(course_id,lane,offer_name,description,proposed_price_minor,offer_status,ce_credit_offered,next_action,updated_by)
      VALUES(${course.id},${input.lane},${String(input.offer_name).trim()},${String(input.description||"").trim()},${price},${input.offer_status},${Boolean(input.ce_credit_offered)},${String(input.next_action||"").trim()},${founder.email})
      ON CONFLICT(course_id,lane) DO UPDATE SET offer_name=EXCLUDED.offer_name,description=EXCLUDED.description,proposed_price_minor=EXCLUDED.proposed_price_minor,offer_status=EXCLUDED.offer_status,ce_credit_offered=EXCLUDED.ce_credit_offered,next_action=EXCLUDED.next_action,updated_by=EXCLUDED.updated_by,updated_at=now()`;
  }
  const offers:any=await q`SELECT * FROM faculty_offers WHERE course_id=${course.id} ORDER BY CASE lane WHEN 'DIGITAL' THEN 1 WHEN 'LIVE_IN_PERSON' THEN 2 WHEN 'LIVE_IN_OFFICE' THEN 3 ELSE 4 END`;
  return NextResponse.json({course,offers,seeded:true});
}
