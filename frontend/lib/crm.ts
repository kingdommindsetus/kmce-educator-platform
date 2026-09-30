import {ensureSchema,sql} from "./db";
import {educator as seedEducator,leads as seedLeads,draftFor} from "./data";

export async function seedPilot(){
 await ensureSchema(); const q=sql();
 const e=await q`INSERT INTO educators(public_name,credentials,professional_title,status)
 VALUES(${seedEducator.public_name},${seedEducator.credentials},${seedEducator.professional_title},'ACTIVE')
 ON CONFLICT(public_name) DO UPDATE SET credentials=EXCLUDED.credentials,professional_title=EXCLUDED.professional_title
 RETURNING *`;
 const educator=e[0];

 // First controlled KMCE course file. Creation does not authorize CE.
 const km2026001EducationalNeed=`Sleep-related breathing disorders, obstructive sleep apnea in particular, are common and widely underdiagnosed. General dentists can identify craniofacial and airway findings early, yet many practices lack a structured workflow to recognize risk factors, document findings, refer to a physician for diagnosis, and integrate airway findings into restorative, orthodontic, and TMJ/TMD treatment planning. This draft uses a craniofacial-development and biologic-dentistry perspective while staying within dental scope of practice. Faculty confirmation and KMCE needs evidence remain required before submission.`;
 await q`INSERT INTO courses(
   course_code,working_name,educator_id,title,course_format,target_audience,educational_need,
   learning_objectives,agenda,instructional_minutes,proposed_ce_hours,subject_code,reference_resources,
   attendance_method,completion_criteria,evaluation_method,assessment_plan,
   course_status,authorization_status
 ) VALUES(
   'KM-2026-001',
   'Dr. Tim Course 2026',
   ${educator.id},
   'Craniofacial Biodentistry & Advanced Airway Integration',
   'Live seminar',
   'Dentists and dental professionals',
   ${km2026001EducationalNeed},
   '["Describe the craniofacial growth and developmental factors that influence upper-airway size and function across the lifespan.","Identify clinical and radiographic signs associated with airway compromise and sleep-related breathing disorders during a routine dental examination.","Apply a validated screening instrument and a structured airway examination to determine when to refer a patient to a physician for sleep evaluation.","Explain the dentist''s role and scope of practice in interdisciplinary management of obstructive sleep apnea, including oral appliance therapy.","Integrate airway findings into comprehensive restorative, orthodontic, and TMJ/TMD treatment planning.","Outline a practice workflow for airway screening, documentation, physician communication, and follow-up."]'::jsonb,
   '8:00–8:15 Registration and sign-in (not counted)\n8:15–10:15 Module 1: Craniofacial growth, development, and the airway (120 min)\n10:15–10:30 Break (not counted)\n10:30–12:00 Module 2: Recognizing airway compromise — clinical and radiographic findings, screening instruments, airway exam (90 min)\n12:00–1:00 Lunch (not counted)\n1:00–2:30 Module 3: Interdisciplinary care — referral pathway, physician collaboration, oral appliance therapy principles, scope of practice (90 min)\n2:30–2:45 Break (not counted)\n2:45–3:45 Module 4: Treatment-plan integration and practice workflow — case reviews (60 min)\n3:45–4:00 Post-course assessment, evaluation, sign-out (not counted)\n\nInstructional time: 120 + 90 + 90 + 60 = 360 minutes = 6.0 CE hours. Registration, breaks, lunch, and evaluation are excluded. Faculty confirmation required before submission.',
   360,
   6,
   '730 (proposed; confirm current AGD subject code)',
   '["ADA Policy Statement on the Role of Dentistry in the Treatment of Sleep-Related Breathing Disorders (2017)","Ramar K, et al. J Clin Sleep Med. 2015;11(7):773–827.","Benjafield AV, et al. Lancet Respir Med. 2019;7(8):687–698.","KMCE needs evidence: attendee surveys, practice requests, or Phoenix pilot lead research — pending attachment."]'::jsonb,
   'Sign-in and sign-out sheet with printed name, license number, and signature, checked by KMCE staff at registration, after lunch, and at dismissal. Late arrivals and early departures are recorded with times, and credit is given only for time attended.',
   'Attend all 360 instructional minutes as the attendance record shows, and submit the course evaluation. Participants who miss part of the program get credit only for the instructional time they attended, with no rounding up. Certificates are issued after both requirements are met.',
   'Written participant evaluation collected before certificates are issued. It covers learning objectives, faculty effectiveness, content relevance and balance, facility, and future topics. Results are summarized and retained in the course file.',
   '10-question post-course knowledge check covering Modules 1–4, reviewed before dismissal. It measures learning only and is not a condition of credit.',
   'Development',
   'NOT_SUBMITTED'
 )
 ON CONFLICT(course_code) DO UPDATE SET
   working_name=CASE WHEN courses.working_name='' THEN EXCLUDED.working_name ELSE courses.working_name END,course_format=EXCLUDED.course_format,target_audience=EXCLUDED.target_audience,educational_need=EXCLUDED.educational_need,learning_objectives=EXCLUDED.learning_objectives,agenda=EXCLUDED.agenda,instructional_minutes=EXCLUDED.instructional_minutes,proposed_ce_hours=EXCLUDED.proposed_ce_hours,subject_code=EXCLUDED.subject_code,reference_resources=EXCLUDED.reference_resources,attendance_method=EXCLUDED.attendance_method,completion_criteria=EXCLUDED.completion_criteria,evaluation_method=EXCLUDED.evaluation_method,assessment_plan=EXCLUDED.assessment_plan,updated_at=now()
 WHERE courses.authorization_status='NOT_SUBMITTED' AND courses.learning_objectives='[]'::jsonb AND courses.agenda=''`;

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
 const courses=await q`SELECT * FROM courses WHERE educator_id=${educator.id} ORDER BY updated_at DESC,id DESC`;
 const pending=await q`SELECT o.*,l.practice_name,l.decision_maker,l.email,l.phone FROM outreach_jobs o JOIN leads l ON l.id=o.lead_id WHERE l.educator_id=${educator.id} AND o.status='PENDING_APPROVAL' ORDER BY o.id`;
 const activity=await q`SELECT a.*,l.practice_name,l.pipeline_stage FROM lead_activities a JOIN leads l ON l.id=a.lead_id WHERE l.educator_id=${educator.id} ORDER BY a.created_at DESC,a.id DESC LIMIT 250`;
 return {educator,leads,courses,campaigns:[{id:1,name:"Dr. Timothy Adams — Phoenix Pilot 10",status:"RESEARCH"}],pending_approvals:pending,agent_activity:activity};
}

export async function leadDetail(id:number){
 await seedPilot(); const q=sql();
 const leads=await q`SELECT * FROM leads WHERE id=${id}`; if(!leads.length)return null;
 const activity=await q`SELECT * FROM lead_activities WHERE lead_id=${id} ORDER BY created_at DESC,id DESC`;
 const outreach=await q`SELECT * FROM outreach_jobs WHERE lead_id=${id} ORDER BY id DESC`;
 return {lead:leads[0],activity,outreach};
}
