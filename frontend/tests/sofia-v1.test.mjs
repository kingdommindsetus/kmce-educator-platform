import assert from "node:assert/strict";
import {normalizeChannels,buildGrowthPlan,campaignAttention} from "../lib/simon/sofia-v1.mjs";

assert.deepEqual(normalizeChannels(["LinkedIn","instagram","linkedin","unknown"]),["linkedin","instagram"]);
let p=buildGrowthPlan({objective:"Fill a live CE event",audience:"dentists",service_name:"Craniofacial Biodentistry",channels:["linkedin","youtube"]});
assert.equal(p.ok,true);
assert.equal(p.assets.length,2);
assert.equal(p.assets[1].asset_type,"VIDEO_BRIEF");
p=buildGrowthPlan({objective:"",channels:["linkedin"]});
assert.equal(p.ok,false);
assert.equal(campaignAttention({status:"ACTIVE",draft_count:0,approved_count:0}).needs_attention,true);
assert.equal(campaignAttention({status:"ACTIVE",draft_count:0,approved_count:2}).needs_attention,false);
console.log("Sofia v1 PASS: channel normalization, growth planning, and attention rules are deterministic.");
