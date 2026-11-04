import { load, type CheerioAPI } from "cheerio";
import type { AnyNode } from "domhandler";
import { logger } from "../../lib/logger.ts";
import { fetchOpportunityPage } from "./fetch-page.ts";
import { hasWrongYear, originalDomain, type OpportunityIdentity, type RankedResearchSource } from "./opportunity-identity.ts";
import { resolvePageUrl } from "./normalize-extracted-opportunity.ts";
import { validateImageAsset, type ImageValidationResult } from "./image-validation.ts";

export type OpportunityImageKind = "opportunity-banner" | "programme-image" | "organization-logo" | "generic-image" | "irrelevant";
export interface OpportunityImageMetadata {
  url: string;
  sourceUrl: string;
  type: "official-banner" | "programme-image" | "open-graph" | "organization-logo" | "favicon" | "generic-image";
  origin: "page-metadata" | "structured-data" | "page-image" | "organization-site" | "brand-asset";
  verified: boolean;
  confidence?: "high" | "medium" | "low";
  width?: number;
  height?: number;
  alt?: string;
  discoveredAt?: string;
  selectionReasons?: string[];
  reviewStatus?: "approved" | "unreviewed";
}
export interface ImageCandidate {
  url: string;
  sourceUrl: string;
  kind: OpportunityImageKind;
  width?: number;
  height?: number;
  alt?: string;
  context?: string;
  position?: number;
  metadata: "open-graph" | "twitter" | "json-ld" | "html" | "favicon";
  authority: number;
  score: number;
  reasons: string[];
}
export interface ImageSourcePage { url: string; html: string; authority: number; official: boolean; }
export interface DiscoveredImages {
  opportunityImage: OpportunityImageMetadata | null;
  organizationLogo: OpportunityImageMetadata | null;
  candidateCount: number;
  inspectedSources: string[];
  rejectedCandidates: Array<{ url: string; reasons: string[] }>;
  cacheHits: number;
  durationMs: number;
}
interface DiscoveryInput {
  originalPage?: ImageSourcePage | null;
  researchSources?: RankedResearchSource[];
  identity: OpportunityIdentity;
  organization?: string | null;
  officialUrl?: string | null;
  maxResearchPages?: number;
  validate?: (url: string) => Promise<ImageValidationResult>;
}

const BAD_IMAGE = /(pixel|tracking|spacer|cookie|avatar|advert|doubleclick|share[-_]?button|facebook|instagram|linkedin|twitter|youtube|whatsapp|spinner|loader|captcha|qr[-_]?code)/i;
const LOGO_WORDS = /\b(logo|brandmark|wordmark|emblem|crest)\b/i;
const BANNER_WORDS = /\b(banner|hero|cover|programme|program|challenge|grant|award|competition|fellowship|fund|call[-_ ]for[-_ ]applications?)\b/i;
const AGGREGATORS = ["opportunitydesk.org", "opportunitiesforafricans.com", "fundsforngos.org", "scholarshipscorner.website"];
const SUPPORTED_EXTENSION = /\.(avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i;
const globalImageCache = globalThis as typeof globalThis & {
  opportunityOrganizationLogoCache?: Map<string, OpportunityImageMetadata>;
  opportunitySelectionCache?: Map<string, { expiresAt: number; value: DiscoveredImages }>;
};
const logoCache = globalImageCache.opportunityOrganizationLogoCache ?? new Map<string, OpportunityImageMetadata>();
const selectionCache = globalImageCache.opportunitySelectionCache ?? new Map<string, { expiresAt: number; value: DiscoveredImages }>();
globalImageCache.opportunityOrganizationLogoCache = logoCache;
globalImageCache.opportunitySelectionCache = selectionCache;

function hostname(value: string) { return originalDomain(value); }
function words(value: string | null | undefined) {
  return value?.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").match(/[a-z0-9]{3,}/g) ?? [];
}
function overlap(expected: string | null | undefined, candidate: string) {
  const expectedWords = new Set(words(expected).filter((word) => !["application", "applications", "programme", "program", "opportunity"].includes(word)));
  if (!expectedWords.size) return 0;
  return [...expectedWords].filter((word) => candidate.toLowerCase().includes(word)).length / expectedWords.size;
}
function bestSrcset(value: string | undefined) {
  return value?.split(",").map((item) => item.trim().split(/\s+/)[0]).filter(Boolean).at(-1) ?? null;
}
function imageValue($: CheerioAPI, element: AnyNode) {
  const node = $(element);
  return node.attr("data-src") ?? bestSrcset(node.attr("data-srcset")) ?? bestSrcset(node.attr("srcset")) ?? node.attr("src") ?? null;
}
function imageContext($: CheerioAPI, element: AnyNode) {
  const node = $(element);
  const container = node.closest("figure,section,header,main,article,div");
  return [node.attr("alt"), node.attr("title"), node.attr("class"), container.attr("class"), container.attr("id"), container.find("figcaption,h1,h2,h3").first().text()]
    .filter(Boolean).join(" ").replace(/\s+/g, " ").trim().slice(0, 500);
}
function add(target: ImageCandidate[], seen: Set<string>, candidate: Omit<ImageCandidate, "score" | "reasons" | "kind">) {
  if (seen.has(candidate.url) || (!SUPPORTED_EXTENSION.test(candidate.url) && candidate.metadata === "html")) return;
  seen.add(candidate.url);
  target.push({ ...candidate, kind: "generic-image", score: 0, reasons: [] });
}
function jsonLdImages(value: unknown, key = ""): Array<{ value: string; logo: boolean }> {
  if (typeof value === "string") return /^(image|logo|primaryImageOfPage)$/i.test(key) ? [{ value, logo: /^logo$/i.test(key) }] : [];
  if (Array.isArray(value)) return value.flatMap((item) => jsonLdImages(item, key));
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([childKey, child]) => {
    if (/^(url|contentUrl)$/i.test(childKey) && typeof child === "string" && /^(image|logo|primaryImageOfPage)$/i.test(key)) return [{ value: child, logo: /^logo$/i.test(key) }];
    return jsonLdImages(child, childKey);
  });
}

