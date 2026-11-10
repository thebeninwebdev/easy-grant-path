import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";
import { legalCanonical } from "@/lib/legal";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Legal.refund")]);
  const canonical = legalCanonical("refund", locale);
  return { title: t("meta.title"), description: t("meta.description"), alternates: { canonical, languages: { fr: legalCanonical("refund", "fr"), en: legalCanonical("refund", "en"), "x-default": legalCanonical("refund", "fr") } }, openGraph: { title: t("meta.title"), description: t("meta.description"), url: canonical, type: "website", locale: locale === "fr" ? "fr_CI" : "en_GB" } };
}
export default function RefundPolicyPage() { return <LegalPage policy="refund" />; }
