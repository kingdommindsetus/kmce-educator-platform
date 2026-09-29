export const AUTONOMY_AUTHORITY=Object.freeze({AUTO:"AUTO",CONTROLLED:"CONTROLLED",POLICY:"POLICY",APPROVAL:"APPROVAL",FORBIDDEN:"FORBIDDEN"});

export const AUTONOMY_CAPABILITIES=Object.freeze({
  "agent.task.ensure":{owner:"Marie",authority:"CONTROLLED"},
  "lead.follow_up.review":{owner:"Echo",authority:"CONTROLLED"},
  "outreach.reply.sync":{owner:"Echo",authority:"CONTROLLED"},
  "onboarding.review":{owner:"Flow",authority:"CONTROLLED"},
  "executive.brief.queue":{owner:"Marie",authority:"CONTROLLED"},
  "growth.campaign.review":{owner:"Sofia",authority:"CONTROLLED"},
  "outreach.send":{owner:"Echo",authority:"APPROVAL"},
  "social.publish":{owner:"Sofia",authority:"APPROVAL"},
  "calendar.book.external":{owner:"Booker",authority:"POLICY"},
  "document.request.external":{owner:"Flow",authority:"APPROVAL"},
  "payment.request.external":{owner:"Ledger",authority:"APPROVAL"},
  "refund.execute":{owner:"Ledger",authority:"APPROVAL"},
  "entitlement.release":{owner:"Delivery/CE",authority:"POLICY"},
  "ce.issue":{owner:"Delivery/CE",authority:"POLICY"},
  "authority.change_self":{owner:"Simon",authority:"FORBIDDEN"},
  "audit.delete":{owner:"Kimberly",authority:"FORBIDDEN"},
  "ledger.rewrite_history":{owner:"Ledger",authority:"FORBIDDEN"}
});

export function resolveAutonomyCapability(name){return AUTONOMY_CAPABILITIES[name]||null}

export function executionDisposition(capability,policyApproved=false){
  const c=resolveAutonomyCapability(capability);
  if(!c)return {status:"DEAD",reason:"UNKNOWN_CAPABILITY"};
  if(c.authority==="FORBIDDEN")return {status:"DEAD",reason:"FORBIDDEN"};
  if(c.authority==="APPROVAL")return {status:"WAITING_APPROVAL",reason:"FOUNDER_APPROVAL_REQUIRED"};
  if(c.authority==="POLICY"&&!policyApproved)return {status:"WAITING_APPROVAL",reason:"POLICY_NOT_SATISFIED"};
  return {status:"RUNNABLE",reason:"AUTHORIZED_INTERNAL"};
}

export function retryDelaySeconds(attempt){
  const n=Math.max(1,Number(attempt)||1);
  return Math.min(3600,Math.pow(2,n-1)*30);
}

export function idempotencyKey(parts=[]){
  return parts.map(x=>String(x??"").trim()).filter(Boolean).join(":").toLowerCase();
}
