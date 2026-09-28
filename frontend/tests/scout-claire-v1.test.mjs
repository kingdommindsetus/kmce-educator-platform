import assert from "node:assert/strict";
import {normalizeUrl,websiteHost,normalizeCandidate,evidenceConfidence,claireReadiness} from "../lib/simon/lead-intelligence.mjs";

assert.equal(normalizeUrl("example.com/"),"https://example.com");
assert.equal(websiteHost("https://www.Example.com/contact"),"example.com");

const c=normalizeCandidate({
  practice_name:"  Airway Dental  ",
  website:"airwaydental.com/",
  state:"pa",
  email:"INFO@AIRWAYDENTAL.COM",
  source_url:"https://airwaydental.com/contact",
  discovery_source:"FIRECRAWL"
});
assert.equal(c.practice_name,"Airway Dental");
assert.equal(c.website_host,"airwaydental.com");
assert.equal(c.state,"PA");
assert.equal(c.email,"info@airwaydental.com");

assert.equal(evidenceConfidence([{confidence:80},{confidence:60}]),70);

let r=claireReadiness(c,[
  {source_url:"https://airwaydental.com",source_type:"OFFICIAL",confidence:90},
  {source_url:"https://maps.example/airway",source_type:"PUBLIC_WEB",confidence:80}
]);
assert.equal(r.ready_for_atlas,true);
assert.equal(r.confidence,85);
assert.equal(r.checks.sourceCount,2);

r=claireReadiness({practice_name:"No Contact",website:"nocontact.example"},[
  {source_url:"https://nocontact.example",source_type:"OFFICIAL",confidence:90}
]);
assert.equal(r.ready_for_atlas,false);

console.log("Scout + Claire v1 PASS: normalization, host dedupe key, evidence confidence, and Atlas readiness work.");
