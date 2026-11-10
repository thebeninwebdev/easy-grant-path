import type { Metadata } from "next";
import { Suspense } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { Homepage } from "@/components/home/homepage";
import { OpportunityShowcase, OpportunityShowcaseSkeleton, type HomepageOpportunity } from "@/components/home/opportunity-showcase";
import { getCurrentSession } from "@/lib/development-user";
import { authenticatedDestination } from "@/lib/auth-navigation";
import { getPublicOpportunities, parsePublicOpportunityFilters } from "@/lib/public-opportunities";
import { formatCurrency, formatDate } from "@/lib/i18n-format";
import { localizedPath } from "@/i18n/paths";
import type { SupportedLocale } from "@/lib/config";
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const [locale, t] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Home.meta")]);
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://easygrantpath.com").replace(/\/$/, "");
  const canonical = locale === "en" ? base + "/en" : base + "/";
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical, languages: { fr: base + "/", en: base + "/en", "x-default": base + "/" } },
    openGraph: { title: t("title"), description: t("description"), url: canonical, locale: locale === "fr" ? "fr_CI" : "en_GB", alternateLocale: locale === "fr" ? ["en_GB"] : ["fr_CI"], type: "website" },
  };
}

async function loadOpportunities(): Promise<HomepageOpportunity[]> {
  const [locale, t] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations()]);
  try {
    const result = await getPublicOpportunities(parsePublicOpportunityFilters({ sort: "deadline" }), locale);
    return result.items.slice(0, 4).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      organization: item.organization || item.agency || t("Home.showcase.fundingPartner"),
      type: t(("Opportunities.types." + item.type) as never),
      location: item.eligibleCountries[0] || item.countries[0] || t("Home.showcase.westAfrica"),
      sector: item.sectors[0] || t("Home.showcase.crossSector"),
      funding: item.fundingMax !== null || item.fundingMin !== null ? formatCurrency(item.fundingMax ?? item.fundingMin!, item.currency, locale, { notation: "compact", maximumFractionDigits: 1 }) : t("Home.showcase.seeFundingDetails"),
      deadline: item.deadline ? formatDate(item.deadline, locale, { month: "short" }) : t("Common.rollingDeadline"),
    }));
  } catch { return []; }
}
async function StreamingOpportunityShowcase() { return <OpportunityShowcase opportunities={await loadOpportunities()} />; }
async function AuthenticatedHomeRedirect() {
  const locale = await getLocale() as SupportedLocale;
  const destination = authenticatedDestination(await getCurrentSession());
  if (destination) redirect(localizedPath(destination, locale));
  return null;
}
export default function Home() {
  return <><Suspense fallback={null}><AuthenticatedHomeRedirect /></Suspense><Homepage opportunityShowcase={<Suspense fallback={<OpportunityShowcaseSkeleton />}><StreamingOpportunityShowcase /></Suspense>} /></>;
}
