export function normalizeUrl(value){
  if(!value)return null;
  let raw=String(value).trim();
  if(!raw)return null;
  if(!/^https?:\/\//i.test(raw)) raw="https://"+raw;
  try{
    const u=new URL(raw);
    u.hash="";
    u.search="";
    if(u.pathname==="/")u.pathname="";
    return u.toString().replace(/\/$/,"");
  }catch{return null}
}

export function websiteHost(value){
  const url=normalizeUrl(value);
  if(!url)return null;
  try{return new URL(url).hostname.replace(/^www\./i,"").toLowerCase()}catch{return null}
}

export function cleanText(value){
  const s=String(value??"").replace(/\s+/g," ").trim();
  return s||null;
}

export function normalizeCandidate(input={}){
  const website=normalizeUrl(input.website);
  const sourceUrl=normalizeUrl(input.source_url||input.contact_source_url||input.website);
  return {
    practice_name:cleanText(input.practice_name),
    decision_maker:cleanText(input.decision_maker),
    city:cleanText(input.city),
    state:cleanText(input.state)?.toUpperCase()||null,
    email:cleanText(input.email)?.toLowerCase()||null,
    phone:cleanText(input.phone),
    website,
    website_host:websiteHost(website),
    source_url:sourceUrl,
    discovery_source:cleanText(input.discovery_source)||"MANUAL_IMPORT"
  };
}

export function evidenceConfidence(items=[]){
  if(!items.length)return 0;
  const vals=items.map(x=>Math.max(0,Math.min(100,Number(x.confidence)||0)));
  return Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
}

export function claireReadiness(candidate,evidence=[]){
  const c=normalizeCandidate(candidate);
  const sourceCount=new Set(evidence.map(x=>normalizeUrl(x.source_url)).filter(Boolean)).size;
  const hasIdentity=!!c.practice_name;
  const hasReachableContact=!!(c.email||c.phone);
  const hasOfficialSource=!!(c.website||evidence.some(x=>String(x.source_type||"").toUpperCase()==="OFFICIAL"));
  const confidence=evidenceConfidence(evidence);
  return {
    ready_for_atlas:hasIdentity&&hasReachableContact&&hasOfficialSource&&confidence>=60,
    confidence,
    checks:{hasIdentity,hasReachableContact,hasOfficialSource,sourceCount}
  };
}

export function claireNextState(currentStage,currentAgent,readiness,hasApprovedOutreach=false){
  const stage=String(currentStage||"ENRICHING").toUpperCase();
  if(hasApprovedOutreach){
    return {stage:"APPROVED",agent:"Echo",preserved:true,reason:"Approved outreach exists; preserve downstream Echo state."};
  }
  const enrichmentStages=new Set(["DISCOVERED","ENRICHING","ENRICHED"]);
  if(!enrichmentStages.has(stage)){
    return {stage,agent:currentAgent||null,preserved:true,reason:"Claire enrichment cannot regress a downstream workflow stage."};
  }
  if(readiness?.ready_for_atlas){
    return {stage:"ENRICHED",agent:"Atlas",preserved:false,reason:"Claire enrichment complete; ready for Atlas qualification."};
  }
  return {stage:"ENRICHING",agent:"Claire",preserved:false,reason:"Claire enrichment incomplete; more verified evidence/contact data required."};
}
