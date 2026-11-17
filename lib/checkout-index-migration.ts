import "server-only";
import { connectToDatabase } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  CHECKOUT_INDEX_DEFINITIONS,
  isLegacyCheckoutIndex,
  isReplacementCheckoutIndex,
  type ExistingCheckoutIndex,
} from "@/lib/checkout-index-policy";

let initialized: Promise<void> | null = null;

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("code" in error)) return undefined;
  const code = error.code;
  return typeof code === "number" || typeof code === "string" ? String(code) : undefined;
}

function hasMongoCode(error: unknown, code: number): boolean {
  return errorCode(error) === String(code);
}

/**
 * One-time, idempotent migration for older compound sparse indexes.
 *
 * IMPORTANT: create the new partial unique index *before* dropping the
 * legacy one, so verified transaction IDs remain protected throughout.
 * The new key order is reversed to coexist with the old key pattern safely.
 */
async function migrateCheckoutIndexes() {
  const connection = await connectToDatabase();
  const db = connection.connection.db;
  if (!db) throw new Error("MongoDB database is not connected");

  for (const definition of CHECKOUT_INDEX_DEFINITIONS) {
    const collection = db.collection(definition.collection);
    let indexes: ExistingCheckoutIndex[];

    try {
      indexes = await collection.indexes();
    } catch (error) {
      // A fresh installation may not yet have a ServiceRequest collection.
      if (!hasMongoCode(error, 26)) throw error;
      indexes = [];
    }

    const oldIndex = indexes.find((index) => index.name === definition.legacyName);
    if (oldIndex && !isLegacyCheckoutIndex(oldIndex, definition)) {
      throw new Error(`Unexpected legacy index configuration for ${definition.collection}`);
    }

    const replacement = indexes.find((index) => index.name === definition.replacementName);
    if (replacement && !isReplacementCheckoutIndex(replacement, definition)) {
      throw new Error(`Unexpected replacement index configuration for ${definition.collection}`);
    }

    if (!replacement) {
      await collection.createIndex(definition.replacementKey, {
        name: definition.replacementName,
        unique: true,
        partialFilterExpression: { providerTransactionId: { $type: "string" } },
      });
    }

    if (oldIndex) {
      try {
        await collection.dropIndex(definition.legacyName);
        logger.info("Migrated legacy transaction index", {
          collection: definition.collection,
          index: definition.legacyName,
        });
      } catch (error) {
        // Two serverless instances may race to finish the same migration.
        if (!hasMongoCode(error, 27)) throw error;
      }
    }
  }
}

/**
 * Called before payment creation. Multiple concurrent checkouts in a single
 * instance await the same promise. Failed migrations can safely be retried.
 *
 * Do not allow payment creation with the legacy index still present.
 */
export function ensureCheckoutTransactionIndexes(): Promise<void> {
  if (!initialized) {
    initialized = migrateCheckoutIndexes().catch((error: unknown) => {
      initialized = null;
      logger.error("Checkout index migration failed", {
        errorName: error instanceof Error ? error.name : typeof error,
        errorCode: errorCode(error),
      });
      throw new AppError(
        "Payments are temporarily unavailable while the payment database is being prepared.",
        "PAYMENT_STORAGE_UNAVAILABLE",
        503,
      );
    });
  }
  return initialized;
}
