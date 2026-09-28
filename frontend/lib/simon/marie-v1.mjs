import {AUTHORITY, CAPABILITIES, resolveCapability} from "./capability-registry.mjs";

export const MARIE_OUTCOMES = Object.freeze([
  "IGNORE","LOG","DELEGATE","HANDLE","ASK_SIMON","ESCALATE_KIMBERLY"
]);

const AGENT_HINTS = [
  ["Scout", /(lead|prospect|practice|dentist|find businesses|find offices)/i],
  ["Claire", /(research|verify|enrich|evidence|background|source)/i],
  ["Atlas", /(qualif|score|fit|opportunity|priority lead)/i],
  ["Sofia", /(instagram|facebook|linkedin|youtube|google business|seo|social)/i],
  ["Maven", /(campaign|sequence|newsletter|content campaign|email campaign)/i],
  ["Gatekeeper", /(compliance|policy|claim|approve|approval|verify rule)/i],
  ["Echo", /(outreach|follow[- ]?up|email draft|contact lead)/i],
  ["Booker", /(schedule|calendar|discovery call|meeting|book)/i],
  ["Flow", /(document|onboard|application|form|missing item)/i],
  ["Ledger", /(payment|invoice|stripe|refund|reconcile|revenue)/i],
  ["Delivery/CE", /(certificate|ce credit|course complete|attendance|fulfillment|entitlement)/i]
];

const HIGH_RISK = /(send money|refund|charge|pay\b|payment link|change bank|bank account|routing number|password|credential|api key|sign (the )?(agreement|contract)|delete audit|delete ledger|grant permission|increase authority)/i;
const EXTERNAL_CONTACT = /(send|publish|post|message|email|dm|contact)\b/i;
const NOISE = /^(thanks|thank you|ok|okay|got it|noted|cool|lol|😂|🔥)[!. ]*$/i;

export function inferAgent(text){
  for (const [agent,rx] of AGENT_HINTS) if (rx.test(text)) return agent;
  return null;
}

export function triageWorkItem(input){
  const text=String(input?.text||input?.instruction||"").trim();
  const source=String(input?.source||"UNKNOWN");
  const explicitCapability=input?.capability ? String(input.capability) : null;

  if(!text) return {outcome:"IGNORE",reason:"empty",source};
  if(NOISE.test(text)) return {outcome:"IGNORE",reason:"no operational state change",source};

  if(HIGH_RISK.test(text)){
    return {
      outcome:"ESCALATE_KIMBERLY",
      reason:"financial, contractual, security, or authority-sensitive action",
      source,
      capability:explicitCapability
    };
  }

  if(explicitCapability){
    const cap=resolveCapability(explicitCapability);
    if(!cap) return {outcome:"ASK_SIMON",reason:"unknown capability",source,capability:explicitCapability};
    if(cap.authority===AUTHORITY.FORBIDDEN) return {outcome:"ESCALATE_KIMBERLY",reason:"forbidden capability",source,capability:explicitCapability};
    if(cap.authority===AUTHORITY.APPROVAL) return {outcome:"ESCALATE_KIMBERLY",reason:"capability requires founder approval",source,capability:explicitCapability,agent:cap.owner};
    if(cap.authority===AUTHORITY.POLICY) return {outcome:"ASK_SIMON",reason:"policy-bound execution requires rule evaluation",source,capability:explicitCapability,agent:cap.owner};
    return {outcome:"DELEGATE",reason:"registered capability owner",source,capability:explicitCapability,agent:cap.owner};
  }

  const agent=inferAgent(text);
  if(agent){
    if(EXTERNAL_CONTACT.test(text) && ["Sofia","Echo","Flow"].includes(agent)){
      return {outcome:"ASK_SIMON",reason:"external contact intent requires capability/policy resolution",source,agent};
    }
    return {outcome:"DELEGATE",reason:"specialist ownership matched",source,agent};
  }

  if(/(remind|track|watch|follow up internally|check status|deadline|due)/i.test(text)){
    return {outcome:"HANDLE",reason:"reversible internal coordination",source,agent:"Marie"};
  }

  if(/(decision|priorit|which should|what should we do|conflict|exception)/i.test(text)){
    return {outcome:"ASK_SIMON",reason:"executive prioritization or ambiguity",source};
  }

  return {outcome:"LOG",reason:"retain context; no clear action",source};
}

export function buildSimonBrief(items){
  const rows=(items||[]).map(triageWorkItem);
  const counts=Object.fromEntries(MARIE_OUTCOMES.map(k=>[k,rows.filter(r=>r.outcome===k).length]));
  return {
    counts,
    needs_simon: rows.filter(r=>r.outcome==="ASK_SIMON"),
    needs_kimberly: rows.filter(r=>r.outcome==="ESCALATE_KIMBERLY"),
    delegated: rows.filter(r=>r.outcome==="DELEGATE"),
    handled: rows.filter(r=>r.outcome==="HANDLE")
  };
}
