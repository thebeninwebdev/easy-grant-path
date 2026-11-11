import { createHash } from "crypto";
import * as cheerio from "cheerio";
import { normalizePlainText, sanitizeOpportunityHtml } from "@/lib/opportunity-content";
import { assessOpportunityRelevance, detectOpportunityType, findExplicitEligibleLocations, findMentionedCountries, isFundingOpportunity, normalizeMatchingText } from "@/sources/shared/relevance";
import type { NormalizedOpportunity, RawOpportunity, RelevanceResult } from "@/types/opportunities";

const MAX_BYTES = 1_500_000;
export async function fetchOfficialHtml(url: string) {
  const origin = new URL(url); let last: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { headers: { "user-agent": "EasyGrantPath/1.0 (+https://www.easygrantpath.com)", accept: "text/html" }, redirect: "follow", signal: controller.signal, cache: "no-store" });
      const finalUrl = new URL(response.url);
      if (origin.hostname !== finalUrl.hostname || finalUrl.protocol !== "https:") throw new Error("Unsafe redirect from official source");
      if (!response.ok) throw new Error(`Official source request failed (${response.status})`);
      if (Number(response.headers.get("content-length") || 0) > MAX_BYTES) throw new Error("Official source response is too large");
      const html = await response.text(); if (html.length > MAX_BYTES) throw new Error("Official source response is too large");
      return { html, url: response.url };
    } catch (error) {
      last = error instanceof Error ? error : new Error("Official source request failed");
      if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    } finally { clearTimeout(timer); }
  }
  throw last;
}
export function canonicalUrl(value: string, base?: string) {
  try {
    const url = new URL(value, base); if (!/^https?:$/.test(url.protocol)) return undefined;
    url.hash = ""; ["utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid"].forEach((key) => url.searchParams.delete(key));
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch { return undefined; }
}
export function plain(value: unknown, max = 12_000) { const text = normalizePlainText(value); return text?.slice(0, max).trim() || undefined; }
export function idFor(url: string, title: string) { return createHash("sha256").update(`${url}|${title}`).digest("hex").slice(0, 32); }
export function declaredStatus(text: string): NormalizedOpportunity["declaredStatus"] {
  const normalized = normalizeMatchingText(text);
  if (/\b(?:cancelled|canceled|withdrawn|suspended|suspendu|suspendue|retire|retiree)\b/.test(normalized)) return "cancelled";
  if (/\b(?:closed|past|expired|termine|terminee|cloture|cloturee|ferme|fermee)\b/.test(normalized)) return "closed";
  if (/\b(?:open|ongoing|ouvert|ouverte|en cours)\b/.test(normalized)) return "open";
  return undefined;
}
export function parseDate(text: string, label: RegExp) {
  let value = text.match(label)?.[1]?.replace(/(st|nd|rd|th)/gi, "").trim();
  const months: Record<string, string> = { janvier: "January", fevrier: "February", février: "February", mars: "March", avril: "April", mai: "May", juin: "June", juillet: "July", aout: "August", août: "August", septembre: "September", octobre: "October", novembre: "November", decembre: "December", décembre: "December" };
  if (value) for (const [french, english] of Object.entries(months)) value = value.replace(new RegExp(`\\b${french}\\b`, "i"), english);
  const date = value ? new Date(value) : undefined;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}
export function money(text: string) {
  const matches = [...text.matchAll(/(?:USD|US\$|\$|EUR|€|XOF|FCFA|NGN|GHS)\s?([\d][\d\s,.]*)/gi)];
  const numbers = matches.map((match) => Number(match[1].replace(/[\s,]/g, ""))).filter(Number.isFinite);
  if (!numbers.length) return {};
  const token = matches[0][0].toUpperCase();
  return { fundingMin: Math.min(...numbers), fundingMax: Math.max(...numbers), currency: token.includes("EUR") || token.includes("€") ? "EUR" : token.includes("XOF") || token.includes("FCFA") ? "XOF" : token.includes("NGN") ? "NGN" : token.includes("GHS") ? "GHS" : "USD" };
}
export function countries(text: string) { return findMentionedCountries(text); }
export function applicantTypes(text: string) {
  const normalized = normalizeMatchingText(text); const values: string[] = [];
  if (/\b(?:ngo|ngos|civil society|cso|organisation de la societe civile|organisations de la societe civile)\b/.test(normalized)) values.push("NGOs / civil society organizations");
  if (/\b(?:startup|start up|sme|pme|small and medium enterprise|entrepreneur)\b/.test(normalized)) values.push("Startups / SMEs / entrepreneurs");
  if (/\b(?:individual applicants?|individuals?|jeunes|youth)\b/.test(normalized)) values.push("Individuals");
  if (/\b(?:government|public institution|gouvernement)\b/.test(normalized)) values.push("Government institutions");
  if (/\b(?:un organizations?|un entities|agences des nations unies)\b/.test(normalized)) values.push("UN organizations");
  return values;
}
export function isFundingCall(text: string) { return isFundingOpportunity(text); }
export function relevance(opportunity: NormalizedOpportunity): RelevanceResult { return assessOpportunityRelevance(opportunity, { defaultPotential: true }); }
export function normalizeOfficial(raw: RawOpportunity, organization: string): NormalizedOpportunity | null {
  const data = raw.data; const title = plain(data.title, 300); const body = plain(data.description ?? data.text);
  const officialUrl = typeof data.officialUrl === "string" ? canonicalUrl(data.officialUrl) : undefined;
  if (!title || !body || !officialUrl) return null;
  const text = `${title} ${body}`; const type = detectOpportunityType(text);
  if (!type || !isFundingCall(text)) return null;
  const status = declaredStatus(text); const amount = money(body); const mentioned = countries(body); const eligible = findExplicitEligibleLocations(body);
  return {
    externalId: typeof data.externalId === "string" ? data.externalId : idFor(officialUrl, title),
    title, summary: plain(body, 1_000), description: sanitizeOpportunityHtml(body) ?? undefined,
    organization, agency: organization, type, countries: mentioned, eligibleCountries: eligible, applicantTypes: applicantTypes(body), ...amount,
    openingDate: parseDate(body, /(?:opening date|launch(?:ed)?|date d['’]ouverture)(?:\s*(?:on|:|-)?\s*)([^\n.]{6,80})/i),
    deadline: parseDate(body, /(?:deadline|closing date|date limite|submission deadline)(?:\s*(?:for|:|-)?\s*)([^\n.]{6,80})/i),
    officialUrl, discoveryUrl: typeof data.discoveryUrl === "string" ? canonicalUrl(data.discoveryUrl) : officialUrl, declaredStatus: status,
    metadata: { sourceLanguage: /[àâçéèêëîïôûùüÿñæœ]/i.test(text) || /\b(?:appel a|candidatures?|subvention|financement|date limite|ouvert|ouverte|cloture|cloturee)\b/.test(normalizeMatchingText(text)) ? "fr" : "en", eligibilityUncertain: !eligible.length, sourceDeclaredStatus: status ?? "unknown" },
  };
}
export function linksFromHtml(html: string, baseUrl: string) {
  const $ = cheerio.load(html); const links: Array<{ title: string; url: string }> = [];
  $("a").each((_index, element) => { const title = plain($(element).text(), 300); const url = canonicalUrl($(element).attr("href") || "", baseUrl); if (title && url) links.push({ title, url }); });
  return links;
}
