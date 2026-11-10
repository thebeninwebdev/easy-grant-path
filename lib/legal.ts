import type { SupportedLocale } from "@/lib/config";

export type LegalPolicy = "terms" | "privacy" | "refund";

export const legalConfig = {
  supportEmail: "support@easygrantpath.com",
  lastUpdated: "2026-11-10",
  publicOrigin: "https://www.easygrantpath.com",
} as const;

export function legalPath(policy: LegalPolicy) {
  return policy === "refund" ? "/refund-policy" : `/${policy}`;
}

export function legalCanonical(policy: LegalPolicy, locale: SupportedLocale) {
  const path = legalPath(policy);
  return `${legalConfig.publicOrigin}${locale === "en" ? "/en" : ""}${path}`;
}
