import { useTranslations } from "next-intl";
import { Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PublicOpportunityFilters } from "@/lib/public-opportunities";
import { OPPORTUNITY_TYPES } from "@/types/opportunities";

export function DirectoryFilters({ filters, matches }: { filters: PublicOpportunityFilters; matches: boolean }) {
  const t = useTranslations("Opportunities");
  const common = useTranslations("Common");
  return <form action="/dashboard/opportunities" className="rounded-2xl border bg-card p-4">
    {matches ? <input type="hidden" name="view" value="matches" /> : null}
    <div className="flex items-center gap-2"><Search className="size-4 text-muted-foreground" /><Input name="q" defaultValue={filters.search} placeholder={t("discover.searchPlaceholder")} className="border-0 px-0 shadow-none focus-visible:ring-0" /><Button type="submit">{common("search")}</Button></div>
    <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 xl:grid-cols-5">
      <select name="type" defaultValue={filters.type} aria-label={t("filters.type")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">{t("filters.anyType")}</option>{OPPORTUNITY_TYPES.map((type) => <option key={type} value={type}>{t(("types." + type) as never)}</option>)}</select>
      <Input name="country" defaultValue={filters.country} aria-label={t("filters.country")} placeholder={t("filters.anyCountry")} />
      <Input name="sector" defaultValue={filters.sector} aria-label={t("filters.sector")} placeholder={t("filters.anySector")} />
      <select name="deadline" defaultValue={filters.deadline} aria-label={t("filters.deadline")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value="">{t("filters.anyDeadline")}</option><option value="closing-soon">{t("filters.closingSoon")}</option><option value="this-month">{t("filters.thisMonth")}</option><option value="next-30-days">{t("filters.next30Days")}</option><option value="none">{t("filters.noDeadline")}</option></select>
      <select name="sort" defaultValue={matches && filters.sort === "deadline" ? "best-match" : filters.sort} aria-label={t("filters.sort")} className="h-10 rounded-md border bg-background px-3 text-sm"><option value={matches ? "best-match" : "deadline"}>{matches ? t("discover.bestMatch") : t("filters.sortDeadline")}</option><option value="deadline">{t("filters.closingSoon")}</option><option value="newest">{t("filters.sortNewest")}</option><option value="funding-high">{t("filters.sortFundingHigh")}</option></select>
    </div>
    <div className="mt-3 flex items-center justify-between"><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" />{t("discover.filterHint")}</span>{(filters.search || filters.type || filters.country || filters.sector || filters.deadline) ? <Button asChild size="sm" variant="ghost"><a href={matches ? "/dashboard/opportunities?view=matches" : "/dashboard/opportunities"}>{t("discover.clearFilters")}</a></Button> : null}</div>
  </form>;
}
