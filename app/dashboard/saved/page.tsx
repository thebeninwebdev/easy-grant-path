import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Bookmark, CalendarDays, Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SaveOpportunityButton } from "@/components/opportunities/save-opportunity-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listSavedOpportunities } from "@/lib/saved-opportunities";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { formatCurrency, formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";

export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Opportunities.meta"); return { title: t("saved") }; }

export default async function SavedOpportunitiesPage() {
  const [locale, t, common, profile] = await Promise.all([getLocale() as Promise<SupportedLocale>, getTranslations("Opportunities"), getTranslations("Common"), getDevelopmentProfile()]);
  if (!profile || !isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (!hasActiveAccess(profile)) redirect("/dashboard/teaser");
  const items = await listSavedOpportunities(locale);
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"><header><p className="text-sm font-medium text-primary">{t("saved.kicker")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("saved.title")}</h1><p className="mt-2 text-muted-foreground">{t("saved.description")}</p></header>
    {items.length ? <div className="mt-7 grid gap-4">{items.map((item) => { const closed = item.closed, amount = item.fundingMax ?? item.fundingMin; return <Card key={item.bookmarkId}><CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-2"><Badge variant={closed ? "secondary" : "outline"}>{closed ? t("saved.closed") : item.status.replaceAll("_", " ")}</Badge><Badge variant="outline">{t(("types." + item.type) as never)}</Badge></div><h2 className="mt-3 text-lg font-semibold"><Link href={"/dashboard/opportunities/" + item.slug} className="hover:text-primary">{item.title}</Link></h2><p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Landmark className="size-4" />{item.organization || t("detail.orgNotProvided")}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span>{amount === null ? common("notProvided") : formatCurrency(amount, item.currency, locale)}</span><span className="flex items-center gap-1"><CalendarDays className="size-4" />{item.deadline ? formatDate(item.deadline, locale) : common("noDeadline")}</span></div></div><div className="flex shrink-0 gap-2"><SaveOpportunityButton opportunityId={item.id} initiallySaved /><Button asChild><Link href={"/dashboard/opportunities/" + item.slug}>{t("saved.viewDetails")}</Link></Button></div></CardContent></Card>; })}</div> : <div className="mt-7 rounded-2xl border border-dashed bg-card px-6 py-16 text-center"><Bookmark className="mx-auto size-9 text-muted-foreground/60" /><h2 className="mt-4 font-semibold">{t("saved.emptyTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("saved.emptyDescription")}</p><Button asChild className="mt-5"><Link href="/dashboard/opportunities">{t("saved.exploreButton")}</Link></Button></div>}
  </main>;
}
