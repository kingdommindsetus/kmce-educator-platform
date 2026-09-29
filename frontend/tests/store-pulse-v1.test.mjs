import assert from "node:assert/strict";
import {evaluateStorePulse} from "../lib/simon/store-pulse.mjs";

let r=evaluateStorePulse(null,"DAILY",new Date("2026-09-29T12:00:00Z"));
assert.equal(r.pulse_status,"NO_DATA");
assert.equal(r.actions[0].agent,"Alice");

r=evaluateStorePulse({
  products_active:12,
  email_campaigns_7d:1,
  social_posts_7d:3,
  new_products_14d:2,
  orders_count:4,
  sessions:200,
  last_campaign_at:"2026-09-27T12:00:00Z",
  last_product_publish_at:"2026-09-25T12:00:00Z"
},"WEEKLY",new Date("2026-09-29T12:00:00Z"));
assert.equal(r.pulse_status,"GREEN");
assert.equal(r.actions.length,0);

r=evaluateStorePulse({
  products_active:8,
  email_campaigns_7d:0,
  social_posts_7d:0,
  new_products_14d:0,
  orders_count:0,
  sessions:150,
  last_campaign_at:"2026-09-15T12:00:00Z",
  last_product_publish_at:"2026-09-01T12:00:00Z"
},"WEEKLY",new Date("2026-09-29T12:00:00Z"));
assert.equal(r.pulse_status,"RED");
assert.ok(r.actions.some(x=>x.agent==="Snake"));
assert.ok(r.actions.some(x=>x.agent==="Alice"));
assert.ok(r.actions.some(x=>x.agent==="Devon"));
assert.ok(r.actions.some(x=>x.agent==="Mercedes"));

console.log("Store Pulse PASS: no-data, healthy, stale, and conversion-risk states are deterministic.");
