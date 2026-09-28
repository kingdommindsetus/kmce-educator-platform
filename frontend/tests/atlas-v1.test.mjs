import assert from "node:assert/strict";
import {qualifyLead} from "../lib/simon/atlas-v1.mjs";

let r=qualifyLead({
  research_confidence:85,
  contact_verified_at:"2026-09-28T00:00:00Z",
  decision_maker:"Dr. Jane Doe",
  website:"https://example.com",
  evidence_count:3,
  official_evidence_count:1
});
assert.equal(r.decision,"QUALIFY");
assert.ok(r.score>=75);

r=qualifyLead({
  research_confidence:62,
  contact_verified_at:null,
  decision_maker:"Dr. Jane Doe",
  website:"https://example.com",
  evidence_count:2,
  official_evidence_count:1
});
assert.equal(r.decision,"HOLD");
assert.ok(r.reasons.includes("contact not verified"));

r=qualifyLead({
  research_confidence:10,
  contact_verified_at:null,
  decision_maker:null,
  website:null,
  evidence_count:0,
  official_evidence_count:0
});
assert.equal(r.decision,"REJECT");

console.log("Atlas v1 PASS: evidence-backed scoring yields QUALIFY/HOLD/REJECT deterministically.");
