import assert from "node:assert/strict";

function evaluateEchoSend(input) {
  if (input.jobStatus === "SENT" || Boolean(input.sentAt)) return {ok:false,status:409,reason:"DUPLICATE_SEND"};
  if (input.jobStatus !== "APPROVED" || input.pipelineStage !== "APPROVED") return {ok:false,status:409,reason:"NOT_APPROVED"};
  if (!input.email || !input.contactSourceUrl || !input.contactVerifiedAt) return {ok:false,status:409,reason:"CONTACT_NOT_VERIFIED"};
  return {ok:true,sendEligible:true,providerConfigured:false,reason:"PROVIDER_DISABLED"};
}

const base={jobStatus:"APPROVED",pipelineStage:"APPROVED",email:"test@example.invalid"};

const unverified=evaluateEchoSend(base);
assert.deepEqual(unverified,{ok:false,status:409,reason:"CONTACT_NOT_VERIFIED"});

const verified=evaluateEchoSend({...base,contactSourceUrl:"https://example.invalid/contact",contactVerifiedAt:new Date()});
assert.equal(verified.ok,true);
assert.equal(verified.sendEligible,true);
assert.equal(verified.providerConfigured,false);
assert.equal(verified.reason,"PROVIDER_DISABLED");

const duplicate=evaluateEchoSend({...base,jobStatus:"SENT",sentAt:new Date(),contactSourceUrl:"https://example.invalid/contact",contactVerifiedAt:new Date()});
assert.deepEqual(duplicate,{ok:false,status:409,reason:"DUPLICATE_SEND"});

console.log("Echo V1 proof PASS: unverified blocked; verified eligible; provider disabled/no send; duplicate blocked.");