export function collectImageCandidates($: CheerioAPI, page: ImageSourcePage): ImageCandidate[] {
  const candidates: ImageCandidate[] = [];
  const seen = new Set<string>();
  const width = Number($("meta[property='og:image:width']").first().attr("content")) || undefined;
  const height = Number($("meta[property='og:image:height']").first().attr("content")) || undefined;
  const metadata = [
    ["meta[property='og:image:secure_url']", "open-graph"],
    ["meta[property='og:image']", "open-graph"],
    ["meta[name='twitter:image'],meta[property='twitter:image']", "twitter"],
    ["meta[name='twitter:image:src'],meta[property='twitter:image:src']", "twitter"],
  ] as const;
  for (const [selector, source] of metadata) $(selector).each((position, element) => {
    const url = resolvePageUrl($(element).attr("content"), page.url);
    if (url) add(candidates, seen, { url, sourceUrl: page.url, width, height, context: $("title").text(), position, metadata: source, authority: page.authority });
  });
  $("script[type='application/ld+json']").each((_index, element) => {
    try {
      for (const item of jsonLdImages(JSON.parse($(element).text()))) {
        const url = resolvePageUrl(item.value, page.url);
        if (url) add(candidates, seen, { url, sourceUrl: page.url, context: $("title").text(), alt: item.logo ? "Organization logo" : undefined, metadata: "json-ld", authority: page.authority });
      }
    } catch { /* Ignore malformed third-party structured data. */ }
  });
  $("main img,article img,[role='main'] img,main picture source,article picture source,[role='main'] picture source,img[data-src],img[data-srcset]").each((position, element) => {
    const url = resolvePageUrl(imageValue($, element), page.url);
    if (!url) return;
    const node = $(element);
    add(candidates, seen, {
      url, sourceUrl: page.url,
      width: Number(node.attr("width")) || undefined,
      height: Number(node.attr("height")) || undefined,
      alt: node.attr("alt")?.trim() || undefined,
      context: imageContext($, element),
      position,
      metadata: "html", authority: page.authority,
    });
  });
  $("main a[href],article a[href],[role='main'] a[href]").each((position, element) => {
    const node = $(element);
    const url = resolvePageUrl(node.attr("href"), page.url);
    const linkContext = [node.text(), node.attr("title"), node.attr("class")].filter(Boolean).join(" ");
    if (url && SUPPORTED_EXTENSION.test(url) && BANNER_WORDS.test(linkContext)) {
      add(candidates, seen, { url, sourceUrl: page.url, alt: node.text().trim() || undefined, context: linkContext, position, metadata: "html", authority: page.authority });
    }
  });
  $("link[rel~='icon'],link[rel='apple-touch-icon']").each((_index, element) => {
    const url = resolvePageUrl($(element).attr("href"), page.url);
    if (url) add(candidates, seen, { url, sourceUrl: page.url, alt: "Website icon", metadata: "favicon", authority: page.authority });
  });
  return candidates;
}

