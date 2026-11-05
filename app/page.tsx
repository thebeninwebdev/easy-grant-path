import type { Metadata } from "next";
import { Suspense } from "react";
import { Homepage } from "@/components/home/homepage";
import { OpportunityShowcase, OpportunityShowcaseSkeleton, type HomepageOpportunity } from "@/components/home/opportunity-showcase";
import { getPublicOpportunities, parsePublicOpportunityFilters } from "@/lib/public-opportunities";

export const metadata: Metadata = {
  title: "Funding opportunities for ambitious people in West Africa",
  description: "Discover credible grants, fellowships, scholarships, and professional application support with EasyGrantPath.",
};

function formatMoney(value: number | null, currency: string) {
  if (value === null) return null;
  return new Intl.NumberFormat("en", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDeadline(value: string | null) {
  if (!value) return "Rolling deadline";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

async function loadOpportunities(): Promise<HomepageOpportunity[]> {
  try {
    const result = await getPublicOpportunities(parsePublicOpportunityFilters({ sort: "deadline" }));
    return result.items.slice(0, 4).map((item) => ({
      id: item.id,
      slug: item.slug,
      title: item.title,
      organization: item.organization || item.agency || "Funding partner",
      type: item.type.replaceAll("_", " "),
      location: item.eligibleCountries[0] || item.countries[0] || "West Africa",
      sector: item.sectors[0] || "Cross-sector",
      funding: formatMoney(item.fundingMax ?? item.fundingMin, item.currency) || "See funding details",
      deadline: formatDeadline(item.deadline),
    }));
  } catch {
    return [];
  }
}

async function StreamingOpportunityShowcase() {
  return <OpportunityShowcase opportunities={await loadOpportunities()} />;
}

export default function Home() {
  return (
    <Homepage
      opportunityShowcase={
        <Suspense fallback={<OpportunityShowcaseSkeleton />}>
          <StreamingOpportunityShowcase />
        </Suspense>
      }
    />
  );
}
