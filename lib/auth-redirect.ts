export function safeAuthCallback(value: string | string[] | undefined, fallback = "/dashboard/onboarding") {
  const callback = Array.isArray(value) ? value[0] : value;
  return callback?.startsWith("/") && !callback.startsWith("//") ? callback : fallback;
}
