import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { access } from "node:fs/promises";
loadEnvConfig(process.cwd());
import { resolve, sep } from "node:path";
import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI; if (!uri) throw new Error("MONGODB_URI is required.");
const client = new MongoClient(uri); const root = resolve(".private/verification");
let referenced = 0, locallyRecoverable = 0;
async function inspect(key) {
  referenced += 1; const path = resolve(root, key);
  if (!path.startsWith(root + sep)) return;
  try { await access(path); locallyRecoverable += 1; } catch {}
}
try {
  await client.connect(); const db = client.db();
  const identities = db.collection("identityverifications").find({ "documentFile.storageKey": /^development\// }, { projection: { "documentFile.storageKey": 1 } });
  for await (const item of identities) await inspect(item.documentFile?.storageKey);
  const organizations = db.collection("organizationverificationdocuments").find({ "storage.storageKey": /^development\// }, { projection: { "storage.storageKey": 1 } });
  for await (const item of organizations) await inspect(item.storage?.storageKey);
  console.log(JSON.stringify({ legacyReferences: referenced, locallyRecoverable, unrecoverable: referenced - locallyRecoverable }));
  if (referenced) console.warn("Legacy development references are blocked with HTTP 410. Recoverable local files must be manually re-uploaded after identity confirmation; missing files cannot be migrated.");
} finally { await client.close(); }
