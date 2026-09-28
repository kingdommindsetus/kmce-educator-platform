export function canBookDiscovery(input={}){
  const stage=String(input.pipeline_stage||"");
  const verified=Boolean(input.contact_verified_at);
  const hasTime=Boolean(input.scheduled_start);
  const stageOk=["REPLIED","INTERESTED"].includes(stage);
  return {
    ok:stageOk&&verified&&hasTime,
    checks:{stageOk,verified,hasTime},
    reason:!stageOk?"LEAD_NOT_READY_FOR_BOOKING":!verified?"CONTACT_NOT_VERIFIED":!hasTime?"SCHEDULE_REQUIRED":"READY"
  };
}

export function discoveryOutcome(outcome){
  const value=String(outcome||"").toUpperCase();
  if(value==="INTERESTED") return {pipeline_stage:"OPPORTUNITY",assigned_agent:"Flow",next_action:"Open onboarding case."};
  if(value==="FOLLOW_UP") return {pipeline_stage:"FOLLOW_UP",assigned_agent:"Echo",next_action:"Continue controlled follow-up."};
  if(value==="NOT_A_FIT") return {pipeline_stage:"DISQUALIFIED",assigned_agent:"Atlas",next_action:"Remove from active sales motion."};
  throw new Error("UNSUPPORTED_DISCOVERY_OUTCOME");
}

export function onboardingChecklist(serviceCode="UNASSIGNED"){
  const common=["SERVICE_SELECTION","CONTACT_CONFIRMATION","AGREEMENT_STATUS","PAYMENT_PATH"];
  const service=String(serviceCode||"UNASSIGNED").toUpperCase();
  const extra=service==="EDUCATOR_90_DAY"?["FACULTY_PROFILE","COURSE_STATUS","BRAND_ASSETS"]:service==="IN_OFFICE_TRAINING"?["PRACTICE_ADDRESS","TEAM_SIZE","PREFERRED_DATE"]:[];
  return [...common,...extra];
}

export function onboardingProgress(required=[],completed=[]){
  const req=[...new Set(required.map(String))];
  const done=new Set(completed.map(String));
  const missing=req.filter(x=>!done.has(x));
  return {
    required:req,
    completed:req.filter(x=>done.has(x)),
    missing,
    ready_for_payment:req.length>0&&missing.length===0
  };
}
