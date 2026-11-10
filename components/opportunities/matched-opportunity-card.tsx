import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, CalendarDays, CheckCircle2, CircleHelp, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { formatCurrency, formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";
import { OpportunityFavicon } from "@/components/opportunities/opportunity-image";
import { SaveOpportunityButton } from "@/components/opportunities/save-opportunity-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { MatchedOpportunity } from "@/lib/dashboard-data";
import type { PublicOpportunity } from "@/lib/public-opportunities";

export function MatchedOpportunityCard({ opportunity, match, saved = false }: { opportunity: PublicOpportunity; match?: MatchedOpportunity["match"]; saved?: boolean }) {
  const t = useTranslations("Opportunities");
  const common = useTranslations("Common");
  const locale = useLocale() as SupportedLocale;
  const href = "/dashboard/opportunities/" + opportunity.slug;
  const organization = opportunity.agency || opportunity.organization || t("detail.orgNotProvided");
  const amount = opportunity.fundingMax ?? opportunity.fundingMin;
  const matchLabel = match?.label === "Strong potential match" ? t("matchLabel.strongPotential") : match?.label === "Good potential match" ? t("matchLabel.goodPotential") : t("matchLabel.worthExploring");
  return <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
    <CardContent className="flex-1 p-5">
      <div className="flex items-start justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{t(("types." + opportunity.type) as never)}</Badge>{match ? <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10"><Sparkles className="size-3" />{matchLabel}</Badge> : null}</div><SaveOpportunityButton opportunityId={opportunity.id} initiallySaved={saved} compact /></div>
      <h2 className="mt-4 line-clamp-3 text-lg font-semibold leading-snug"><Link href={href} className="hover:text-primary">{opportunity.title}</Link></h2>
      <div className="mt-3 flex items-center gap-2"><OpportunityFavicon opportunity={opportunity} organization={organization} /><p className="text-sm text-muted-foreground">{organization}</p></div>
      <div className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/50 p-3 text-sm"><div><p className="text-xs text-muted-foreground">{t("card.funding")}</p><p className="mt-1 font-medium">{amount === null ? common("notProvided") : formatCurrency(amount, opportunity.currency, locale)}</p></div><div><p className="text-xs text-muted-foreground">{t("card.deadline")}</p><p className="mt-1 flex items-center gap-1 font-medium"><CalendarDays className="size-3.5" />{opportunity.deadline ? formatDate(opportunity.deadline, locale) : common("noDeadline")}</p></div></div>
      {match ? <div className="mt-4 rounded-xl border border-primary/15 bg-primary/[0.03] p-3"><p className="text-xs font-semibold text-primary">{t("matching.whyFit")}</p><ul className="mt-2 space-y-1.5">{match.reasons.slice(0, 3).map((reason) => <li key={reason.text} className="flex gap-2 text-xs leading-5 text-muted-foreground">{reason.confidence === "confirmed" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" /> : <CircleHelp className="mt-0.5 size-3.5 shrink-0" />}{reason.text}</li>)}</ul></div> : null}
      {!match && opportunity.sectors.length ? <div className="mt-4 flex flex-wrap gap-1.5">{opportunity.sectors.slice(0, 3).map((sector) => <Badge key={sector} variant="secondary">{sector}</Badge>)}</div> : null}
    </CardContent>
    <CardFooter className="border-t p-5 pt-4"><Link className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href={href}>{t("card.viewOpportunity")} <ArrowRight className="size-4" /></Link></CardFooter>
  </Card>;
}
