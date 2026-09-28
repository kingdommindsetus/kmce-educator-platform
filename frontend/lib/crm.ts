import {ensureSchema,sql} from "./db";
import {educator as seedEducator,leads as seedLeads,draftFor} from "./data";

export async function seedPilot(){
 await ensureSchema(); const q=sql();
 const e=await q`INSERT INTO educators(public_name,credentials,professional_title,status)
 VALUES(${seedEducator.public_name},${seedEducator.credentials},${seedEducator.professional_title},'ACTIVE')
 ON CONFLICT(public_name) DO UPDATE SET credentials=EXCLUDED.credentials,professional_title=EXCLUDED.professional_title
 RETURNING *`;
 const educator=e[0];
 for(const l of seedLeads){
   const rows=await q`INSERT INTO leads(educator_id,practice_name,decision_maker,city,state,email,phone,evidence,qualification_reason,qualification_score,pipeline_stage,assigned_agent,approval_status)
   VALUES(${educator.id},${l.practice_name},${l.decision_maker},${l.city},${l.state},${l.email},${l.phone},${l.evidence},${l.qualification_reason},${l.qualification_score},'PENDING_APPROVAL','Gatekeeper','PENDING')
   ON CONFLICT(educator_id,practice_name) DO UPDATE SET decision_maker=EXCLUDED.decision_maker,email=EXCLUDED.email,phone=EXCLUDED.phone,evidence=EXCLUDED.evidence,qualification_reason=EXCLUDED.qualification_reason,qualification_score=EXCLUDED.qualification_score
   RETURNING *`;
   const lead=rows[0];
   // Never reset mutable workflow state during seed. Neon remains the source of truth.
   const existing=await q`SELECT id FROM outreach_jobs WHERE lead_id=${lead.id} LIMIT 1`;
   if(!existing.length){
     await q`INSERT INTO outreach_jobs(lead_id,status,draft_content) VALUES(${lead.id},'PENDING_APPROVAL',${draftFor(l)})`;
     await q`INSERT INTO lead_activities(lead_id,actor_name,action,detail) VALUES(${lead.id},'Maven/Gatekeeper','OUTREACH_DRAFTED','Personalized draft created and held for founder approval.')`;
   }
 }
 return educator;
}

export async function workspace(){
 const educator=await seedPilot(); const q=sql();
 const leads=await q`SELECT * FROM leads WHERE educator_id=${educator.id} ORDER BY id`;
 const pending=await q`SELECT o.*,l.practice_name,l.decision_maker,l.email,l.phone FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE l.educator_id=${educator.id} AND o.status='PENDING_APPROVAL' ORDER BY o.id`;
 const activity=await q`SELECT a.*,l.practice_name,l.pipeline_stage FROM lead_activities a JOIN leads l ON l.id=a.lead_id WHERE l.educator_id=${educator.id} ORDER BY a.created_at DESC,a.id DESC LIMIT 250`;
 return {educator,leads,courses:[{id:1,title:"Craniofacial Biodentistry & Advanced Airway Integration",course_status:"PLANNING"}],campaigns:[{id:1,name:"Dr. Timothy Adams — Phoenix Pilot 10",status:"RESEARCH"}],pending_approvals:pending,agent_activity:activity};
}

export async function leadDetail(id:number){
 await seedPilot(); const q=sql();
 const leads=await q`SELECT * FROM leads WHERE id=${id}`; if(!leads.length)return null;
 const activity=await q`SELECT * FROM lead_activities WHERE lead_id=${id} ORDER BY created_at DESC,id DESC`;
 const outreach=await q`SELECT * FROM outreach_jobs WHERE lead_id=${id} ORDER BY id DESC`;
 return {lead:leads[0],activity,outreach};
}
