import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { PublicOpportunity } from "@/lib/public-opportunities";
import { formatCurrency, formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";
import { OpportunityFavicon } from "@/components/opportunities/opportunity-image";

function funding(opportunity: PublicOpportunity, locale: SupportedLocale, notProvided: string) {
  const value = opportunity.fundingMax ?? opportunity.fundingMin;
  return value === null ? notProvided : formatCurrency(value, opportunity.currency, locale);
}

export function OpportunityCard({ opportunity }: { opportunity: PublicOpportunity }) {
  const t = useTranslations("Opportunities");
  const common = useTranslations("Common");
  const locale = useLocale() as SupportedLocale;
  const organization = opportunity.agency || opportunity.organization || t("detail.orgNotProvided");
  const href = "/dashboard/opportunities/" + opportunity.slug;
  return <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
    <CardContent className="flex-1 p-5">
      <div className="flex flex-wrap items-center gap-2"><Badge className="gap-1 bg-emerald-100 text-emerald-800"><CheckCircle2 className="size-3" /> {t("card.verified")}</Badge><Badge variant="outline">{t(("types." + opportunity.type) as never)}</Badge></div>
      <h2 className="mt-4 line-clamp-3 text-lg font-semibold leading-snug"><Link href={href} className="hover:text-primary">{opportunity.title}</Link></h2>
      <div className="mt-3 flex items-center gap-2"><OpportunityFavicon opportunity={opportunity} organization={organization} /><p className="text-sm text-muted-foreground">{organization}</p></div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm"><div><p className="text-xs text-muted-foreground">{t("card.funding")}</p><p className="mt-1 font-medium">{funding(opportunity, locale, common("notProvided"))}</p></div><div><p className="text-xs text-muted-foreground">{t("card.deadline")}</p><p className="mt-1 flex items-center gap-1 font-medium"><CalendarDays className="size-3.5" />{opportunity.deadline ? formatDate(opportunity.deadline, locale) : common("noDeadline")}</p></div></div>
      {opportunity.eligibleCountries.length ? <p className="mt-4 text-xs text-muted-foreground"><span className="font-medium text-foreground">{t("card.eligible")}:</span> {opportunity.eligibleCountries.slice(0, 4).join(", ")}</p> : null}
      {opportunity.sectors.length ? <div className="mt-3 flex flex-wrap gap-1.5">{opportunity.sectors.slice(0, 4).map((sector) => <Badge key={sector} variant="secondary">{sector}</Badge>)}</div> : null}
      <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{opportunity.summary || t("card.noSummary")}</p>
    </CardContent>
    <CardFooter className="border-t p-5 pt-4"><Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href={href}>{t("card.viewOpportunity")} <ArrowRight className="size-4" /></Link></CardFooter>
  </Card>;
}
