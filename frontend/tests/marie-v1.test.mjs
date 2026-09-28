import assert from "node:assert/strict";
import {CAPABILITIES, AUTHORITY, canAutoExecute} from "../lib/simon/capability-registry.mjs";
import {triageWorkItem, buildSimonBrief} from "../lib/simon/marie-v1.mjs";

assert.equal(CAPABILITIES["knowledge.search"].provider,"Obsidian");
assert.equal(CAPABILITIES["relationship.search"].provider,"Graphify");
assert.equal(CAPABILITIES["llm.generate"].provider,"OmniRoute");
assert.equal(CAPABILITIES["authority.change_self"].authority,AUTHORITY.FORBIDDEN);
assert.equal(canAutoExecute("business.search"),true);
assert.equal(canAutoExecute("outreach.send"),false);

let x=triageWorkItem({text:"Find 50 dental practices in Bucks County",source:"SIMON"});
assert.equal(x.outcome,"DELEGATE");
assert.equal(x.agent,"Scout");

x=triageWorkItem({text:"Research and verify the owner of this practice",source:"SIMON"});
assert.equal(x.outcome,"DELEGATE");
assert.equal(x.agent,"Claire");

x=triageWorkItem({text:"Build a LinkedIn and Instagram content plan",source:"SIMON"});
assert.equal(x.outcome,"DELEGATE");
assert.equal(x.agent,"Sofia");

x=triageWorkItem({text:"Track this deadline and check status tomorrow",source:"SIMON"});
assert.equal(x.outcome,"HANDLE");
assert.equal(x.agent,"Marie");

x=triageWorkItem({text:"Send the approved outreach email",source:"SIMON",capability:"outreach.send"});
assert.equal(x.outcome,"ESCALATE_KIMBERLY");

x=triageWorkItem({text:"Refund the customer $500",source:"SIMON"});
assert.equal(x.outcome,"ESCALATE_KIMBERLY");

x=triageWorkItem({text:"Change the bank account for payouts",source:"SIMON"});
assert.equal(x.outcome,"ESCALATE_KIMBERLY");

x=triageWorkItem({text:"Issue CE after completion",source:"SIMON",capability:"ce.issue"});
assert.equal(x.outcome,"ASK_SIMON");

x=triageWorkItem({text:"Use some new mystery connector",source:"SIMON",capability:"mystery.execute"});
assert.equal(x.outcome,"ASK_SIMON");

const brief=buildSimonBrief([
  {text:"Find dental leads"},
  {text:"Research this practice"},
  {text:"Track this deadline"},
  {text:"Refund $250"},
  {text:"What should we prioritize?"}
]);
assert.equal(brief.delegated.length,2);
assert.equal(brief.handled.length,1);
assert.equal(brief.needs_kimberly.length,1);
assert.equal(brief.needs_simon.length,1);

console.log("Marie v1 PASS: registry resolved; specialist routing works; internal coordination allowed; payment/security authority escalated.");
