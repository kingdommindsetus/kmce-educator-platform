export type SnakeSeverity="GREEN"|"YELLOW"|"RED";
export type SnakeWorkflowStatus="PASS"|"FAIL"|"INCONCLUSIVE";

export type SnakeEvidence={
  workflow:string;
  run_id:string;
  started_at:string;
  finished_at:string;
  duration_ms:number;
  ui_state?:string|null;
  failure_stage?:string|null;
  render_ok:boolean;
  persisted_ok:boolean;
  network_errors:Array<{url?:string;status?:number;message?:string}>;
  console_errors:string[];
  notes?:string[];
};

export type SnakeDecision={
  status:SnakeWorkflowStatus;
  severity:SnakeSeverity;
  code:string;
  summary:string;
  retry:boolean;
  escalate_to:"NONE"|"SIMON";
  required_next_evidence:string[];
};

export const SNAKE_SYSTEM_PROMPT = [
  "You are Snake, Growth & Reliability Operations for Kingdom Mindset CE.",
  "Your job is to measure whether production workflows actually work, detect stagnation or failure, gather evidence, and trigger the correct internal follow-up.",
  "You do not guess success. A workflow passes only when the expected user-visible result exists AND required persistence is verified.",
  "You separate browser/tool failure from application failure.",
  "You prefer deterministic evidence over narrative explanations.",
  "You may retry one time when evidence suggests a transient browser/network failure.",
  "You must escalate to Simon when the failure is cross-system, ambiguous after one controlled retry, security-related, destructive, or requires authority Snake does not have.",
  "You never publish, send campaigns, spend money, change pricing, alter permissions, delete records, or bypass approval gates.",
  "When reporting a failure, identify the exact stage, observed evidence, confidence, and next action."
].join("\n");

export function evaluateSnakeEvidence(e:SnakeEvidence):SnakeDecision{
  const hasHardNetwork=e.network_errors.some(x=>Number(x.status||0)>=500);
  const browserOnly=!e.render_ok && !hasHardNetwork && e.console_errors.length===0 && !e.failure_stage;

  if(e.render_ok && e.persisted_ok){
    return {status:"PASS",severity:"GREEN",code:"WORKFLOW_VERIFIED",summary:"Expected result rendered and persistence was verified.",retry:false,escalate_to:"NONE",required_next_evidence:[]};
  }
  if(browserOnly){
    return {status:"INCONCLUSIVE",severity:"YELLOW",code:"BROWSER_EVIDENCE_INCOMPLETE",summary:"The browser run did not prove an application failure.",retry:true,escalate_to:"NONE",required_next_evidence:["repeat browser run in a fresh isolated session","capture network and console evidence"]};
  }
  if(!e.render_ok && e.failure_stage==="storage_initialization"){
    return {status:"FAIL",severity:"RED",code:"PEGASUS_STORAGE_INITIALIZATION_FAILED",summary:"Pegasus did not complete storage initialization, so the blueprint workflow could not finish.",retry:false,escalate_to:"SIMON",required_next_evidence:["failing request URL/status","server-side error or trace id","persistence check"]};
  }
  if(e.render_ok && !e.persisted_ok){
    return {status:"FAIL",severity:"RED",code:"RENDERED_NOT_PERSISTED",summary:"The UI rendered output but the expected persisted record was not verified.",retry:false,escalate_to:"SIMON",required_next_evidence:["record lookup result","request/response creating the record"]};
  }
  if(hasHardNetwork){
    return {status:"FAIL",severity:"RED",code:"SERVER_OR_API_FAILURE",summary:"A server/API failure prevented reliable completion.",retry:false,escalate_to:"SIMON",required_next_evidence:["server error body or trace id","affected endpoint","persistence state"]};
  }
  return {status:"INCONCLUSIVE",severity:"YELLOW",code:"NEEDS_MORE_EVIDENCE",summary:"Current evidence is insufficient to prove success or isolate the failure.",retry:true,escalate_to:"NONE",required_next_evidence:["fresh isolated replay","network errors","console errors","render check","persistence check"]};
}
