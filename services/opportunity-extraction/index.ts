import { load } from "cheerio";
import { extractSemanticHtml, extractTextHeuristics } from "./extract-html";
import { extractJsonLd } from "./extract-jsonld";
import { extractOpenGraph, extractStandardMetadata } from "./extract-metadata";
import { fetchOpportunityPage } from "./fetch-page";
import { emptyExtractedOpportunity, foundFields, mergeEmptyFields } from "./normalize-extracted-opportunity";
import { extractWithGemini } from "./ai-extract";
import type { ExtractedFields, ExtractionMethod, OpportunityExtractionResult } from "./types";

function contributed(before: string[], after: string[]) {
  return after.some((field) => !before.includes(field));
}

export async function extractOpportunityFromUrl(url: string): Promise<OpportunityExtractionResult> {
  const page = await fetchOpportunityPage(url);
  const $ = load(page.html);
  let data = emptyExtractedOpportunity();
  const methods: ExtractionMethod[] = [];
  const warnings: string[] = [];

  function apply(method: ExtractionMethod, fields: ExtractedFields) {
    const before = foundFields(data);
    data = mergeEmptyFields(data, fields);
    if (contributed(before, foundFields(data))) methods.push(method);
  }

  apply("json-ld", extractJsonLd($, page.finalUrl));
  apply("open-graph", extractOpenGraph($, page.finalUrl));
  apply("meta", extractStandardMetadata($, page.finalUrl));
  apply("semantic-html", extractSemanticHtml($));
  const heuristic = extractTextHeuristics($);
  apply("text-heuristics", heuristic.fields);
  warnings.push(...heuristic.warnings);

  data = mergeEmptyFields(data, {
    officialUrl: page.finalUrl,
    discoveryUrl: page.requestedUrl,
  });

  const fields = foundFields(data);
  if (!fields.length || fields.every((field) => field === "officialUrl" || field === "discoveryUrl")) {
    warnings.push("No reliable opportunity details were detected on this page.");
  } else if (!data.title || !data.description || !data.deadline) {
    warnings.push("Some details could not be detected. Please complete and verify the form manually.");
  }

  const root = $("main, article, [role='main']").first().length ? $("main, article, [role='main']").first().clone() : $("body").clone();
  root.find("script,style,noscript,svg,canvas,iframe,nav,footer,header,aside,form").remove();
  const text = root.text().replace(/\s+/g, " ").trim().slice(0, Number(process.env.MAX_TOTAL_TEXT_CHARS) || 100_000);
  try {
    const aiDraft = await extractWithGemini(page.finalUrl, data.title, text);
    if (aiDraft) {
      data = mergeEmptyFields(data, { title: aiDraft.title, organization: aiDraft.organization, agency: aiDraft.agency, type: aiDraft.type, summary: aiDraft.summary, description: aiDraft.description, countries: aiDraft.countries, eligibleCountries: aiDraft.eligibleCountries, applicantTypes: aiDraft.applicantTypes, sectors: aiDraft.sectors, fundingMin: aiDraft.fundingMin, fundingMax: aiDraft.fundingMax, currency: aiDraft.currency, openingDate: aiDraft.openingDate, deadline: aiDraft.deadline, officialUrl: aiDraft.officialUrl });
      warnings.push(...aiDraft.warnings);
      methods.push("ai");
    }
  } catch {
    warnings.push("AI extraction was unavailable; page metadata and readable content were used instead.");
  }

  return {
    data,
    meta: {
      sourceUrl: page.requestedUrl,
      finalUrl: page.finalUrl,
      methods,
      warnings,
      fieldsFound: foundFields(data),
    },
  };
}

export type { ExtractedOpportunity, OpportunityExtractionResult } from "./types";
