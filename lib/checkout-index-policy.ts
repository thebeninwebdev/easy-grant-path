/**
 * A compound sparse index still includes a document if the first indexed key
 * (provider) exists, even when providerTransactionId is absent.
 *
 * These replacement indexes only enforce uniqueness for actual transaction IDs.
 * Reverse key order to allow a new index to coexist with the legacy index
 * while migrating without a window of reduced uniqueness enforcement.
 */
export const CHECKOUT_INDEX_DEFINITIONS = [
  {
    collection: "payments",
    legacyName: "provider_1_providerTransactionId_1",
    legacyKey: { provider: 1, providerTransactionId: 1 },
    replacementName: "providerTransactionId_1_provider_1_unique_present",
    replacementKey: { providerTransactionId: 1, provider: 1 },
  },
  {
    collection: "servicerequests",
    legacyName: "paymentProvider_1_providerTransactionId_1",
    legacyKey: { paymentProvider: 1, providerTransactionId: 1 },
    replacementName: "providerTransactionId_1_paymentProvider_1_unique_present",
    replacementKey: { providerTransactionId: 1, paymentProvider: 1 },
  },
] as const;

export type CheckoutIndexDefinition = (typeof CHECKOUT_INDEX_DEFINITIONS)[number];

export type ExistingCheckoutIndex = {
  name?: string;
  key?: Record<string, unknown>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: Record<string, unknown>;
};

export function sameIndexKeys(actual: Record<string, unknown> | undefined, expected: Record<string, number>): boolean {
  if (!actual) return false;
  const a = Object.entries(actual);
  const b = Object.entries(expected);
  return a.length === b.length && a.every(([key, value], i) => key === b[i][0] && value === b[i][1]);
}

export function isLegacyCheckoutIndex(index: ExistingCheckoutIndex, definition: CheckoutIndexDefinition): boolean {
  return (
    index.name === definition.legacyName &&
    index.unique === true &&
    sameIndexKeys(index.key, definition.legacyKey) &&
    !index.partialFilterExpression
  );
}

export function isReplacementCheckoutIndex(index: ExistingCheckoutIndex, definition: CheckoutIndexDefinition): boolean {
  const idFilter = index.partialFilterExpression?.providerTransactionId;
  return (
    index.name === definition.replacementName &&
    index.unique === true &&
    sameIndexKeys(index.key, definition.replacementKey) &&
    idFilter !== null &&
    typeof idFilter === "object" &&
    !Array.isArray(idFilter) &&
    (idFilter as Record<string, unknown>).$type === "string"
  );
}
