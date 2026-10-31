export interface ProgressSection { required: boolean; content: string }
export interface TemplateSnapshotSection { key: string; title: string; guidance: string; prompt?: string; example?: string; placeholder?: string; wordLimit?: number; enabled?: boolean; required: boolean; order: number }
export function meaningful(value: string) { return value.trim().length > 0; }
export function calculateProposalProgress(sections: ProgressSection[]) { const required = sections.filter((section) => section.required); if (!required.length) return 100; const complete = required.filter((section) => meaningful(section.content)).length; return Math.round((complete / required.length) * 100); }
export function canCompleteProposal(sections: ProgressSection[]) { return sections.filter((section) => section.required).every((section) => meaningful(section.content)); }
export function isPublishedTemplateVisible(status: string, sectionCount: number) { return status === "published" && sectionCount > 0; }
export function ownsProposal(requestingUserId: string, ownerUserId: string) { return requestingUserId === ownerUserId; }
export function snapshotTemplateSections(sections: TemplateSnapshotSection[]) { return sections.slice().sort((a, b) => a.order - b.order).map((section) => ({ key: section.key, title: section.title, guidanceSnapshot: section.guidance, promptSnapshot: section.prompt, exampleSnapshot: section.example, placeholderSnapshot: section.placeholder, wordLimit: section.wordLimit, required: section.required, order: section.order, content: "" })); }
