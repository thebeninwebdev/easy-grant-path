export interface ProposalDocumentSourceSection {
  key: string;
  title: string;
  content: string;
  required: boolean;
  order: number;
  enabled?: boolean;
}

export interface ProposalDocumentSource {
  opportunityTitle: string;
  organization: string;
  templateTitle: string;
  status: "draft" | "completed";
  deadline?: string | null;
  sections: ProposalDocumentSourceSection[];
}

export interface ProposalDocumentSection extends ProposalDocumentSourceSection {
  paragraphs: string[];
  empty: boolean;
}

export interface ProposalDocumentData {
  metadata: {
    title: string;
    opportunityTitle: string;
    organization: string;
    preparedOn: string;
    status: "draft" | "completed";
  };
  sections: ProposalDocumentSection[];
  incompleteRequiredCount: number;
}

function cleanParagraphs(content: string) {
  return content.replace(/\r\n/g, "\n").split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function buildProposalDocument(source: ProposalDocumentSource, mode: "preview" | "export" = "preview"): ProposalDocumentData {
  const ordered = source.sections.filter((section) => section.enabled !== false).slice().sort((a, b) => a.order - b.order);
  const incompleteRequiredCount = ordered.filter((section) => section.required && !section.content.trim()).length;
  const sections = ordered.filter((section) => mode === "preview" || section.required || section.content.trim()).map((section) => ({
    ...section,
    content: section.content.trim(),
    paragraphs: cleanParagraphs(section.content),
    empty: !section.content.trim(),
  }));
  return {
    metadata: {
      title: source.templateTitle || source.opportunityTitle || "Proposal",
      opportunityTitle: source.opportunityTitle,
      organization: source.organization,
      preparedOn: new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date()),
      status: source.status,
    },
    sections,
    incompleteRequiredCount,
  };
}

export function sanitizeProposalFilename(title: string) {
  const safe = title.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
  return `${safe || "proposal"}-Proposal`;
}
