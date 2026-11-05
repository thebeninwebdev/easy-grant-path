"use client";
import Link from "next/link";
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Circle, Download, FileText, RefreshCw, Save } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ProposalDocumentPreview } from "@/components/proposals/proposal-document-preview";
import { buildProposalDocument } from "@/lib/proposal-document";
import { calculateProposalProgress, canCompleteProposal } from "@/lib/proposal-logic";
import type { SerializedProposalApplication } from "@/lib/proposals";

type SaveState = "saved" | "saving" | "failed";
type ExportType = "pdf" | "docx";
function words(value: string) { return value.trim() ? value.trim().split(/\s+/).length : 0; }

export function ProposalWorkspace({ initial }: { initial: SerializedProposalApplication }) {
  const [sections, setSections] = useState(initial.sections);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState(initial.status);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [mobileMode, setMobileMode] = useState<"write" | "preview">("write");
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef(new Map<string, string>());
  const saving = useRef(false);
  const progress = useMemo(() => calculateProposalProgress(sections), [sections]);
  const required = sections.filter((item) => item.required);
  const completedRequired = required.filter((item) => item.content.trim()).length;
  const section = sections[active];
  const documentData = useMemo(() => buildProposalDocument({ opportunityTitle: initial.opportunityTitle, fundingOrganization: initial.fundingOrganization, templateTitle: initial.templateTitle, proposalMetadata: initial.proposalMetadata, status, deadline: initial.deadline, sections }), [initial.deadline, initial.fundingOrganization, initial.opportunityTitle, initial.proposalMetadata, initial.templateTitle, sections, status]);

  const flushPending = useCallback(async () => {
    if (saving.current || pending.current.size === 0) return true;
    saving.current = true; setSaveState("saving");
    const batch = [...pending.current.entries()]; batch.forEach(([key]) => pending.current.delete(key));
    try {
      for (const [sectionKey, content] of batch) {
        const response = await fetch(`/api/applications/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sectionKey, content }) });
        if (!response.ok) throw new Error("save failed");
      }
      setSaveState(pending.current.size ? "saving" : "saved");
      return true;
    } catch {
      for (const [key, value] of batch) if (!pending.current.has(key)) pending.current.set(key, value);
      setSaveState("failed");
      return false;
    } finally { saving.current = false; }
  }, [initial.id]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function update(content: string) {
    const key = section.key;
    setSections((current) => current.map((item, index) => index === active ? { ...item, content } : item));
    pending.current.set(key, content); setSaveState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flushPending(); }, 900);
  }
  function selectSection(index: number) { setActive(index); setMobileMode("write"); }
  async function complete() { if (!await flushPending()) { toast.error("Save your latest changes before completing the proposal."); return; } try { const response = await fetch(`/api/applications/${initial.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "complete" }) }); const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null; if (!response.ok) throw new Error(payload?.error?.message || "Could not complete proposal."); setStatus("completed"); toast.success("Proposal marked complete."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not complete proposal."); } }
  async function download(type: ExportType) {
    if (documentData.incompleteRequiredCount && !window.confirm(`Your proposal still has ${documentData.incompleteRequiredCount} required ${documentData.incompleteRequiredCount === 1 ? "section" : "sections"} incomplete. Export this draft anyway?`)) return;
    if (!await flushPending()) { toast.error("We couldn't save your latest changes. Retry saving before export."); return; }
    setExporting(type);
    try {
      const response = await fetch(`/api/applications/${initial.id}/export/${type}`);
      if (!response.ok) throw new Error(`Could not generate the ${type === "pdf" ? "PDF" : "Word document"}.`);
      const blob = await response.blob(); const disposition = response.headers.get("Content-Disposition") || ""; const filename = disposition.match(/filename="([^"]+)"/)?.[1] || `proposal.${type}`;
      const url = URL.createObjectURL(blob); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not generate the export."); } finally { setExporting(null); }
  }
  if (!section) return <main className="p-8"><p>This proposal has no available sections.</p></main>;
  const count = words(section.content); const over = section.wordLimit ? Math.max(0, count - section.wordLimit) : 0;
  return <main className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col bg-[#f2f3f2]">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-white px-4 py-3 lg:px-6"><div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" aria-label="Back to dashboard" className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><ArrowLeft className="size-4" /></Link><div className="min-w-0"><h1 className="truncate text-sm font-semibold sm:text-base">{initial.proposalMetadata.projectTitle || initial.opportunityTitle}</h1><p className="truncate text-xs text-muted-foreground">{initial.opportunityTitle}{initial.fundingOrganization ? ` · ${initial.fundingOrganization}` : ""}</p></div></div><div className="flex items-center gap-2"><Link href={`/dashboard/proposals/${initial.id}/setup`} className="text-xs font-medium text-muted-foreground hover:text-foreground">Edit details</Link><SaveIndicator state={saveState} retry={() => void flushPending()} /><Button size="sm" variant="outline" disabled={Boolean(exporting)} onClick={() => void download("pdf")}><Download className="size-4" />{exporting === "pdf" ? "Generating PDF..." : "PDF"}</Button><Button size="sm" variant="outline" disabled={Boolean(exporting)} onClick={() => void download("docx")}><FileText className="size-4" />{exporting === "docx" ? "Preparing Word..." : "Word"}</Button></div></header>
    <div className="flex flex-wrap items-center justify-end gap-2 border-b bg-white px-4 py-2"><span className="mr-auto text-xs text-muted-foreground">Optional expert support</span><Button size="sm" variant="outline" disabled title="Payments are not available yet">Pay for Review</Button><Button size="sm" variant="outline" disabled title="Payments are not available yet">Pay for Full Assistance</Button></div>
    <div className="border-b bg-white px-4 py-3 lg:hidden"><div className="grid grid-cols-2 rounded-lg bg-muted p-1"><button className={`rounded-md px-3 py-2 text-sm font-medium ${mobileMode === "write" ? "bg-white shadow-sm" : "text-muted-foreground"}`} onClick={() => setMobileMode("write")}>Write</button><button className={`rounded-md px-3 py-2 text-sm font-medium ${mobileMode === "preview" ? "bg-white shadow-sm" : "text-muted-foreground"}`} onClick={() => setMobileMode("preview")}>Preview</button></div></div>
    <div className="min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(340px,40%)_minmax(0,1fr)] xl:grid-cols-[240px_400px_minmax(0,1fr)]">
      <aside className="hidden min-h-0 overflow-y-auto border-r bg-white xl:block"><Outline sections={sections} active={active} progress={progress} completedRequired={completedRequired} requiredCount={required.length} onSelect={selectSection} /></aside>
      <section className={`${mobileMode === "preview" ? "hidden" : "block"} min-h-0 overflow-y-auto bg-white lg:block lg:border-r`}><Writer section={section} index={active} total={sections.length} count={count} over={over} saveState={saveState} onChange={update} onPrevious={() => selectSection(active - 1)} onNext={() => selectSection(active + 1)} onComplete={() => void complete()} canComplete={canCompleteProposal(sections)} status={status}><div className="xl:hidden"><CompactOutline sections={sections} active={active} onSelect={selectSection} progress={progress} completedRequired={completedRequired} requiredCount={required.length} /></div></Writer></section>
      <section className={`${mobileMode === "preview" ? "block" : "hidden"} min-h-0 lg:block`}><ProposalDocumentPreview document={documentData} activeSectionKey={section.key} /></section>
    </div>
  </main>;
}

type AppSection = SerializedProposalApplication["sections"][number];
function Outline({ sections, active, progress, completedRequired, requiredCount, onSelect }: { sections: AppSection[]; active: number; progress: number; completedRequired: number; requiredCount: number; onSelect: (index: number) => void }) { const requiredSections = sections.map((item, index) => ({ item, index })).filter(({ item }) => item.required); const optionalSections = sections.map((item, index) => ({ item, index })).filter(({ item }) => !item.required); return <div className="p-4"><p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">Proposal</p><div className="mt-4"><div className="flex justify-between text-xs"><span>{completedRequired} of {requiredCount} required</span><strong>{progress}%</strong></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${progress}%` }} /></div></div><nav className="mt-5 space-y-1" aria-label="Proposal outline">{requiredSections.map(({ item, index }) => <OutlineButton key={item.key} item={item} active={index === active} onClick={() => onSelect(index)} />)}{optionalSections.length ? <p className="px-2 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Optional</p> : null}{optionalSections.map(({ item, index }) => <OutlineButton key={item.key} item={item} active={index === active} onClick={() => onSelect(index)} />)}</nav></div>; }
function OutlineButton({ item, active, onClick }: { item: AppSection; active: boolean; onClick: () => void }) { const complete = Boolean(item.content.trim()); return <button onClick={onClick} aria-current={active ? "step" : undefined} className={`flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-xs leading-5 ${active ? "bg-primary/8 font-semibold text-primary" : "text-[#46514b] hover:bg-muted"}`}>{complete ? <Check className="mt-0.5 size-3.5 shrink-0 text-primary" /> : active ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" /> : <Circle className="mt-0.5 size-3.5 shrink-0 text-[#a0a7a3]" />}<span>{item.title}{!item.required ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">Optional</span> : null}</span></button>; }
function CompactOutline({ sections, active, onSelect, progress, completedRequired, requiredCount }: { sections: AppSection[]; active: number; onSelect: (index: number) => void; progress: number; completedRequired: number; requiredCount: number }) { return <div className="mb-6 border-b pb-5"><div className="flex items-center justify-between text-xs"><span>{completedRequired} of {requiredCount} required sections</span><strong>{progress}%</strong></div><select aria-label="Current proposal section" value={active} onChange={(event) => onSelect(Number(event.target.value))} className="mt-3 h-10 w-full rounded-md border bg-white px-3 text-sm">{sections.map((item, index) => <option key={item.key} value={index}>{item.content.trim() ? "✓ " : ""}{item.title}{item.required ? "" : " (Optional)"}</option>)}</select></div>; }
function Writer({ section, index, total, count, over, saveState, onChange, onPrevious, onNext, onComplete, canComplete, status, children }: { section: AppSection; index: number; total: number; count: number; over: number; saveState: SaveState; onChange: (value: string) => void; onPrevious: () => void; onNext: () => void; onComplete: () => void; canComplete: boolean; status: string; children: React.ReactNode }) { return <div className="mx-auto max-w-2xl px-5 py-6 sm:px-8 lg:py-8">{children}<p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Section {index + 1} of {total} · {section.required ? "Required" : "Optional"}</p><h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#1d2a24]">{section.title}</h2>{section.prompt ? <p className="mt-4 text-base font-medium leading-7 text-[#36433c]">{section.prompt}</p> : null}<details className="mt-5 border-y py-3"><summary className="cursor-pointer text-sm font-medium">How to answer this</summary><div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground"><p>{section.guidance}</p>{section.example ? <div className="border-l-2 border-primary/30 pl-3"><span className="font-medium text-foreground">Example: </span>{section.example}</div> : null}</div></details><label htmlFor={`response-${section.key}`} className="mt-6 block text-sm font-semibold text-[#26312b]">Your response</label><Textarea id={`response-${section.key}`} autoFocus className="mt-2 min-h-[360px] resize-y rounded-lg border border-[#b8c0bb] bg-white p-4 text-[16px] leading-7 shadow-sm placeholder:text-[#78827c] focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25 lg:min-h-[360px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:focus-visible:ring-0" placeholder={section.placeholder || `Write your ${section.title.toLowerCase()} here.`} value={section.content} onChange={(event) => onChange(event.target.value)} /><div className="mt-3 flex items-center justify-between border-t pt-3 text-xs"><span className={over ? "font-medium text-destructive" : "text-muted-foreground"}>{count}{section.wordLimit ? ` / ${section.wordLimit} words` : " words"}</span><span className={saveState === "failed" ? "text-destructive" : "text-muted-foreground"}>{section.required ? "Required" : "Optional"}</span></div>{over ? <p className="mt-2 text-xs text-destructive">Suggested limit exceeded by {over} {over === 1 ? "word" : "words"}.</p> : null}<div className="mt-8 flex items-center justify-between gap-3"><Button variant="outline" disabled={index === 0} onClick={onPrevious}><ChevronLeft className="size-4" /> Previous</Button>{index < total - 1 ? <Button onClick={onNext}>Next section <ChevronRight className="size-4" /></Button> : <Button disabled={!canComplete || status === "completed" || saveState === "saving"} onClick={onComplete}>{status === "completed" ? "Proposal complete" : "Mark complete"}</Button>}</div></div>; }
function SaveIndicator({ state, retry }: { state: SaveState; retry: () => void }) { if (state === "failed") return <button onClick={retry} className="flex items-center gap-1.5 text-xs text-destructive"><RefreshCw className="size-3.5" /> Save failed · Retry</button>; return <span aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">{state === "saving" ? <Save className="size-3.5" /> : <Check className="size-3.5" />}{state === "saving" ? "Saving..." : "Saved"}</span>; }
