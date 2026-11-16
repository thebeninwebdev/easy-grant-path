"use client";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, FilePenLine } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import type { SupportedLocale } from "@/lib/config";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
type TemplateSectionSummary = { key: string; title: string; required: boolean; wordLimit?: number };
const EMPTY_TEMPLATE_SECTIONS: TemplateSectionSummary[] = [];
export function ProposalStarterCard({ opportunityId, existingApplicationId, templateTitle, templateSections = EMPTY_TEMPLATE_SECTIONS, generalTemplate = false }: { opportunityId: string; existingApplicationId: string | null; templateTitle?: string; templateSections?: TemplateSectionSummary[]; generalTemplate?: boolean }) {
  const router = useRouter(), locale = useLocale() as SupportedLocale, t = useTranslations("Proposals.starter");
  const [busy, setBusy] = useState(false);
  async function start() {
    if (existingApplicationId) { router.push(("/dashboard/proposals/" + existingApplicationId) as never); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opportunityId, locale }) });
      const payload = await response.json() as { data?: { id?: string; setupCompleted?: boolean } };
      if (!response.ok || !payload.data?.id) throw new Error();
      router.push(("/dashboard/proposals/" + payload.data.id + (payload.data.setupCompleted ? "" : "/setup")) as never); router.refresh();
    } catch { toast.error(t("startError")); setBusy(false); }
  }
  const benefits = ["basedOnOpportunity","guidedSections","autosave"] as const;
  return <Card className="border-primary/25 bg-primary/[0.03]"><CardContent className="p-6"><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FilePenLine className="size-5" /></div><div className="mt-4 flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">{t("title")}</h2>{!existingApplicationId ? <Badge variant="secondary">{t("recommendedForOpportunity")}</Badge> : null}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{existingApplicationId ? t("continueDescription") : generalTemplate ? t("generalDescription") : t("specificDescription")}</p>{templateTitle && !existingApplicationId ? <p className="mt-3 text-sm font-medium">{templateTitle}</p> : null}{templateSections.length > 0 && !existingApplicationId ? <div className="mt-4 rounded-lg border bg-background/70 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("includedSections")}</p><ul className="mt-2 space-y-1.5 text-sm">{templateSections.slice(0, 5).map((section) => <li key={section.key} className="flex items-start justify-between gap-2"><span>{section.title}</span><span className="shrink-0 text-xs text-muted-foreground">{section.required ? t("required") : t("optional")}</span></li>)}</ul>{templateSections.length > 5 ? <p className="mt-2 text-xs text-muted-foreground">{t("moreSections", { count: templateSections.length - 5 })}</p> : null}</div> : null}<ul className="mt-4 space-y-2 text-sm">{benefits.map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{t(("benefits." + item) as never)}</li>)}</ul><Button className="mt-5 w-full" disabled={busy} onClick={start}>{busy ? t("starting") : existingApplicationId ? t("continue") : t("start")}</Button></CardContent></Card>;
}
