"use client";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useLayoutEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ProposalDocumentData, ProposalDocumentSection } from "@/lib/proposal-document";

type DocumentBlock = { id: string; sectionKey?: string; heading?: string; text?: string; empty?: boolean; first?: boolean };
const PAGE_CONTENT_HEIGHT = 943;

function chunks(paragraph: string) {
  const words = paragraph.split(/\s+/).filter(Boolean);
  const result: string[] = [];
  for (let start = 0; start < words.length; start += 85) result.push(words.slice(start, start + 85).join(" "));
  return result.length ? result : [""];
}

function sectionBlocks(section: ProposalDocumentSection): DocumentBlock[] {
  const paragraphs = section.paragraphs.flatMap(chunks);
  if (!paragraphs.length) return [{ id: `${section.key}-empty`, sectionKey: section.key, heading: section.title, empty: true, first: true }];
  return paragraphs.map((text, index) => ({ id: `${section.key}-${index}`, sectionKey: section.key, heading: index === 0 ? section.title : undefined, text, first: index === 0 }));
}

export function ProposalDocumentPreview({ document, activeSectionKey }: { document: ProposalDocumentData; activeSectionKey?: string }) {
  const blocks = useMemo(() => document.sections.flatMap(sectionBlocks), [document]);
  const [pages, setPages] = useState<DocumentBlock[][]>([blocks]);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(0.72);
  useLayoutEffect(() => {
    const measured = new Map<string, number>();
    globalThis.document.querySelectorAll<HTMLElement>("[data-proposal-measure]").forEach((element) => measured.set(element.dataset.proposalMeasure || "", element.offsetHeight));
    const next: DocumentBlock[][] = [];
    let current: DocumentBlock[] = [];
    let used = 0;
    for (const block of blocks) {
      const height = (measured.get(block.id) || 120) + 18;
      if (current.length && used + height > PAGE_CONTENT_HEIGHT) { next.push(current); current = []; used = 0; }
      current.push(block); used += height;
    }
    if (current.length || !next.length) next.push(current);
    const frame = requestAnimationFrame(() => setPages(next));
    return () => cancelAnimationFrame(frame);
  }, [blocks]);
  const allPages = useMemo(() => [null, ...pages], [pages]);
  const safePage = Math.min(page, allPages.length - 1);
  useLayoutEffect(() => { if (!activeSectionKey) return; const target = pages.findIndex((items) => items.some((item) => item.sectionKey === activeSectionKey)); if (target < 0) return; const frame = requestAnimationFrame(() => setPage(target + 1)); return () => cancelAnimationFrame(frame); }, [activeSectionKey, pages]);
  return <div className="flex h-full min-h-0 flex-col bg-[#e7e9e7]">
    <div className="flex items-center justify-between border-b bg-white/95 px-3 py-2 text-sm">
      <div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="Previous page" disabled={safePage === 0} onClick={() => setPage((value) => Math.max(0, value - 1))}><ChevronLeft className="size-4" /></Button><span className="min-w-24 text-center tabular-nums">Page {safePage + 1} of {allPages.length}</span><Button size="sm" variant="ghost" aria-label="Next page" disabled={safePage >= allPages.length - 1} onClick={() => setPage((value) => Math.min(allPages.length - 1, value + 1))}><ChevronRight className="size-4" /></Button></div>
      <div className="flex items-center gap-1"><Button size="sm" variant="ghost" aria-label="Zoom out" disabled={zoom <= 0.55} onClick={() => setZoom((value) => Math.max(0.55, value - 0.1))}><Minus className="size-4" /></Button><button className="min-w-12 rounded px-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setZoom(0.72)}>{Math.round(zoom * 100)}%</button><Button size="sm" variant="ghost" aria-label="Zoom in" disabled={zoom >= 1} onClick={() => setZoom((value) => Math.min(1, value + 0.1))}><Plus className="size-4" /></Button></div>
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-5" tabIndex={0} aria-label="Proposal document preview">
      <div className="mx-auto" style={{ width: 794 * zoom, height: 1123 * zoom }}><div className="relative h-[1123px] w-[794px] overflow-hidden bg-white text-[#26312b] shadow-[0_8px_28px_rgba(25,35,29,0.16)]" style={{ transform: `scale(${zoom})`, transformOrigin: "top left", fontFamily: "Arial, Helvetica, sans-serif" }}>
        {safePage === 0 ? <CoverPage document={document} /> : <ContentPage blocks={pages[safePage - 1] || []} pageNumber={safePage} total={pages.length} title={document.metadata.title} />}
      </div></div>
    </div>
    <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0 w-[614px] bg-white px-0 text-[#26312b]" style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>{blocks.map((block) => <Block key={block.id} block={block} measure />)}</div>
  </div>;
}

function CoverPage({ document }: { document: ProposalDocumentData }) { return <div className="flex h-full flex-col px-[90px] py-[94px]"><div className="mt-20"><h1 className="max-w-[560px] text-[30px] font-bold leading-[1.18] tracking-[-0.02em] text-[#1d2a24]">{document.metadata.title}</h1><div className="mt-8 h-[2px] w-24 bg-[#34785b]" /></div><dl className="mt-20 grid gap-8"><CoverRow label="Prepared for" value={document.metadata.opportunityTitle} /><CoverRow label="Prepared by" value={document.metadata.organization || "Applicant"} /><CoverRow label="Date" value={document.metadata.preparedOn} /></dl>{document.metadata.status === "draft" ? <p className="mt-10 text-[12px] italic text-[#68716c]">Draft proposal</p> : null}<p className="mt-auto text-[10px] text-[#7a827d]">Prepared proposal</p></div>; }
function CoverRow({ label, value }: { label: string; value: string }) { return <div><dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#65706a]">{label}</dt><dd className="mt-2 text-[14px] font-semibold leading-6 text-[#26312b]">{value}</dd></div>; }
function ContentPage({ blocks, pageNumber, total, title }: { blocks: DocumentBlock[]; pageNumber: number; total: number; title: string }) { return <div className="flex h-full flex-col px-[90px] pb-[52px] pt-[86px]"><div className="min-h-0 flex-1">{blocks.map((block) => <Block key={block.id} block={block} />)}</div><footer className="flex items-center justify-between border-t border-[#d9ddda] pt-3 text-[9px] text-[#68716c]"><span className="max-w-[440px] truncate">{title}</span><span>Page {pageNumber} of {total}</span></footer></div>; }
function Block({ block, measure = false }: { block: DocumentBlock; measure?: boolean }) { return <div data-proposal-measure={measure ? block.id : undefined} data-section-key={block.sectionKey} className={block.first ? "mb-[18px]" : "mb-[14px]"}>{block.heading ? <h2 className="mb-[12px] text-[18px] font-bold leading-[1.25] text-[#1d2a24]">{block.heading}</h2> : null}{block.empty ? <p className="text-[14px] italic leading-[1.55] text-[#9aa09c]">Start writing this section to see it here.</p> : <p className="whitespace-pre-wrap text-[14px] leading-[1.55] text-[#26312b]">{block.text}</p>}</div>; }
