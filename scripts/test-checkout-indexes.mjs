import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  CHECKOUT_INDEX_DEFINITIONS,
  isLegacyCheckoutIndex,
  isReplacementCheckoutIndex,
  sameIndexKeys,
} from "../lib/checkout-index-policy.ts";

assert.equal(CHECKOUT_INDEX_DEFINITIONS.length, 2);

for (const definition of CHECKOUT_INDEX_DEFINITIONS) {
  const legacy = {
    name: definition.legacyName,
    key: definition.legacyKey,
    unique: true,
    sparse: true,
  };
  const replacement = {
    name: definition.replacementName,
    key: definition.replacementKey,
    unique: true,
    partialFilterExpression: { providerTransactionId: { $type: "string" } },
  };

  assert.equal(isLegacyCheckoutIndex(legacy, definition), true);
  assert.equal(isLegacyCheckoutIndex({ ...legacy, unique: false }, definition), false);
  assert.equal(isLegacyCheckoutIndex({ ...legacy, partialFilterExpression: { providerTransactionId: { $type: "string" } } }, definition), false);

  assert.equal(isReplacementCheckoutIndex(replacement, definition), true);
  assert.equal(isReplacementCheckoutIndex({ ...replacement, unique: false }, definition), false);
  assert.equal(isReplacementCheckoutIndex({ ...replacement, partialFilterExpression: { providerTransactionId: { $exists: true } } }, definition), false);
  assert.equal(isReplacementCheckoutIndex({ ...replacement, key: definition.legacyKey }, definition), false);

  // The different key order enables safe build-then-drop migration.
  assert.equal(sameIndexKeys(definition.legacyKey, definition.replacementKey), false);
}

const payments = readFileSync(new URL("../models/Payment.ts", import.meta.url), "utf8");
const services = readFileSync(new URL("../models/ServiceRequest.ts", import.meta.url), "utf8");
const checkout = readFileSync(new URL("../lib/payments.ts", import.meta.url), "utf8");
const migration = readFileSync(new URL("../lib/checkout-index-migration.ts", import.meta.url), "utf8");

assert.match(payments, /partialFilterExpression:\s*\{\s*providerTransactionId:/);
assert.match(services, /partialFilterExpression:\s*\{\s*providerTransactionId:/);
assert.match(checkout, /await ensureCheckoutTransactionIndexes\(\)/);
assert.match(migration, /await collection\.createIndex/);
assert.match(migration, /await collection\.dropIndex/);
assert.ok(migration.indexOf("await collection.createIndex") < migration.indexOf("await collection.dropIndex"), "Create the new unique index before dropping the old one");
console.log("Checkout transaction index policy tests passed");
