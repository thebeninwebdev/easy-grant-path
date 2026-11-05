import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { del, list } from "@vercel/blob";
loadEnvConfig(process.cwd());
import { MongoClient } from "mongodb";
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required.");
if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) throw new Error("Private Blob credentials are required.");
const client = new MongoClient(uri);
const now = Date.now(), incomingCutoff = now - 60 * 60 * 1000, orphanCutoff = now - 24 * 60 * 60 * 1000;
let incomingDeleted = 0, orphanDeleted = 0;
async function pages(prefix, visit) { let cursor; do { const page = await list({ prefix, cursor, limit: 1000 }); for (const blob of page.blobs) await visit(blob); cursor = page.hasMore ? page.cursor : undefined; } while (cursor); }
try {
  await client.connect(); const db = client.db();
  await pages("verification/v1/incoming/", async (blob) => { if (new Date(blob.uploadedAt).getTime() < incomingCutoff) { await del(blob.pathname); incomingDeleted += 1; } });
  await pages("verification/v1/documents/", async (blob) => {
    if (new Date(blob.uploadedAt).getTime() >= orphanCutoff) return;
    const [identity, organization] = await Promise.all([
      db.collection("identityverifications").countDocuments({ "documentFile.storageKey": blob.pathname }, { limit: 1 }),
      db.collection("organizationverificationdocuments").countDocuments({ "storage.storageKey": blob.pathname }, { limit: 1 }),
    ]);
    if (!identity && !organization) { await del(blob.pathname); orphanDeleted += 1; }
  });
  console.log(JSON.stringify({ incomingDeleted, orphanDeleted }));
} finally { await client.close(); }
