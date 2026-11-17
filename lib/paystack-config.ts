import "server-only";
import { resolvePaystackCredentials, type PaymentEnvironment } from "@/lib/paystack-config-policy";
export type { PaymentEnvironment } from "@/lib/paystack-config-policy";

function validAppUrl(value: string, environment: PaymentEnvironment) {
  try {
    const url = new URL(value);
    return environment === "live" ? url.protocol === "https:" : url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch { return false; }
}

export function getPaystackConfig(requestedEnvironment?: PaymentEnvironment) {
  const credentials = resolvePaystackCredentials(process.env);
  const environment = requestedEnvironment || credentials.activeEnvironment;
  const secretKey = environment === "live" ? credentials.liveSecretKey : environment === "test" ? credentials.testSecretKey : null;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  // PAYSTACK_WEBHOOK_SECRET is the name used in Paystack's current webhook
  // documentation. Keep the former name as a temporary deployment-compatible
  // alias so rotating this integration does not drop webhook verification.
  const environmentWebhookSecret = environment === "live" ? process.env.PAYSTACK_LIVE_WEBHOOK_SECRET : environment === "test" ? process.env.PAYSTACK_TEST_WEBHOOK_SECRET : "";
  const webhookSigningSecret = (environmentWebhookSecret || process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_WEBHOOK_SIGNING_SECRET || "").trim();
  const providerEnabled = (process.env.PAYMENT_PROVIDER || "paystack").trim().toLowerCase() === "paystack";
  const validUrl = environment ? validAppUrl(appUrl, environment) : false;
  return {
    apiBaseUrl: "https://api.paystack.co",
    appUrl,
    environment,
    secretKey,
    webhookSigningSecret,
    validUrl,
    credentialsValid: Boolean(secretKey),
    enabled: Boolean(providerEnabled && secretKey && validUrl),
    providerEnabled,
    liveConfigured: credentials.liveConfigured,
    testConfigured: credentials.testConfigured,
  } as const;
}

export function getPaystackDiagnostics() {
  const config = getPaystackConfig();
  return { paymentProvider: "paystack" as const, activeEnvironment: config.environment, liveConfigured: config.liveConfigured, testConfigured: config.testConfigured, checkoutAvailable: config.enabled };
}

export function assertPaystackConfig(environment?: PaymentEnvironment) {
  const config = getPaystackConfig(environment);
  if (!config.enabled) throw new Error("Paystack is not safely configured for this deployment environment.");
  return config;
}

export function assertPaystackCredentials(environment: PaymentEnvironment) {
  const config = getPaystackConfig(environment);
  if (!config.credentialsValid || !config.secretKey) throw new Error(`Paystack ${environment} credentials are unavailable.`);
  return { ...config, environment, secretKey: config.secretKey };
}
