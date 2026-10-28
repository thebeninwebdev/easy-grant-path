import type { OpportunitySource } from "@/types/opportunities";
export const exampleSource: OpportunitySource = { slug: "example", name: "Example", type: "manual", async fetch() { return []; }, async normalize() { return null; }, assessRelevance() { return { relevant: true, score: 100, reasons: ["Manual source"] }; } };
