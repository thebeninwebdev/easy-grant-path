import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CheckCircle2, FilePenLine, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { formatDate } from "@/lib/i18n-format";
import type { SupportedLocale } from "@/lib/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listProposalApplications } from "@/lib/proposals";
import { getDevelopmentProfile, hasActiveAccess, isRegistrationProfileComplete } from "@/lib/user-profile";
import { ProfessionalProposalServices } from "@/components/services/professional-proposal-services";
export const instant = false;
export async function generateMetadata(): Promise<Metadata> { const t = await getTranslations("Proposals.meta"); return { title: t("list") }; }
export default async function ProposalsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const [profile, locale, t, params] = await Promise.all([getDevelopmentProfile(), getLocale() as Promise<SupportedLocale>, getTranslations("Proposals"), searchParams]);
  if (!profile || !isRegistrationProfileComplete(profile)) redirect("/dashboard/onboarding");
  if (!hasActiveAccess(profile)) redirect("/dashboard/teaser");
  const filter = params.status === "completed" ? "completed" : params.status === "in-progress" ? "in-progress" : "all";
  const all = await listProposalApplications(), items = all.filter((item) => filter === "all" || (filter === "completed" ? item.status === "completed" : item.status !== "completed"));
  const filters = [["all", t("list.filters.all")], ["in-progress", t("list.filters.inProgress")], ["completed", t("list.filters.completed")]];
  return <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8"><header><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-primary">{t("list.kicker")}</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("list.title")}</h1><p className="mt-2 text-muted-foreground">{t("list.description")}</p></div><Button asChild size="lg"><Link href="/dashboard/proposals/new"><Plus className="size-4" /> {t("list.createButton")}</Link></Button></div><div className="mt-5 flex flex-wrap gap-2">{filters.map(([value,label]) => <Button key={value} asChild size="sm" variant={filter === value ? "default" : "outline"}><Link href={value === "all" ? "/dashboard/proposals" : ("/dashboard/proposals?status=" + value) as never}>{label}</Link></Button>)}</div></header>
    <section className="mt-7 rounded-2xl border bg-card p-5"><h2 className="text-xl font-semibold">{t("list.needHelp.title")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("list.needHelp.description")}</p><div className="mt-4"><ProfessionalProposalServices /></div></section>
    {items.length ? <div className="mt-7 grid gap-4">{items.map((proposal) => <Card key={proposal.id}><CardContent className="flex flex-col gap-5 p-5 md:flex-row md:items-center"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{proposal.status === "completed" ? <CheckCircle2 className="size-5" /> : <FilePenLine className="size-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><Badge variant={proposal.status === "completed" ? "default" : "secondary"}>{t(proposal.status === "completed" ? "list.proposal.completed" : "list.proposal.inProgress")}</Badge><span className="text-xs text-muted-foreground">{proposal.updatedAt ? t("list.proposal.updatedAt", { date: formatDate(proposal.updatedAt, locale) }) : t("list.proposal.updatedRecently")}</span></div><h2 className="mt-2 truncate text-lg font-semibold">{proposal.proposalMetadata.projectTitle || proposal.opportunityTitle}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{proposal.opportunityTitle} · {proposal.fundingOrganization || t("list.proposal.orgNotProvided")}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span>{proposal.progress}{t("list.proposal.percent")}</span>{proposal.deadline ? <span>{t("list.proposal.deadline", { date: formatDate(proposal.deadline, locale) })}</span> : <span>{t("list.proposal.deadlineNotProvided")}</span>}</div><div className="mt-2 h-1.5 max-w-lg overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: proposal.progress + "%" }} /></div></div><Button asChild><Link href={"/dashboard/proposals/" + proposal.id}>{t(proposal.status === "completed" ? "list.proposal.viewProposal" : "list.proposal.continueEditing")}</Link></Button></CardContent></Card>)}</div> : <div className="mt-7 rounded-2xl border border-dashed bg-card px-6 py-16 text-center"><FilePenLine className="mx-auto size-9 text-muted-foreground/60" /><h2 className="mt-4 font-semibold">{t("list.emptyTitle")}</h2><p className="mt-2 text-sm text-muted-foreground">{t("list.emptyDescription")}</p><div className="mt-5"><Button asChild><Link href="/dashboard/proposals/new"><Plus className="size-4" /> {t("list.createFirst")}</Link></Button></div></div>}
  </main>;
}
