"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, FilePenLine, Landmark, LayoutTemplate } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ProposalCreationOptions } from "@/lib/proposals";

export function ProposalCreationForm({ options, initialOpportunityId }: { options: ProposalCreationOptions; initialOpportunityId?: string }) {
  const router = useRouter();
  const initialOpportunity = initialOpportunityId ? options.opportunities.find((item) => item.id === initialOpportunityId) : undefined;
  const initialTemplateIds = initialOpportunity?.applicableTemplateIds || options.generalTemplates;
  const [opportunityId, setOpportunityId] = useState(initialOpportunityId || "");
  const [templateId, setTemplateId] = useState(initialTemplateIds[0] || "");
  const [busy, setBusy] = useState(false);
  const opportunity = options.opportunities.find((item) => item.id === opportunityId);
  const availableIds = opportunity?.applicableTemplateIds || options.generalTemplates;
  const templates = availableIds.map((id) => options.templates.find((item) => item.id === id)).filter((item): item is ProposalCreationOptions["templates"][number] => Boolean(item));
  const template = templates.find((item) => item.id === templateId) || templates[0];

  function selectOpportunity(value: string) {
    setOpportunityId(value);
    const selected = options.opportunities.find((item) => item.id === value);
    setTemplateId((selected?.applicableTemplateIds || options.generalTemplates)[0] || "");
  }

  async function start() {
    if (opportunity?.existingApplicationId) {
      router.push(`/dashboard/proposals/${opportunity.existingApplicationId}`);
      return;
    }
    if (!template) {
      toast.error(opportunity ? "No published template is available for this opportunity." : "No published general template is available.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...(opportunityId ? { opportunityId } : {}), templateId: template.id }),
      });
      const payload = await response.json() as { data?: { id?: string; setupCompleted?: boolean }; error?: { message?: string } };
      if (!response.ok || !payload.data?.id) throw new Error(payload.error?.message || "Could not create your proposal.");
      router.push(payload.data.setupCompleted ? `/dashboard/proposals/${payload.data.id}` : `/dashboard/proposals/${payload.data.id}/setup`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create your proposal.");
      setBusy(false);
    }
  }

  return <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
    <Link href="/dashboard/proposals" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to My Proposals</Link>
    <header className="mt-5"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><FilePenLine className="size-5" /></div><h1 className="mt-4 text-3xl font-semibold tracking-tight">Create a proposal</h1><p className="mt-2 max-w-2xl text-muted-foreground">Choose a funding opportunity or begin with a reusable general template. Your proposal will continue in the existing setup and writing workspace.</p></header>

    <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <Card><CardContent className="p-6"><label className="text-sm font-semibold" htmlFor="proposal-opportunity">1. Choose a funding opportunity</label><p className="mt-1 text-sm text-muted-foreground">Select an active opportunity, or leave this as a general proposal when you are still preparing reusable content.</p><select id="proposal-opportunity" className="mt-4 h-11 w-full rounded-md border bg-background px-3 text-sm" value={opportunityId} onChange={(event) => selectOpportunity(event.target.value)}><option value="">General proposal — no opportunity yet</option>{options.opportunities.map((item) => <option key={item.id} value={item.id}>{item.title} — {item.organization}</option>)}</select>
          {opportunity?.existingApplicationId ? <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm"><p className="font-medium">You already have a proposal for this opportunity.</p><p className="mt-1 text-muted-foreground">Continue it to preserve your existing progress and avoid a duplicate workspace.</p></div> : null}
        </CardContent></Card>

        <Card><CardContent className="p-6"><label className="text-sm font-semibold" htmlFor="proposal-template">2. Choose a proposal template</label><p className="mt-1 text-sm text-muted-foreground">{opportunity ? "Opportunity-specific templates are preferred; suitable published general templates are available as fallbacks." : "Only published reusable general templates can start a proposal without an opportunity."}</p>
          {templates.length ? <div className="mt-4 space-y-3"><select id="proposal-template" className="h-11 w-full rounded-md border bg-background px-3 text-sm" value={template?.id || ""} onChange={(event) => setTemplateId(event.target.value)} disabled={Boolean(opportunity?.existingApplicationId)}>{templates.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>{template ? <div className="rounded-lg bg-muted/40 p-4"><div className="flex flex-wrap gap-2"><Badge variant="secondary">{template.scope === "general" ? "Reusable general template" : "Opportunity template"}</Badge><Badge variant="outline">{template.templateType.replaceAll("_", " ")}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{template.description || "A structured proposal template with section-by-section guidance."}</p></div> : null}</div> : <div className="mt-4 rounded-lg border border-dashed p-5 text-sm text-muted-foreground">{opportunity ? "No published starter currently matches this opportunity. Choose another opportunity or ask an administrator to publish an appropriate template." : "No published general template is available yet. Select an opportunity with a starter, or ask an administrator to publish a reusable general template."}</div>}
        </CardContent></Card>
      </div>

      <aside className="space-y-5"><Card className="border-primary/25 bg-primary/[0.03]"><CardContent className="p-6"><LayoutTemplate className="size-6 text-primary" /><h2 className="mt-3 font-semibold">{opportunity?.existingApplicationId ? "Continue your proposal" : "Ready to begin"}</h2><div className="mt-4 space-y-3 text-sm"><p className="flex gap-2"><Landmark className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{opportunity ? opportunity.title : "General funding proposal"}</span></p><p className="flex gap-2"><LayoutTemplate className="mt-0.5 size-4 shrink-0 text-muted-foreground" /><span>{template?.title || "Template required"}</span></p></div><Button className="mt-5 w-full" disabled={busy || (!opportunity?.existingApplicationId && !template)} onClick={start}>{busy ? "Creating..." : opportunity?.existingApplicationId ? "Continue existing proposal" : "Start preparing proposal"} <ArrowRight className="size-4" /></Button></CardContent></Card>
        {options.recentGeneralProposals.length ? <Card><CardContent className="p-5"><h2 className="font-semibold">Recent general proposals</h2><div className="mt-3 space-y-2">{options.recentGeneralProposals.map((item) => <Link key={item.id} href={`/dashboard/proposals/${item.id}`} className="block rounded-md border p-3 text-sm hover:border-primary/40"><span className="font-medium">{item.title}</span><span className="mt-1 block text-xs text-muted-foreground">Continue existing workspace</span></Link>)}</div></CardContent></Card> : null}
      </aside>
    </div>
  </main>;
}
