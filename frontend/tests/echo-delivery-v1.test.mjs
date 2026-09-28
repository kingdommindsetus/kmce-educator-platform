import assert from "node:assert/strict";
import {parseApprovedDraft,extractProviderIds,wantsExternalSend} from "../lib/echo-delivery.mjs";

let p=parseApprovedDraft("Subject: Hello\n\nBody line 1\nBody line 2");
assert.equal(p.ok,true);
assert.equal(p.subject,"Hello");
assert.equal(p.body,"Body line 1\nBody line 2");
assert.equal(parseApprovedDraft("No subject\nBody").ok,false);

assert.deepEqual(extractProviderIds({data:{response_data:{id:"m1",threadId:"t1"}}}),{messageId:"m1",threadId:"t1"});
assert.deepEqual(extractProviderIds({data:{id:"m2",thread_id:"t2"}}),{messageId:"m2",threadId:"t2"});
assert.deepEqual(extractProviderIds({}),{messageId:null,threadId:null});

const hash="abc123";
assert.equal(wantsExternalSend({execute:true,approved_sha256:hash},hash),true);
assert.equal(wantsExternalSend({execute:false,approved_sha256:hash},hash),false);
assert.equal(wantsExternalSend({execute:true,approved_sha256:"wrong"},hash),false);

console.log("Echo controlled delivery PASS: draft parsing, provider id extraction, and exact-hash execution gate work.");
