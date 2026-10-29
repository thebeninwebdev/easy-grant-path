import type { AdminOpportunityItem } from "@/lib/admin-opportunities";

export function formatDate(value: string | null) {
  if (!value) return "Not provided";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function formatFunding(item: Pick<AdminOpportunityItem, "fundingMin" | "fundingMax" | "currency">) {
  const formatter = new Intl.NumberFormat("en", {
    style: "currency",
    currency: item.currency || "USD",
    maximumFractionDigits: 0,
  });
  if (item.fundingMin !== null && item.fundingMax !== null) {
    return `${formatter.format(item.fundingMin)} – ${formatter.format(item.fundingMax)}`;
  }
  if (item.fundingMin !== null) return `From ${formatter.format(item.fundingMin)}`;
  if (item.fundingMax !== null) return `Up to ${formatter.format(item.fundingMax)}`;
  return "Not provided";
}

export function humanize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
