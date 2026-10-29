"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, FileSearch, Loader2, Save, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { OPPORTUNITY_TYPES } from "@/types/opportunities";

type FormState = Record<string, string>;
type Extracted = Record<string, string | number | string[] | null>;

const initial: FormState = {
  importUrl: "", title: "", organization: "", agency: "", summary: "", description: "", type: "grant",
  countries: "", eligibleCountries: "", applicantTypes: "", sectors: "", fundingMin: "", fundingMax: "",
  currency: "", openingDate: "", deadline: "", opportunityNumber: "", officialUrl: "", discoveryUrl: "",
};

function Label({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}{hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}</label>;
}

function splitList(value: string) {
  return value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean);
}

function displayType(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function OpportunityCreateForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState<"review" | "verify" | null>(null);
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string; warnings?: string[] } | null>(null);
  const [duplicate, setDuplicate] = useState<{ id: string; title: string } | null>(null);

  const update = (field: string, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const populatedCount = useMemo(() => Object.entries(form).filter(([key, value]) => key !== "importUrl" && value.trim()).length, [form]);

  async function extract() {
    if (!form.importUrl.trim()) return setNotice({ tone: "error", text: "Enter the public opportunity URL first." });
    setExtracting(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/opportunities/extract", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: form.importUrl.trim() }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Could not extract this page.");
      const data = payload.data as Extracted;
      setForm((current) => {
        const next = { ...current };
        for (const [field, value] of Object.entries(data)) {
          if (!(field in next) || next[field].trim() || value === null) continue;
          next[field] = Array.isArray(value) ? value.join(", ") : String(value);
        }
        if (!next.discoveryUrl) next.discoveryUrl = form.importUrl.trim();
        return next;
      });
      const warnings = Array.isArray(payload.meta?.warnings) ? payload.meta.warnings : [];
      setNotice({ tone: "success", text: `Imported ${payload.meta?.fieldsFound?.length ?? 0} fields. Review every value before saving.`, warnings });
      toast.success("Opportunity details imported");
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not extract this page." });
    } finally { setExtracting(false); }
  }

  async function save(action: "review" | "verify") {
    setSaving(action); setNotice(null); setDuplicate(null);
    const numeric = (value: string) => value.trim() ? Number(value) : undefined;
    const payload = {
      title: form.title, organization: form.organization, agency: form.agency, summary: form.summary,
      description: form.description, type: form.type, countries: splitList(form.countries),
      eligibleCountries: splitList(form.eligibleCountries), applicantTypes: splitList(form.applicantTypes),
      sectors: splitList(form.sectors), fundingMin: numeric(form.fundingMin), fundingMax: numeric(form.fundingMax),
      currency: form.currency.trim().toUpperCase() || undefined, openingDate: form.openingDate,
      deadline: form.deadline, opportunityNumber: form.opportunityNumber, officialUrl: form.officialUrl,
      discoveryUrl: form.discoveryUrl, action,
    };
    try {
      const response = await fetch("/api/admin/opportunities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 && result.error?.details?.existingId) setDuplicate({ id: result.error.details.existingId, title: result.error.details.existingTitle });
        throw new Error(result.error?.message || "Could not save this opportunity.");
      }
      toast.success(action === "verify" ? "Opportunity saved and verified" : "Opportunity saved for review");
      router.push(`/admin/opportunities?view=${action === "verify" ? "verified" : "needs_review"}&query=${encodeURIComponent(form.title)}`);
      router.refresh();
    } catch (error) {
      setNotice({ tone: "error", text: error instanceof Error ? error.message : "Could not save this opportunity." });
    } finally { setSaving(null); }
  }

  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileSearch className="size-4" /> Import from a public page</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row"><Input value={form.importUrl} onChange={(event) => update("importUrl", event.target.value)} placeholder="https://funder.org/opportunities/..." type="url" /><Button type="button" variant="outline" disabled={extracting} onClick={extract}>{extracting ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}{extracting ? "Reading opportunity page…" : "Fetch details"}</Button></div>
          <p className="mt-2 text-xs text-muted-foreground">Import is optional. It fills only empty fields and never saves automatically.</p>
        </CardContent>
      </Card>

      {notice ? <div role="status" className={`rounded-lg border p-4 text-sm ${notice.tone === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
        <div className="flex gap-2">{notice.tone === "success" ? <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> : <AlertCircle className="mt-0.5 size-4 shrink-0" />}<div><p>{notice.text}</p>{notice.warnings?.map((warning) => <p className="mt-1 text-xs" key={warning}>{warning}</p>)}{duplicate ? <Link className="mt-2 inline-block font-medium underline" href={`/admin/opportunities?query=${encodeURIComponent(duplicate.title)}`}>Review existing: {duplicate.title}</Link> : null}</div></div>
      </div> : null}

      <Card><CardHeader><CardTitle className="text-base">Core details</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        <Label label="Title *"><Input required value={form.title} onChange={(e) => update("title", e.target.value)} /></Label>
        <Label label="Type"><select className="h-9 rounded-md border bg-background px-3 text-sm" value={form.type} onChange={(e) => update("type", e.target.value)}>{OPPORTUNITY_TYPES.map((type) => <option key={type} value={type}>{displayType(type)}</option>)}</select></Label>
        <Label label="Organization"><Input value={form.organization} onChange={(e) => update("organization", e.target.value)} /></Label>
        <Label label="Agency"><Input value={form.agency} onChange={(e) => update("agency", e.target.value)} /></Label>
        <div className="sm:col-span-2"><Label label="Summary"><Textarea value={form.summary} onChange={(e) => update("summary", e.target.value)} /></Label></div>
        <div className="sm:col-span-2"><Label label="Full description"><Textarea className="min-h-44" value={form.description} onChange={(e) => update("description", e.target.value)} /></Label></div>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Eligibility and focus</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        {[['countries','Countries'],['eligibleCountries','Eligible countries'],['applicantTypes','Applicant types'],['sectors','Sectors']].map(([field,label]) => <Label key={field} label={label} hint="Separate values with commas"><Input value={form[field]} onChange={(e) => update(field, e.target.value)} /></Label>)}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Funding and dates</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-3">
        <Label label="Minimum funding"><Input min="0" type="number" value={form.fundingMin} onChange={(e) => update("fundingMin", e.target.value)} /></Label>
        <Label label="Maximum funding"><Input min="0" type="number" value={form.fundingMax} onChange={(e) => update("fundingMax", e.target.value)} /></Label>
        <Label label="Currency"><Input maxLength={3} placeholder="USD" value={form.currency} onChange={(e) => update("currency", e.target.value)} /></Label>
        <Label label="Opening date"><Input type="date" value={form.openingDate} onChange={(e) => update("openingDate", e.target.value)} /></Label>
        <Label label="Deadline"><Input type="date" value={form.deadline} onChange={(e) => update("deadline", e.target.value)} /></Label>
        <Label label="Opportunity number"><Input value={form.opportunityNumber} onChange={(e) => update("opportunityNumber", e.target.value)} /></Label>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Source links</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        <Label label="Official URL"><Input type="url" value={form.officialUrl} onChange={(e) => update("officialUrl", e.target.value)} /></Label>
        <Label label="Discovery URL"><Input type="url" value={form.discoveryUrl} onChange={(e) => update("discoveryUrl", e.target.value)} /></Label>
      </CardContent></Card>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-6">
      <Card><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-base">Preview</CardTitle><Badge variant="secondary">{populatedCount} fields</Badge></div></CardHeader><CardContent className="space-y-4">
        <div><Badge variant="outline">{displayType(form.type)}</Badge><h2 className="mt-3 text-lg font-semibold leading-snug">{form.title || "Untitled opportunity"}</h2><p className="mt-1 text-sm text-muted-foreground">{form.agency || form.organization || "Organization not provided"}</p></div>
        <p className="line-clamp-5 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{form.summary || form.description || "A summary or description will appear here."}</p>
        <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3 text-sm"><div><dt className="text-xs text-muted-foreground">Deadline</dt><dd className="mt-1 font-medium">{form.deadline || "Not set"}</dd></div><div><dt className="text-xs text-muted-foreground">Funding</dt><dd className="mt-1 font-medium">{form.fundingMax ? `${form.currency || ""} ${Number(form.fundingMax).toLocaleString()}`.trim() : "Not set"}</dd></div></dl>
        <div className="grid gap-3 border-t pt-4 text-sm"><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Source information</p><p className="mt-1">Manual entry{form.discoveryUrl || form.officialUrl ? " · URL assisted" : " · No URL"}</p></div><div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Publishing status</p><p className="mt-1 text-muted-foreground">Choose Verified or Needs review when you save.</p></div></div>
        {form.officialUrl ? <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={form.officialUrl} target="_blank" rel="noreferrer">Official page <ExternalLink className="size-3.5" /></a> : null}
      </CardContent></Card>
      <Card><CardContent className="space-y-3 p-5"><Button className="w-full" disabled={Boolean(saving) || !form.title.trim()} onClick={() => save("verify")}>{saving === "verify" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}Save &amp; Verify</Button><Button className="w-full" variant="outline" disabled={Boolean(saving) || !form.title.trim()} onClick={() => save("review")}>{saving === "review" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save for Review</Button><p className="text-center text-xs text-muted-foreground">Verified entries publish immediately; review entries stay in the queue.</p></CardContent></Card>
    </aside>
  </div>;
}
