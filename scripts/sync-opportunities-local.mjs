import nextEnv from "@next/env";
import process from "node:process";

const { loadEnvConfig } = nextEnv;
const projectDir = process.cwd();
const loaded = loadEnvConfig(projectDir, process.env.NODE_ENV !== "production");
const configuredUrl = process.env.LOCAL_SYNC_URL || "http://127.0.0.1:3000/api/internal/opportunities/sync";
const secret = process.env.SYNC_SECRET;
const requested = process.argv.slice(2).filter(Boolean);
const sources = requested.length ? requested : ["grants-gov", "ecowas", "undp", "afdb-accf", "un-mptf"];

function secretProblem(value) {
  if (!value) return "missing";
  if (value.length < 32) return "shorter than 32 characters";
  if (value !== value.trim() || /[\r\n]/.test(value)) return "contains leading/trailing whitespace or a line break";
  return null;
}

const localSecretProblem = secretProblem(secret);
if (localSecretProblem) {
  console.error(`SYNC_SECRET is ${localSecretProblem} after Next environment loading. Check the project .env.local file; the secret value is not printed.`);
  process.exit(1);
}
console.log(`Environment: loaded ${loaded.loadedEnvFiles.map((file) => file.path).join(", ") || "no .env files"}; SYNC_SECRET is configured.`);

for (const source of sources) {
  try {
    const response = await fetch(configuredUrl, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
      body: JSON.stringify({ source }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const reason = payload?.error?.diagnostic?.reason;
      const suffix = reason ? ` (${reason})` : "";
      const category = response.status === 401 ? "authentication failure" : response.status === 400 ? "unsupported source" : response.status === 503 ? "server configuration or MongoDB availability" : "sync operation failure";
      console.error(`${source}: ${category}: HTTP ${response.status} ${payload?.error?.code || "REQUEST_FAILED"}${suffix}`);
      if (response.status === 401) console.error("The local CLI loaded a valid secret, but the server rejected it. Next gives an inherited SYNC_SECRET precedence over .env.local; start the server without a stale inherited SYNC_SECRET.");
      process.exitCode = 1;
      continue;
    }
    const data = payload?.data;
    console.log(`${source}: authorization succeeded; ${data?.status || "unknown"} fetched=${data?.fetched ?? 0} created=${data?.created ?? 0} updated=${data?.updated ?? 0} skipped=${data?.skipped ?? 0} irrelevant=${data?.irrelevant ?? 0} failed=${data?.failed ?? 0}`);
  } catch (error) {
    console.error(`${source}: endpoint unreachable at ${configuredUrl}: ${error instanceof Error ? error.message : "unknown error"}`);
    process.exitCode = 1;
  }
}