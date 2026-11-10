import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { LegalPage } from "@/components/legal/legal-page";
import { legalCanonical } from "@/lib/legal";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Legal.privacy")]);
  const canonical = legalCanonical("privacy", locale);
  return { title: t("meta.title"), description: t("meta.description"), alternates: { canonical, languages: { fr: legalCanonical("privacy", "fr"), en: legalCanonical("privacy", "en"), "x-default": legalCanonical("privacy", "fr") } }, openGraph: { title: t("meta.title"), description: t("meta.description"), url: canonical, type: "website", locale: locale === "fr" ? "fr_CI" : "en_GB" } };
}
export default function PrivacyPage() { return <LegalPage policy="privacy" />; }
