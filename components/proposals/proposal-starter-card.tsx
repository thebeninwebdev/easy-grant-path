"use client";

import { CheckCircle2, FilePenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function ProposalStarterCard({ opportunityId, existingApplicationId, templateId, templateTitle, generalTemplate = false }: {
  opportunityId: string;
  existingApplicationId: string | null;
  templateId?: string;
  templateTitle?: string;
  generalTemplate?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function start() {
    if (existingApplicationId) {
      router.push(`/dashboard/proposals/${existingApplicationId}`);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opportunityId, ...(templateId ? { templateId } : {}) }),
      });
      const payload = await response.json() as { data?: { id?: string; setupCompleted?: boolean }; error?: { message?: string } };
      if (!response.ok || !payload.data?.id) throw new Error(payload.error?.message || "Could not start your proposal.");
      router.push(payload.data.setupCompleted ? `/dashboard/proposals/${payload.data.id}` : `/dashboard/proposals/${payload.data.id}/setup`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start your proposal.");
      setBusy(false);
    }
  }
  return <Card className="border-primary/25 bg-primary/[0.03]"><CardContent className="p-6"><div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><FilePenLine className="size-5" /></div><div className="mt-4 flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold">Proposal Starter</h2>{generalTemplate && !existingApplicationId ? <Badge variant="secondary">General template</Badge> : null}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{existingApplicationId ? "Continue your existing proposal workspace without losing progress." : generalTemplate ? "A suitable reusable template is available for this opportunity." : "Use the published structure prepared for this opportunity."}</p>{templateTitle && !existingApplicationId ? <p className="mt-3 text-sm font-medium">{templateTitle}</p> : null}<ul className="mt-4 space-y-2 text-sm">{["Based on this opportunity", "Section-by-section guidance", "Save your work as you go"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-primary" />{item}</li>)}</ul><Button className="mt-5 w-full" disabled={busy} onClick={start}>{busy ? "Starting..." : existingApplicationId ? "Continue My Proposal" : "Start My Proposal"}</Button></CardContent></Card>;
}
