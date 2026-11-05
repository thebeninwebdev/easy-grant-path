"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PROPOSAL_STARTERS, type ProposalStarterId } from "@/lib/proposal-presets";

export function GeneralTemplateForm() {
  const router = useRouter();
  const [templateType, setTemplateType] = useState<ProposalStarterId>("general");
  const starter = PROPOSAL_STARTERS.find((item) => item.id === templateType)!;
  const [title, setTitle] = useState("General Grant Proposal");
  const [description, setDescription] = useState(starter.description);
  const [saving, setSaving] = useState(false);
  function choose(value: ProposalStarterId) {
    setTemplateType(value);
    const selected = PROPOSAL_STARTERS.find((item) => item.id === value)!;
    setDescription(selected.description);
  }
  async function save(status: "draft" | "published") {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/proposal-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, templateType, status }) });
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message || "Could not create the general template.");
      toast.success(status === "published" ? "General template published." : "General template draft saved.");
      router.push("/admin/proposal-templates");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the general template.");
      setSaving(false);
    }
  }
  return <div className="space-y-6"><header><p className="text-sm font-medium text-primary">Reusable proposal structure</p><h1 className="mt-1 text-3xl font-semibold">New general template</h1><p className="mt-1 text-muted-foreground">Publish a reusable starter that is not tied to one opportunity.</p></header><div className="rounded-xl border bg-background p-6"><div className="grid gap-5 sm:grid-cols-2"><label className="text-sm font-medium">Template type<select className="mt-2 h-10 w-full rounded-md border bg-background px-3" value={templateType} onChange={(event) => choose(event.target.value as ProposalStarterId)}>{PROPOSAL_STARTERS.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-sm font-medium">Template title<Input className="mt-2" value={title} onChange={(event) => setTitle(event.target.value)} /></label><label className="text-sm font-medium sm:col-span-2">Description<Textarea className="mt-2" value={description} onChange={(event) => setDescription(event.target.value)} /></label></div><p className="mt-4 text-sm text-muted-foreground">{starter.sections.length} prepared sections will be copied into this template. They can be safely snapshot into any new proposal.</p><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={saving} onClick={() => void save("draft")}>Save draft</Button><Button disabled={saving} onClick={() => void save("published")}>{saving ? "Saving..." : "Publish template"}</Button></div></div></div>;
}
