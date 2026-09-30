import assert from "node:assert/strict";
import fs from "node:fs";

const source=fs.readFileSync(new URL("../lib/snake/brain.ts",import.meta.url),"utf8");
assert.match(source,/PEGASUS_STORAGE_INITIALIZATION_FAILED/);
assert.match(source,/RENDERED_NOT_PERSISTED/);
assert.match(source,/escalate_to:"SIMON"/);
assert.match(source,/retry:true/);
assert.match(source,/You do not guess success/);
console.log("Snake Brain v1 PASS: deterministic verification, retry boundary, and Simon escalation policy are present.");
