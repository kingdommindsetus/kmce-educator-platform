export function clamp(n,min=0,max=100){return Math.max(min,Math.min(max,Number(n)||0))}

export function qualifyLead(input={}){
  const confidence=clamp(input.research_confidence);
  const hasVerifiedContact=Boolean(input.contact_verified_at);
  const hasDecisionMaker=Boolean(String(input.decision_maker||"").trim());
  const hasWebsite=Boolean(String(input.website||"").trim());
  const evidenceCount=Math.max(0,Number(input.evidence_count)||0);
  const officialEvidenceCount=Math.max(0,Number(input.official_evidence_count)||0);

  const breakdown={
    research_confidence:Math.round(confidence*0.4),
    verified_contact:hasVerifiedContact?20:0,
    decision_maker:hasDecisionMaker?15:0,
    official_presence:(hasWebsite||officialEvidenceCount>0)?10:0,
    multi_source_evidence:evidenceCount>=2?15:evidenceCount===1?5:0
  };
  const score=Object.values(breakdown).reduce((a,b)=>a+Number(b),0);

  const reasons=[];
  if(confidence<60)reasons.push("research confidence below 60");
  if(!hasVerifiedContact)reasons.push("contact not verified");
  if(!hasDecisionMaker)reasons.push("decision maker not verified");
  if(!(hasWebsite||officialEvidenceCount>0))reasons.push("official presence not established");
  if(evidenceCount<2)reasons.push("fewer than two evidence sources");

  let decision="HOLD";
  let next_action="Claire: strengthen evidence before outreach planning.";
  if(score>=75 && confidence>=60 && hasVerifiedContact){
    decision="QUALIFY";
    next_action="Maven: prepare campaign/outreach strategy from verified facts only.";
  }else if(score<35 || (!hasWebsite && officialEvidenceCount===0 && evidenceCount===0)){
    decision="REJECT";
    next_action="Archive from active sales motion unless new evidence appears.";
  }

  return {score,decision,breakdown,reasons,next_action};
}
