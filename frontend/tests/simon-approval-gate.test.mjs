import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const sha=(text)=>createHash("sha256").update(String(text)).digest("hex");

function edit(job,draft){
  assert.equal(job.status,"PENDING_APPROVAL");
  return {...job,draft_content:draft,draft_sha256:sha(draft),draft_version:job.draft_version+1,approved_sha256:null,approved_by:null,approved_at:null};
}
function approve(job,expectedHash){
  const actual=sha(job.draft_content);
  if(!expectedHash)return {ok:false,status:409,error:"Current draft hash required. Reload before approving.",job};
  if(expectedHash!==actual)return {ok:false,status:409,error:"Draft changed since review. Reload before approving.",job};
  return {ok:true,status:200,sent:false,job:{...job,status:"APPROVED",draft_sha256:actual,approved_sha256:actual,approved_by:"Synthetic Founder",approved_at:"TEST_TIME"},activity:{action:"OUTREACH_APPROVED",detail:`Founder approved exact outreach draft SHA-256 ${actual}. No message was sent.`}};
}

let job={id:11,status:"PENDING_APPROVAL",draft_content:"Initial synthetic draft for PR #30 approval proof.",draft_sha256:null,draft_version:1,approved_sha256:null,approved_by:null,approved_at:null,sent_at:null,provider_message_id:null};
job=edit(job,"Synthetic draft A"); const h1=job.draft_sha256;
job=edit(job,"Edited synthetic draft — PR30 stale hash proof."); const h2=job.draft_sha256;
assert.notEqual(h1,h2); assert.equal(job.draft_version,3);

const missing=approve(job,null);
assert.equal(missing.status,409); assert.equal(missing.job.status,"PENDING_APPROVAL");

const stale=approve(job,h1);
assert.equal(stale.status,409); assert.equal(stale.job.status,"PENDING_APPROVAL"); assert.equal(stale.job.approved_sha256,null);

const exact=approve(job,h2);
assert.equal(exact.status,200); assert.equal(exact.sent,false); assert.equal(exact.job.status,"APPROVED"); assert.equal(exact.job.approved_sha256,h2);
assert.equal(exact.job.sent_at,null); assert.equal(exact.job.provider_message_id,null); assert.equal(exact.activity.action,"OUTREACH_APPROVED"); assert.match(exact.activity.detail,/No message was sent/);

console.log("Simon approval proof PASS: missing hash blocked; stale H1 blocked; exact H2 approved; audit produced; zero send.");
