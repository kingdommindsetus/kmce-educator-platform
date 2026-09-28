import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {onboardingChecklist,onboardingProgress} from "../../../../lib/simon/booker-flow-v1";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({})); const leadId=Number(body.lead_id||0);
 if(!leadId)return NextResponse.json({error:"lead_id required"},{status:400});
 const leads:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`; if(!leads.length)return NextResponse.json({error:"Lead not found"},{status:404});
 const lead=leads[0]; if(!["OPPORTUNITY"].includes(String(lead.pipeline_stage)))return NextResponse.json({error:"Lead is not ready for onboarding"},{status:409});
 const serviceCode=String(body.service_code||"UNASSIGNED").toUpperCase();
 const existing:any=await q`SELECT * FROM onboarding_cases WHERE lead_id=${leadId} AND status NOT IN ('COMPLETED','CANCELLED') ORDER BY id DESC LIMIT 1`;
 let item:any;
 if(existing.length){item=existing[0]}else{const required=onboardingChecklist(serviceCode);const rows:any=await q`INSERT INTO onboarding_cases(lead_id,service_code,status,required_items,completed_items,missing_items,opened_by) VALUES(${leadId},${serviceCode},'OPEN',${JSON.stringify(required)}::jsonb,'[]'::jsonb,${JSON.stringify(required)}::jsonb,'Flow') RETURNING *`;item=rows[0];}
 const completed=Array.isArray(body.completed_items)?body.completed_items:item.completed_items||[]; const progress:any=onboardingProgress(item.required_items||[],completed);
 const status=progress.ready_for_payment?"READY_FOR_PAYMENT":"IN_PROGRESS";
 const rows:any=await q`UPDATE onboarding_cases SET status=${status},completed_items=${JSON.stringify(progress.completed)}::jsonb,missing_items=${JSON.stringify(progress.missing)}::jsonb,notes=${body.notes||item.notes||null},updated_at=now() WHERE id=${item.id} RETURNING *`;
 await q`UPDATE leads SET assigned_agent='Flow',updated_at=now() WHERE id=${leadId}`;
 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Flow',${status},${progress.ready_for_payment?"Onboarding checklist complete; ready for Ledger/payment path.":"Onboarding in progress. Missing: "+progress.missing.join(", ")})`;
 return NextResponse.json({case:rows[0],progress,next_agent:progress.ready_for_payment?"Ledger":"Flow",external_actions_executed:false});
}
