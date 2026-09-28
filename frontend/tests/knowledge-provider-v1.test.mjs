import assert from "node:assert/strict";
import {PROVIDERS,providerConfigured} from "../lib/simon/provider-registry.mjs";

const firecrawl=PROVIDERS.find(x=>x.provider_name==="Firecrawl"&&x.capability==="web.search");
assert.equal(providerConfigured(firecrawl,{}),false);
assert.equal(providerConfigured(firecrawl,{FIRECRAWL_API_KEY:"configured"}),true);
const omni=PROVIDERS.find(x=>x.provider_name==="OmniRoute");
assert.equal(providerConfigured(omni,{OMNIROUTE_BASE_URL:"http://localhost:9000"}),false);
assert.equal(providerConfigured(omni,{OMNIROUTE_BASE_URL:"http://localhost:9000",OMNIROUTE_API_KEY:"configured"}),true);
const internal=PROVIDERS.find(x=>x.provider_name==="Neon Knowledge");
assert.equal(providerConfigured(internal,{}),true);
assert.ok(PROVIDERS.some(x=>x.provider_name==="Graphify"));
assert.ok(PROVIDERS.some(x=>x.provider_name==="Obsidian Bridge"));
console.log("Knowledge/Provider v1 PASS: internal providers are ready and external providers require explicit configuration.");
