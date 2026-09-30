import assert from "node:assert/strict";
import { idempotencyKey } from "../lib/simon/autonomy-core.mjs";

const a=idempotencyKey({capability:"inbox_ingest",resourceId:"gmail:kim@example.com:abc123",version:1});
const b=idempotencyKey({capability:"inbox_ingest",resourceId:"gmail:kim@example.com:abc123",version:1});
const c=idempotencyKey({capability:"inbox_ingest",resourceId:"gmail:kim@example.com:abc124",version:1});

assert.equal(a,b,"same provider/account/message must dedupe");
assert.notEqual(a,c,"different message id must not collide");
console.log("simon inbox idempotency gate passed");
