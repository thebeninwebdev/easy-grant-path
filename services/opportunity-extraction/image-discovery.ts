import type { CheerioAPI } from "cheerio";
import { resolvePageUrl } from "./normalize-extracted-opportunity";

export interface OpportunityImageMetadata { url: string; sourceUrl: string; type: "official-banner" | "open-graph" | "organization-logo" | "favicon"; origin: "page-metadata" | "page-image" | "organization-site"; verified: boolean; }
export interface DiscoveredImages { opportunityImage: OpportunityImageMetadata | null; organizationLogo: OpportunityImageMetadata | null; candidateCount: number; }
const ignored = /(pixel|tracking|icon|avatar|advert|cookie|share|facebook|twitter)/i;
function pick($: CheerioAPI, selector: string, baseUrl: string, sourceUrl: string, type: OpportunityImageMetadata["type"], origin: OpportunityImageMetadata["origin"], verified: boolean) {
  const value = $(selector).first().attr("content") ?? $(selector).first().attr("src") ?? null;
  const url = resolvePageUrl(value, baseUrl);
  return url && !ignored.test(`${url} ${$(selector).first().attr("alt") ?? ""}`) && /\.(avif|gif|jpe?g|png|webp|svg)(?:[?#].*)?$/i.test(url) ? { url, sourceUrl, type, origin, verified } : null;
}
/** Keeps external official assets remote, with provenance, rather than copying potentially copyrighted material. */
export function discoverImages($: CheerioAPI, pageUrl: string, organization?: string | null): DiscoveredImages {
  const opportunityImage = pick($, "meta[property='og:image']", pageUrl, pageUrl, "open-graph", "page-metadata", true) ?? pick($, "meta[name='twitter:image']", pageUrl, pageUrl, "open-graph", "page-metadata", true);
  const organizationLogo = pick($, "meta[itemprop='logo']", pageUrl, pageUrl, "organization-logo", "page-metadata", Boolean(organization)) ?? pick($, "img[alt*='logo' i]", pageUrl, pageUrl, "organization-logo", "page-image", false);
  return { opportunityImage, organizationLogo, candidateCount: $("meta[property='og:image'],meta[name='twitter:image'],meta[itemprop='logo'],img[alt*='logo' i]").length };
}
