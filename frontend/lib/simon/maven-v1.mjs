export function clean(value){const s=String(value??"").replace(/\s+/g," ").trim();return s||null}

export function buildVerifiedOutreachDraft(input={}){
  const practice=clean(input.practice_name);
  const decisionMaker=clean(input.decision_maker);
  const city=clean(input.city);
  const state=clean(input.state);
  const score=Number(input.qualification_score)||0;
  const verified=Boolean(input.contact_verified_at && input.contact_source_url);

  if(!practice) return {ok:false,reason:"PRACTICE_REQUIRED"};
  if(String(input.pipeline_stage||"")!=="QUALIFIED") return {ok:false,reason:"LEAD_NOT_QUALIFIED"};
  if(score<75) return {ok:false,reason:"QUALIFICATION_SCORE_TOO_LOW"};
  if(!verified) return {ok:false,reason:"CONTACT_NOT_VERIFIED"};

  const greeting=decisionMaker ? "Hello "+decisionMaker+"," : "Hello,";
  const location=[city,state].filter(Boolean).join(", ");
  const locationLine=location ? " I’m reaching out regarding "+practice+" in "+location+"." : " I’m reaching out regarding "+practice+".";

  const subject="Continuing education opportunity with Kingdom Mindset CE";
  const body=[
    greeting,
    "",
    "I’m Kimberly Jimenez with Kingdom Mindset CE."+locationLine,
    "",
    "KMCE provides continuing education and practice implementation support for dental teams, including dental sleep medicine, craniofacial airway education, and custom team training.",
    "",
    "I’d be glad to share the education options that may fit your practice and answer any questions.",
    "",
    "Best,",
    "Kimberly Jimenez",
    "Kingdom Mindset CE"
  ].join("\n");

  return {
    ok:true,
    subject,
    body,
    draft:"Subject: "+subject+"\n\n"+body,
    facts_used:{
      practice_name:practice,
      decision_maker:decisionMaker,
      location:location||null,
      qualification_score:score,
      contact_verified:true
    }
  };
}