export function scoreImageCandidate(candidate: ImageCandidate, identity: OpportunityIdentity, organization?: string | null): ImageCandidate {
  const reasons: string[] = [];
  const text = [candidate.url, candidate.alt, candidate.context].filter(Boolean).join(" ");
  const domain = hostname(candidate.sourceUrl);
  let score = candidate.authority * 8;
  if (candidate.authority >= 4) reasons.push("authoritative source");
  if (candidate.metadata === "open-graph" || candidate.metadata === "json-ld") { score += 10; reasons.push(candidate.metadata + " metadata"); }
  if (candidate.metadata === "favicon") score -= 10;
  if (BAD_IMAGE.test(text)) { score -= 100; reasons.push("known icon, tracking, or advertising pattern"); }
  const titleMatch = overlap(identity.searchName, text);
  if (titleMatch >= 0.6) { score += 38; reasons.push("strong opportunity title match"); }
  else if (titleMatch >= 0.3) { score += 20; reasons.push("partial opportunity title match"); }
  if (hasWrongYear(text, identity.searchName)) { score -= 80; reasons.push("wrong opportunity year"); }
  if (overlap(organization || identity.organizationHint, text) >= 0.5) { score += 24; reasons.push("funding organization match"); }
  if (LOGO_WORDS.test(text)) { score += 12; reasons.push("logo or brand metadata"); }
  if (BANNER_WORDS.test(text)) { score += 12; reasons.push("programme or banner metadata"); }
  if ((candidate.position ?? 99) <= 2) { score += 5; reasons.push("prominent page position"); }
  if (/\.svg(?:[?#]|$)/i.test(candidate.url) && LOGO_WORDS.test(text)) score += 5;
  if (/\.(?:avif|jpe?g|png|webp)(?:[?#]|$)/i.test(candidate.url) && !LOGO_WORDS.test(text)) score += 3;
  if (candidate.width && candidate.height) {
    const pixels = candidate.width * candidate.height;
    if (candidate.width <= 80 || candidate.height <= 40 || pixels < 10_000) { score -= 70; reasons.push("tiny image dimensions"); }
    else if (candidate.width >= 600 && candidate.height >= 250) { score += 16; reasons.push("useful promotional dimensions"); }
    const ratio = candidate.width / candidate.height;
    if (ratio >= 1.3 && ratio <= 3.2) score += 8;
  }
  if (candidate.url.startsWith("https:")) score += 3;
  else { score -= 4; reasons.push("non-HTTPS asset"); }
  if (AGGREGATORS.some((item) => domain === item || domain.endsWith("." + item)) && LOGO_WORDS.test(text)) {
    score -= 120;
    reasons.push("aggregator branding");
  }
  let kind: OpportunityImageKind = "generic-image";
  if (score < 0 || BAD_IMAGE.test(text) || hasWrongYear(text, identity.searchName)) kind = "irrelevant";
  else if (LOGO_WORDS.test(text) || candidate.metadata === "favicon") kind = "organization-logo";
  else if (titleMatch >= 0.55 && (BANNER_WORDS.test(text) || candidate.metadata !== "html")) kind = "opportunity-banner";
  else if (BANNER_WORDS.test(text) || titleMatch >= 0.3) kind = "programme-image";
  return { ...candidate, kind, score, reasons };
}

function selectedMetadata(candidate: ImageCandidate, result: ImageValidationResult, logo: boolean): OpportunityImageMetadata {
  return {
    url: result.finalUrl,
    sourceUrl: candidate.sourceUrl,
    type: logo ? (candidate.metadata === "favicon" ? "favicon" : "organization-logo") : candidate.kind === "opportunity-banner" ? "official-banner" : candidate.kind === "programme-image" ? "programme-image" : candidate.metadata === "open-graph" ? "open-graph" : "generic-image",
    origin: logo ? (candidate.metadata === "favicon" ? "organization-site" : "brand-asset") : candidate.metadata === "html" ? "page-image" : candidate.metadata === "json-ld" ? "structured-data" : "page-metadata",
    verified: true,
    confidence: candidate.score >= 65 ? "high" : candidate.score >= 40 ? "medium" : "low",
    width: result.width ?? candidate.width,
    height: result.height ?? candidate.height,
    alt: candidate.alt,
    discoveredAt: new Date().toISOString(),
    selectionReasons: [...candidate.reasons, ...result.reasons],
    reviewStatus: "unreviewed",
  };
}

function sourceAuthority(source: RankedResearchSource, officialUrl?: string | null) {
  const domain = hostname(source.url);
  const officialDomain = officialUrl ? hostname(officialUrl) : "";
  if (officialDomain && (domain === officialDomain || domain.endsWith("." + officialDomain))) return 5;
  if (source.reason === "institutional") return 5;
  if (source.reason === "identity-match") return 4;
  if (source.reason === "same-domain") return 3;
  return source.reason === "aggregator" ? 1 : 2;
}

async function inspectPages(input: DiscoveryInput) {
  const pages: ImageSourcePage[] = input.originalPage ? [input.originalPage] : [];
  const domains = new Set(pages.map((page) => hostname(page.url)));
  const sources = (input.researchSources ?? []).filter((source) => source.accepted)
    .sort((a, b) => b.priority - a.priority)
    .filter((source) => !domains.has(hostname(source.url)))
    .slice(0, input.maxResearchPages ?? 3);
  for (const source of sources) {
    try {
      const fetched = await fetchOpportunityPage(source.url);
      pages.push({ url: fetched.finalUrl, html: fetched.html, authority: sourceAuthority(source, input.officialUrl), official: source.reason !== "aggregator" });
      domains.add(hostname(fetched.finalUrl));
    } catch (error) {
      logger.debug("Image research page could not be inspected", { domain: hostname(source.url), error: error instanceof Error ? error.message : "Unknown error" });
    }
  }
  return pages;
}

export async function discoverImages(input: DiscoveryInput): Promise<DiscoveredImages> {
  const startedAt = Date.now();
  const cached = selectionCache.get(input.identity.cacheKey);
  if (cached && cached.expiresAt > startedAt) return { ...cached.value, cacheHits: cached.value.cacheHits + 1 };
  const organizationKey = words(input.organization || input.identity.organizationHint).join("-");
  const cachedLogo = organizationKey ? logoCache.get(organizationKey) ?? null : null;
  const pages = await inspectPages(input);
  const candidates = pages.flatMap((page) => collectImageCandidates(load(page.html), page))
    .map((candidate) => scoreImageCandidate(candidate, input.identity, input.organization))
    .sort((a, b) => b.score - a.score);
  const validate = input.validate ?? validateImageAsset;
  const results = new Map<string, ImageValidationResult>();
  const top = candidates.filter((candidate) => candidate.kind !== "irrelevant").slice(0, 10);
  await Promise.all(top.map(async (candidate) => results.set(candidate.url, await validate(candidate.url))));
  const usable = top.filter((candidate) => results.get(candidate.url)?.valid);
  const banner = usable.find((candidate) => candidate.kind === "opportunity-banner" && candidate.score >= 28)
    ?? usable.find((candidate) => candidate.kind === "programme-image" && candidate.score >= 28)
    ?? usable.find((candidate) => candidate.kind === "generic-image" && candidate.score >= 45)
    ?? null;
  const logo = usable.find((candidate) => candidate.kind === "organization-logo" && candidate.score >= 22 && candidate.url !== banner?.url) ?? null;
  const opportunityImage = banner ? selectedMetadata(banner, results.get(banner.url)!, false) : null;
  const organizationLogo = cachedLogo ?? (logo ? selectedMetadata(logo, results.get(logo.url)!, true) : null);
  if (organizationKey && organizationLogo?.verified && organizationLogo.type !== "favicon") logoCache.set(organizationKey, organizationLogo);
  const rejectedCandidates = candidates
    .filter((candidate) => candidate.kind === "irrelevant" || (results.has(candidate.url) && !results.get(candidate.url)!.valid))
    .slice(0, 20)
    .map((candidate) => ({ url: candidate.url, reasons: [...candidate.reasons, ...(results.get(candidate.url)?.reasons ?? [])] }));
  const value: DiscoveredImages = {
    opportunityImage,
    organizationLogo,
    candidateCount: candidates.length,
    inspectedSources: pages.map((page) => page.url),
    rejectedCandidates,
    cacheHits: cachedLogo ? 1 : 0,
    durationMs: Date.now() - startedAt,
  };
  selectionCache.set(input.identity.cacheKey, { expiresAt: Date.now() + 6 * 60 * 60 * 1_000, value });
  logger.info("Opportunity image discovery completed", {
    opportunity: input.identity.searchName,
    candidates: value.candidateCount,
    sourcesInspected: value.inspectedSources.length,
    officialSources: pages.filter((page) => page.official).length,
    selectedBanner: opportunityImage?.url ?? null,
    selectedLogo: organizationLogo?.url ?? null,
    rejected: rejectedCandidates.length,
    cacheHits: value.cacheHits,
    durationMs: value.durationMs,
  });
  return value;
}

export function clearImageDiscoveryCaches() {
  logoCache.clear();
  selectionCache.clear();
}
