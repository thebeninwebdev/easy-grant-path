import { load } from "cheerio";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { extractSemanticHtml, extractTextHeuristics } from "./extract-html";
import { extractJsonLd } from "./extract-jsonld";
import { extractOpenGraph, extractStandardMetadata } from "./extract-metadata";
import { fetchOpportunityPage } from "./fetch-page";
import { cleanText, emptyExtractedOpportunity, foundFields, mergeEmptyFields } from "./normalize-extracted-opportunity";
import { extractWithGemini, type OpportunityResearchResult } from "./ai-extract";
import { originalDomain, resolveOpportunityIdentity, type OpportunityIdentity } from "./opportunity-identity";
import type { ExtractionMethod, OpportunityExtractionResult } from "./types";
import { discoverImages } from "./image-discovery";

function contributed(before: string[], after: string[]) {
  return after.some((field) => !before.includes(field));
}

function identificationMeta(url: string, providedName: string | null, identity: OpportunityIdentity | null, canonicalName: string | null) {
  return {
    submittedUrl: url,
    providedOpportunityName: providedName,
    detectedOpportunityName: identity?.detectedName ?? null,
    resolvedSearchName: identity?.searchName ?? null,
    canonicalOpportunityName: canonicalName,
    source: identity?.source ?? null,
    confidence: identity?.confidence ?? null,
    organizationHint: identity?.organizationHint ?? null,
    originalDomain: identity?.originalDomain ?? originalDomain(url),
    searchQuery: identity?.searchQuery ?? null,
    cacheKey: identity?.cacheKey ?? null,
  };
}

function researchMeta(research: OpportunityResearchResult | null) {
  return research ? {
    cacheHit: research.cacheHit,
    resultCount: research.searchResultCount,
    acceptedResultCount: research.acceptedResultCount,
    sources: research.sources,
  } : null;
}

function applyResearch(data: ReturnType<typeof emptyExtractedOpportunity>, research: OpportunityResearchResult | null, identity: OpportunityIdentity) {
  if (!research) return { ...data, title: identity.searchName };
  const draft = research.draft;
  const enriched = mergeEmptyFields({ ...data, title: draft.title || identity.searchName }, {
    organization: draft.organization,
    agency: draft.agency,
    type: draft.type,
    summary: draft.summary,
    description: draft.description,
    countries: draft.countries,
    eligibleCountries: draft.eligibleCountries,
    applicantTypes: draft.applicantTypes,
    sectors: draft.sectors,
    fundingMin: draft.fundingMin,
    fundingMax: draft.fundingMax,
    currency: draft.currency,
    openingDate: draft.openingDate,
    deadline: draft.deadline,
  });
  if (draft.officialUrl && research.acceptedResultCount > 0) enriched.officialUrl = draft.officialUrl;
  return enriched;
}

async function researchSafely(url: string, text: string, identity: OpportunityIdentity, warnings: string[], methods: ExtractionMethod[]) {
  try {
    const research = await extractWithGemini(url, text, identity);
    if (research) {
      methods.push("ai");
      warnings.push(...research.draft.warnings);
    } else {
      warnings.push("Search enrichment is not configured; crawled page details were used.");
    }
    return research;
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : "Search enrichment was unavailable; crawled page details were used.");
    return null;
  }
}

