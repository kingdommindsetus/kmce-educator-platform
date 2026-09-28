import assert from "node:assert/strict";
import {claireReadiness} from "../lib/simon/lead-intelligence.mjs";
import {qualifyLead} from "../lib/simon/atlas-v1.mjs";
import {buildVerifiedOutreachDraft} from "../lib/simon/maven-v1.mjs";
import {canBookDiscovery,discoveryOutcome,onboardingChecklist,onboardingProgress} from "../lib/simon/booker-flow-v1.mjs";
import {paymentReceiptEntries,verifyBalanced,entitlementDecision,ceEligibility} from "../lib/simon/ledger-delivery-v1.mjs";
import {buildGrowthPlan} from "../lib/simon/sofia-v1.mjs";
import {PROVIDERS,providerConfigured} from "../lib/simon/provider-registry.mjs";

const candidate={practice_name:"Launch Proof Dental",decision_maker:"Dr. Proof",email:"proof@example.com",website:"https://example.com",city:"Media",state:"PA"};
const evidence=[{source_url:"https://example.com",source_type:"OFFICIAL",confidence:90},{source_url:"https://example.org/profile",source_type:"PUBLIC_WEB",confidence:85}];
const claire=claireReadiness(candidate,evidence); assert.equal(claire.ready_for_atlas,true);

const atlas=qualifyLead({...candidate,research_confidence:claire.confidence,contact_verified_at:"now",evidence_count:evidence.length,official_evidence_count:1});
assert.equal(atlas.decision,"QUALIFY"); assert.ok(atlas.score>=75);

const maven=buildVerifiedOutreachDraft({...candidate,pipeline_stage:"QUALIFIED",qualification_score:atlas.score,contact_verified_at:"now",contact_source_url:"https://example.com"});
assert.equal(maven.ok,true); assert.match(maven.draft,/Launch Proof Dental/);

const booker=canBookDiscovery({pipeline_stage:"INTERESTED",contact_verified_at:"now",scheduled_start:"2026-10-01T14:00:00-04:00"}); assert.equal(booker.ok,true);
assert.equal(discoveryOutcome("INTERESTED").assigned_agent,"Flow");

const checklist=onboardingChecklist("IN_OFFICE_TRAINING"); const progress=onboardingProgress(checklist,checklist); assert.equal(progress.ready_for_payment,true);

const receipt=paymentReceiptEntries(87500,"usd"); assert.equal(verifyBalanced(receipt).balanced,true);
assert.equal(entitlementDecision({transaction_status:"succeeded",service_code:"IN_OFFICE_TRAINING"}).grant,true);
assert.equal(ceEligibility({ce_hours:12,attendance_verified:true,assessment_passed:true,evaluation_completed:true}).eligible,true);

const growth=buildGrowthPlan({objective:"Fill CE seats",audience:"dentists",service_name:"KMCE",channels:["linkedin","instagram"]}); assert.equal(growth.ok,true); assert.equal(growth.assets.length,2);
const internal=PROVIDERS.find(x=>x.provider_name==="Neon Knowledge"); assert.equal(providerConfigured(internal,{}),true);

console.log("LAUNCH E2E PASS: Claire → Atlas → Maven → Booker → Flow → Ledger/CE → Sofia/provider contracts agree.");
