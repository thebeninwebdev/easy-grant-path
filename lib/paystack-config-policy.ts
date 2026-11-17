export type PaymentEnvironment = "test" | "live";
export type PaystackEnvironmentSource = Record<string, string | undefined>;

const clean = (value?: string) => (value || "").trim();

export function isValidPaystackSecretKey(value: string, environment: PaymentEnvironment) {
  return new RegExp(`^sk_${environment}_[A-Za-z0-9]+$`).test(clean(value));
}

export function resolvePaystackCredentials(source: PaystackEnvironmentSource) {
  const explicitLive = clean(source.PAYSTACK_LIVE_SECRET_KEY);
  const explicitTest = clean(source.PAYSTACK_TEST_SECRET_KEY);
  const legacy = clean(source.PAYSTACK_SECRET_KEY);
  const liveSecretKey = isValidPaystackSecretKey(explicitLive, "live") ? explicitLive : isValidPaystackSecretKey(legacy, "live") ? legacy : null;
  const testSecretKey = isValidPaystackSecretKey(explicitTest, "test") ? explicitTest : isValidPaystackSecretKey(legacy, "test") ? legacy : null;
  const activeEnvironment: PaymentEnvironment | null = liveSecretKey ? "live" : testSecretKey ? "test" : null;
  return { activeEnvironment, liveConfigured: Boolean(liveSecretKey), testConfigured: Boolean(testSecretKey), liveSecretKey, testSecretKey };
}
