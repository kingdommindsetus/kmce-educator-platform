import assert from "node:assert/strict";
import {paymentReceiptEntries,revenueRecognitionEntries,verifyBalanced,entitlementDecision,ceEligibility} from "../lib/simon/ledger-delivery-v1.mjs";

let entries=paymentReceiptEntries(150000,"usd");
assert.equal(verifyBalanced(entries).balanced,true);
assert.equal(entries[0].account_code,"STRIPE_CLEARING");
assert.equal(entries[1].account_code,"UNEARNED_REVENUE");

entries=revenueRecognitionEntries(150000,"usd");
assert.equal(verifyBalanced(entries).balanced,true);
assert.equal(entries[1].account_code,"SALES_REVENUE");

assert.equal(entitlementDecision({transaction_status:"succeeded",service_code:"IN_OFFICE_TRAINING"}).grant,true);
assert.equal(entitlementDecision({transaction_status:"failed",service_code:"IN_OFFICE_TRAINING"}).grant,false);

let ce=ceEligibility({ce_hours:12,attendance_verified:true,assessment_passed:true,evaluation_completed:true});
assert.equal(ce.eligible,true);
ce=ceEligibility({ce_hours:12,attendance_verified:true,assessment_passed:false,evaluation_completed:true});
assert.equal(ce.eligible,false);

console.log("Ledger + Delivery/CE v1 PASS: journals balance, entitlements gate on paid services, CE eligibility is evidence-based.");
