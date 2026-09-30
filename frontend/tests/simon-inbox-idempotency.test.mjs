import assert from "node:assert/strict";
import { idempotencyKey } from "../lib/simon/autonomy-core.mjs";

const a=idempotencyKey(["inbox_ingest","gmail","kim@example.com","abc123","v1"]);
const b=idempotencyKey(["inbox_ingest","gmail","kim@example.com","abc123","v1"]);
const c=idempotencyKey(["inbox_ingest","gmail","kim@example.com","abc124","v1"]);

assert.equal(a,b,"same provider/account/message must dedupe");
assert.notEqual(a,c,"different message id must not collide");
console.log("simon inbox idempotency gate passed");
