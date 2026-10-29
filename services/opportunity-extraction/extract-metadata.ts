import type { CheerioAPI } from "cheerio";
import { cleanText, resolvePageUrl } from "./normalize-extracted-opportunity";
import type { ExtractedFields } from "./types";

function content($: CheerioAPI, selector: string) {
  return cleanText($(selector).first().attr("content"), 2_000);
}

export function extractOpenGraph($: CheerioAPI, baseUrl: string): ExtractedFields {
  return {
    title: content($, "meta[property='og:title']") ?? content($, "meta[name='twitter:title']"),
    organization: content($, "meta[property='og:site_name']"),
    summary: content($, "meta[property='og:description']") ?? content($, "meta[name='twitter:description']"),
    officialUrl: resolvePageUrl(content($, "meta[property='og:url']"), baseUrl),
  };
}

export function extractStandardMetadata($: CheerioAPI, baseUrl: string): ExtractedFields {
  return {
    title: cleanText($("title").first().text(), 300),
    organization: content($, "meta[name='application-name']"),
    summary: content($, "meta[name='description']"),
    officialUrl: resolvePageUrl($("link[rel='canonical']").first().attr("href"), baseUrl),
  };
}
