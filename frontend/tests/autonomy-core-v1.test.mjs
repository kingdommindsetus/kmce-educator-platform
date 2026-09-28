import assert from "node:assert/strict";
import {executionDisposition,retryDelaySeconds,idempotencyKey} from "../lib/simon/autonomy-core.mjs";

assert.deepEqual(executionDisposition("agent.task.ensure"),{status:"RUNNABLE",reason:"AUTHORIZED_INTERNAL"});
assert.deepEqual(executionDisposition("outreach.send"),{status:"WAITING_APPROVAL",reason:"FOUNDER_APPROVAL_REQUIRED"});
assert.deepEqual(executionDisposition("calendar.book.external"),{status:"WAITING_APPROVAL",reason:"POLICY_NOT_SATISFIED"});
assert.deepEqual(executionDisposition("calendar.book.external",true),{status:"RUNNABLE",reason:"AUTHORIZED_INTERNAL"});
assert.deepEqual(executionDisposition("authority.change_self"),{status:"DEAD",reason:"FORBIDDEN"});
assert.equal(retryDelaySeconds(1),30);
assert.equal(retryDelaySeconds(2),60);
assert.equal(retryDelaySeconds(20),3600);
assert.equal(idempotencyKey(["Lead",42,"Follow Up"]),"lead:42:follow up");
console.log("Autonomy Core v1 PASS: authority, policy, retry, and idempotency rules are deterministic.");
