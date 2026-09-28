import assert from "node:assert/strict";
import {canBookDiscovery,discoveryOutcome,onboardingChecklist,onboardingProgress} from "../lib/simon/booker-flow-v1.mjs";

let r=canBookDiscovery({pipeline_stage:"INTERESTED",contact_verified_at:"now",scheduled_start:"2026-10-01T14:00:00-04:00"});
assert.equal(r.ok,true);
r=canBookDiscovery({pipeline_stage:"QUALIFIED",contact_verified_at:"now",scheduled_start:"2026-10-01T14:00:00-04:00"});
assert.equal(r.ok,false);
assert.equal(r.reason,"LEAD_NOT_READY_FOR_BOOKING");

assert.equal(discoveryOutcome("INTERESTED").assigned_agent,"Flow");
assert.equal(discoveryOutcome("FOLLOW_UP").assigned_agent,"Echo");
assert.equal(discoveryOutcome("NOT_A_FIT").pipeline_stage,"DISQUALIFIED");

const req=onboardingChecklist("IN_OFFICE_TRAINING");
assert.ok(req.includes("PRACTICE_ADDRESS"));
const p=onboardingProgress(req,req);
assert.equal(p.ready_for_payment,true);
assert.equal(p.missing.length,0);

console.log("Booker + Flow v1 PASS: booking gate, discovery outcomes, and onboarding readiness are deterministic.");
