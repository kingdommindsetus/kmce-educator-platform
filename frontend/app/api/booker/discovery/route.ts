import {NextResponse} from "next/server";
import {requireFounder} from "../../../../lib/auth";
import {ensureSchema,sql} from "../../../../lib/db";
import {canBookDiscovery,discoveryOutcome} from "../../../../lib/simon/booker-flow-v1";
export const runtime="nodejs";

export async function POST(req:Request){
 const founder=await requireFounder(); if(!founder)return NextResponse.json({error:"Founder access required"},{status:403});
 await ensureSchema(); const q=sql(); const body:any=await req.json().catch(()=>({})); const leadId=Number(body.lead_id||0);
 if(!leadId)return NextResponse.json({error:"lead_id required"},{status:400});
 const rows:any=await q`SELECT * FROM leads WHERE id=${leadId} LIMIT 1`; if(!rows.length)return NextResponse.json({error:"Lead not found"},{status:404});
 const lead=rows[0];
 if(body.action==="COMPLETE"){
   const appointments:any=await q`SELECT * FROM discovery_appointments WHERE lead_id=${leadId} AND status='BOOKED' ORDER BY id DESC LIMIT 1`;
   if(!appointments.length)return NextResponse.json({error:"No booked discovery found"},{status:409});
   let outcome:any; try{outcome=discoveryOutcome(body.outcome)}catch{return NextResponse.json({error:"Unsupported discovery outcome"},{status:400})}
   await q`UPDATE discovery_appointments SET status='COMPLETED',outcome=${String(body.outcome||"").toUpperCase()},notes=${body.notes||null},completed_at=now(),updated_at=now() WHERE id=${appointments[0].id}`;
   await q`UPDATE leads SET pipeline_stage=${outcome.pipeline_stage},assigned_agent=${outcome.assigned_agent},updated_at=now() WHERE id=${leadId}`;
   await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Booker','DISCOVERY_COMPLETED',${String(body.outcome||"").toUpperCase()+" → "+outcome.assigned_agent})`;
   return NextResponse.json({lead_id:leadId,...outcome,external_actions_executed:false});
 }
 const gate:any=canBookDiscovery({...lead,scheduled_start:body.scheduled_start});
 if(!gate.ok)return NextResponse.json({error:"Booking gate failed",reason:gate.reason,checks:gate.checks},{status:409});
 const appts:any=await q`INSERT INTO discovery_appointments(lead_id,status,scheduled_start,scheduled_end,timezone,booking_source,created_by,notes) VALUES(${leadId},'BOOKED',${body.scheduled_start},${body.scheduled_end||null},${body.timezone||"America/New_York"},'FOUNDER',${founder.email},${body.notes||null}) RETURNING *`;
 await q`UPDATE leads SET pipeline_stage='CALL_BOOKED',assigned_agent='Booker',updated_at=now() WHERE id=${leadId}`;
 await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${leadId},'Booker','CALL_BOOKED',${"Discovery booked for "+body.scheduled_start+". Calendar provider not invoked."})`;
 return NextResponse.json({appointment:appts[0],provider_configured:false,external_actions_executed:false});
}