export async function extractOpportunityFromUrl(url: string, providedOpportunityName?: string | null): Promise<OpportunityExtractionResult> {
  const providedName = cleanText(providedOpportunityName, 300);
  logger.info("Opportunity import started", { submittedUrl: url, adminNameProvided: Boolean(providedName) });

  let page: Awaited<ReturnType<typeof fetchOpportunityPage>>;
  try {
    page = await fetchOpportunityPage(url);
  } catch {
    const identity = resolveOpportunityIdentity({ submittedUrl: url, providedName });
    if (!identity) {
      throw new AppError("We couldn't confidently identify this opportunity from the page. Enter the opportunity name to help us research it.", "IDENTITY_REQUIRED", 422, { focusField: "opportunityName" });
    }
    const warnings = ["The submitted page could not be crawled. Research used the opportunity name you provided."];
    const methods: ExtractionMethod[] = [];
    const research = await researchSafely(url, "", identity, warnings, methods);
    let data = applyResearch({ ...emptyExtractedOpportunity(), discoveryUrl: url }, research, identity);
    data = { ...data, discoveryUrl: url, officialUrl: data.officialUrl || null };
    logger.info("Opportunity identity resolved", { submittedUrl: url, crawlerDetectedTitle: null, resolvedSearchName: identity.searchName, identitySource: identity.source, organizationHint: identity.organizationHint, searchQuery: identity.searchQuery, crawlFailed: true });
    return {
      data,
      meta: {
        sourceUrl: url,
        finalUrl: url,
        methods,
        warnings,
        fieldsFound: foundFields(data),
        requiresName: false,
        crawlFailed: true,
        identity: identificationMeta(url, providedName, identity, data.title),
        research: researchMeta(research),
      },
    };
  }

  const $ = load(page.html);
  let data = emptyExtractedOpportunity();
  const methods: ExtractionMethod[] = [];
  const warnings: string[] = [];
  function apply(method: ExtractionMethod, fields: Parameters<typeof mergeEmptyFields>[1]) {
    const before = foundFields(data);
    data = mergeEmptyFields(data, fields);
    if (contributed(before, foundFields(data))) methods.push(method);
  }

  const jsonLd = extractJsonLd($, page.finalUrl);
  const openGraph = extractOpenGraph($, page.finalUrl);
  const semantic = extractSemanticHtml($);
  const standard = extractStandardMetadata($, page.finalUrl);
  const prominentTitle = cleanText($("main h2, article h2, [role='main'] h2").first().text(), 300);

  apply("json-ld", jsonLd);
  apply("open-graph", openGraph);
  apply("semantic-html", semantic);
  apply("meta", standard);
  const heuristic = extractTextHeuristics($);
  apply("text-heuristics", heuristic.fields);
  warnings.push(...heuristic.warnings);

  const identity = resolveOpportunityIdentity({
    submittedUrl: page.requestedUrl,
    providedName,
    structuredTitle: jsonLd.title,
    openGraphTitle: openGraph.title,
    headingTitle: semantic.title,
    prominentTitle,
    pageTitle: standard.title,
    organization: data.organization || data.agency,
  });
  data = { ...data, title: identity?.searchName ?? null, discoveryUrl: page.requestedUrl };
  const images = discoverImages($, page.finalUrl, data.organization || data.agency);
  data = { ...data, opportunityImage: images.opportunityImage, organizationLogo: images.organizationLogo };

  logger.info("Opportunity identity resolved", {
    submittedUrl: page.requestedUrl,
    adminNameProvided: Boolean(providedName),
    crawlerDetectedTitle: identity?.detectedName ?? null,
    resolvedSearchName: identity?.searchName ?? null,
    identitySource: identity?.source ?? null,
    organizationHint: identity?.organizationHint ?? null,
    searchQuery: identity?.searchQuery ?? null,
  });

  if (!identity) {
    warnings.push("We couldn't confidently identify this opportunity from the page. Enter the opportunity name to help us research it.");
    return {
      data,
      meta: {
        sourceUrl: page.requestedUrl,
        finalUrl: page.finalUrl,
        methods,
        warnings,
        fieldsFound: foundFields(data),
        requiresName: true,
        crawlFailed: false,
        identity: identificationMeta(page.requestedUrl, providedName, null, null),
        research: null,
        images,
      },
    };
  }

  const root = $("main, article, [role='main']").first().length ? $("main, article, [role='main']").first().clone() : $("body").clone();
  root.find("script,style,noscript,svg,canvas,iframe,nav,footer,header,aside,form").remove();
  const text = root.text().replace(/\s+/g, " ").trim().slice(0, Number(process.env.MAX_TOTAL_TEXT_CHARS) || 100_000);
  const research = await researchSafely(page.finalUrl, text, identity, warnings, methods);
  data = applyResearch(data, research, identity);
  data = { ...data, discoveryUrl: page.requestedUrl, officialUrl: data.officialUrl || page.finalUrl };
  if (!data.description || !data.deadline) warnings.push("Some details could not be detected. Please complete and verify the form manually.");

  return {
    data,
    meta: {
      sourceUrl: page.requestedUrl,
      finalUrl: page.finalUrl,
      methods,
      warnings,
      fieldsFound: foundFields(data),
      requiresName: false,
      crawlFailed: false,
      identity: identificationMeta(page.requestedUrl, providedName, identity, data.title),
      research: researchMeta(research),
      images,
    },
  };
}

export type { ExtractedOpportunity, OpportunityExtractionResult } from "./types";


