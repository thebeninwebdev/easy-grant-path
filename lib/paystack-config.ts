import "server-only";

export type PaymentEnvironment = "test" | "live";

function paymentEnvironment(): PaymentEnvironment {
  // TEMPORARY: Force Paystack test mode during integration testing.
  // Restore production environment detection before accepting real payments.
  return "test";
}

function validAppUrl(value: string, environment: PaymentEnvironment) {
  try {
    const url = new URL(value);
    return environment === "live" ? url.protocol === "https:" : url.protocol === "https:" || (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname));
  } catch { return false; }
}

export function getPaystackConfig() {
  const environment = paymentEnvironment();
  const secretKey = (process.env.PAYSTACK_SECRET_KEY || "").trim();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").trim().replace(/\/$/, "");
  // PAYSTACK_WEBHOOK_SECRET is the name used in Paystack's current webhook
  // documentation. Keep the former name as a temporary deployment-compatible
  // alias so rotating this integration does not drop webhook verification.
  const webhookSigningSecret = (process.env.PAYSTACK_WEBHOOK_SECRET || process.env.PAYSTACK_WEBHOOK_SIGNING_SECRET || "").trim();
  const providerEnabled = (process.env.PAYMENT_PROVIDER || "paystack").trim().toLowerCase() === "paystack";
  const keyMatchesEnvironment = environment === "live" ? /^sk_live_[A-Za-z0-9]+$/.test(secretKey) : /^sk_test_[A-Za-z0-9]+$/.test(secretKey);
  return {
    apiBaseUrl: "https://api.paystack.co",
    appUrl,
    environment,
    secretKey,
    webhookSigningSecret,
    validUrl: validAppUrl(appUrl, environment),
    credentialsValid: keyMatchesEnvironment,
    enabled: providerEnabled && keyMatchesEnvironment && validAppUrl(appUrl, environment),
  } as const;
}

export function assertPaystackConfig() {
  const config = getPaystackConfig();
  if (!config.enabled) throw new Error("Paystack is not safely configured for this deployment environment.");
  return config;
}