import assert from "node:assert/strict";
import {buildVerifiedOutreachDraft} from "../lib/simon/maven-v1.mjs";

let r=buildVerifiedOutreachDraft({
  practice_name:"Airway Dental",
  decision_maker:"Dr. Jane Doe",
  city:"Media",
  state:"PA",
  qualification_score:88,
  pipeline_stage:"QUALIFIED",
  contact_source_url:"https://airway.example/contact",
  contact_verified_at:"2026-09-28T00:00:00Z"
});
assert.equal(r.ok,true);
assert.match(r.draft,/Airway Dental/);
assert.match(r.draft,/Dr\. Jane Doe/);
assert.equal(r.facts_used.contact_verified,true);

r=buildVerifiedOutreachDraft({practice_name:"Weak Lead",qualification_score:50,pipeline_stage:"QUALIFIED"});
assert.equal(r.ok,false);
assert.equal(r.reason,"QUALIFICATION_SCORE_TOO_LOW");

r=buildVerifiedOutreachDraft({practice_name:"Unverified",qualification_score:90,pipeline_stage:"QUALIFIED"});
assert.equal(r.ok,false);
assert.equal(r.reason,"CONTACT_NOT_VERIFIED");

r=buildVerifiedOutreachDraft({practice_name:"Wrong Stage",qualification_score:90,pipeline_stage:"ENRICHED",contact_source_url:"https://x.example",contact_verified_at:"now"});
assert.equal(r.ok,false);
assert.equal(r.reason,"LEAD_NOT_QUALIFIED");

console.log("Maven + Echo v1 PASS: drafts require qualified, verified leads and use only persisted facts.");
