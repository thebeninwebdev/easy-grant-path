import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { list } from "@vercel/blob";
loadEnvConfig(process.cwd());
if (!process.env.BLOB_READ_WRITE_TOKEN && !(process.env.VERCEL_OIDC_TOKEN && process.env.BLOB_STORE_ID)) throw new Error("Private Blob credentials are not configured.");
await list({ prefix: "verification/v1/", limit: 1 });
console.log("private verification storage is available");
