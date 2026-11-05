import "server-only";
export type PaymentEnvironment = "test" | "live";
function deploymentEnvironment(): PaymentEnvironment {
  if (process.env.VERCEL_ENV === "production") return "live";
  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") return "test";
  return process.env.NODE_ENV === "production" ? "live" : "test";
}
function validSecretKey(key: string, environment: PaymentEnvironment) {
  if (!/^FLWSECK(?:_TEST)?-[A-Za-z0-9_-]+$/.test(key)) return false;
  return environment === "test" ? key.startsWith("FLWSECK_TEST-") : key.startsWith("FLWSECK-") && !key.startsWith("FLWSECK_TEST-");
}
function validPublicKey(key: string, environment: PaymentEnvironment) {
  if (!key) return true;
  if (!/^FLWPUBK(?:_TEST)?-[A-Za-z0-9_-]+$/.test(key)) return false;
  return environment === "test" ? key.startsWith("FLWPUBK_TEST-") : key.startsWith("FLWPUBK-") && !key.startsWith("FLWPUBK_TEST-");
}
export function getFlutterwaveConfig() {
  const environment = deploymentEnvironment();
  const secretKey = (process.env.FLW_SECRET_KEY || "").trim();
  const publicKey = (process.env.FLW_PUBLIC_KEY || "").trim();
  const webhookSecret = (process.env.FLW_WEBHOOK_SECRET || "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  let validUrl = false;
  try { const url = new URL(appUrl); validUrl = environment === "live" ? url.protocol === "https:" : url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)); } catch {}
  const credentialsValid = validSecretKey(secretKey, environment) && validPublicKey(publicKey, environment);
  return { apiBaseUrl: "https://api.flutterwave.com/v3", appUrl, credentialsValid, enabled: credentialsValid && webhookSecret.length >= 16 && validUrl, environment, publicKey: publicKey || null, secretKey, webhookSecret, validUrl } as const;
}
export function assertFlutterwaveConfig() {
  const config = getFlutterwaveConfig();
  if (!config.enabled) throw new Error("Flutterwave is not safely configured for this deployment environment.");
  return config;
}