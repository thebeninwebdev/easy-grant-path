import type { CheerioAPI } from "cheerio";
import type { OpportunityType } from "@/types/opportunities";
import { cleanList, cleanText, normalizeDate } from "./normalize-extracted-opportunity";
import type { ExtractedFields } from "./types";

function contentRoot($: CheerioAPI) {
  const preferred = $("main, article, [role='main']").first();
  const root = preferred.length ? preferred.clone() : $("body").clone();
  root.find("script, style, noscript, nav, footer, header, aside, form, svg, iframe, [aria-hidden='true'], .cookie, .cookies, .cookie-banner, .newsletter, .navigation, .footer, .sidebar").remove();
  return root;
}

function segments($: CheerioAPI) {
  const root = contentRoot($);
  const values: string[] = [];
  root.find("p, li, dt, dd, tr, h1, h2, h3, h4").each((_, element) => {
    const value = cleanText($(element).text(), 1_000);
    if (value && value.length >= 3) values.push(value);
  });
  return [...new Set(values)];
}

function labeledValue(lines: string[], labels: RegExp) {
  for (const line of lines) {
    if (!labels.test(line)) continue;
    const value = line.split(/[:\u2013\u2014-]/, 2)[1]?.trim();
    if (value) return value;
  }
  return null;
}

function mapType(text: string): OpportunityType | null {
  const value = text.toLowerCase();
  if (/\bfellowship\b/.test(value)) return "fellowship";
  if (/\bscholarship\b/.test(value)) return "scholarship";
  if (/\bcompetition\b/.test(value)) return "competition";
  if (/\bprize\b|\baward\b/.test(value)) return "prize";
  if (/\baccelerator\b/.test(value)) return "accelerator";
  if (/\btender\b|request for proposals?/.test(value)) return "tender";
  if (/\bresearch (support|funding)\b/.test(value)) return "research_support";
  if (/\bgrant\b/.test(value)) return "grant";
  return null;
}

function detectCurrency(text: string) {
  const code = text.toUpperCase().match(/\b(USD|EUR|GBP|NGN|XOF|CAD|AUD|CHF|JPY|GHS|ZAR)\b/)?.[1];
  if (code) return code;
  if (text.includes("€")) return "EUR";
  if (text.includes("£")) return "GBP";
  if (text.includes("₦")) return "NGN";
  if (text.includes("$")) return "USD";
  return null;
}

function numericAmounts(text: string) {
  const matches = [...text.matchAll(/(?:USD|EUR|GBP|NGN|XOF|CAD|AUD|CHF|JPY|GHS|ZAR|[$€£₦])\s*(\d[\d,]*(?:\.\d+)?)\s*(thousand|million|billion|k|m|bn)?/gi)];
  return matches.map((match) => {
    const base = Number(match[1].replaceAll(",", ""));
    const scale = match[2]?.toLowerCase();
    const multiplier = scale === "thousand" || scale === "k" ? 1_000 : scale === "million" || scale === "m" ? 1_000_000 : scale === "billion" || scale === "bn" ? 1_000_000_000 : 1;
    return base * multiplier;
  }).filter(Number.isFinite);
}

function extractFunding(lines: string[]): ExtractedFields {
  const line = lines.find((value) => /\b(funding|grant amount|award amount|award ceiling|award floor|budget)\b/i.test(value));
  if (!line || /no fixed amount/i.test(line)) return {};
  const currency = detectCurrency(line);
  if (!currency) return {};
  const amounts = numericAmounts(line);
  if (!amounts.length) return { currency };
  if (/\b(up to|maximum|ceiling)\b/i.test(line)) return { fundingMax: amounts[0], currency };
  if (/\b(from|minimum|at least|floor)\b/i.test(line) && amounts.length === 1) return { fundingMin: amounts[0], currency };
  if (amounts.length >= 2) return { fundingMin: Math.min(...amounts), fundingMax: Math.max(...amounts), currency };
  return { fundingMin: amounts[0], fundingMax: amounts[0], currency };
}

export function extractSemanticHtml($: CheerioAPI): ExtractedFields {
  const root = contentRoot($);
  const title = cleanText(root.find("h1").first().text(), 300);
  const paragraphs = root.find("p").map((_, element) => cleanText($(element).text(), 1_500)).get().filter((value): value is string => Boolean(value));
  const meaningful = paragraphs.filter((paragraph) => paragraph.length >= 40).slice(0, 25);
  return { title, summary: meaningful[0]?.slice(0, 1_000) ?? null, description: meaningful.length ? meaningful.join("\n\n").slice(0, 8_000) : null, type: mapType(`${title ?? ""} ${root.find("h2, h3").slice(0, 5).text()}`) };
}

export function extractTextHeuristics($: CheerioAPI): { fields: ExtractedFields; warnings: string[] } {
  const lines = segments($);
  const warnings: string[] = [];
  const deadlineCandidates = lines.filter((line) => /\b(deadline|closing date|applications? close|submission deadline|closing on)\b/i.test(line)).map((line) => normalizeDate(line.split(/[:\u2013\u2014-]/, 2)[1] ?? line)).filter((date): date is string => Boolean(date));
  const uniqueDeadlines = [...new Set(deadlineCandidates)];
  if (uniqueDeadlines.length > 1) warnings.push("Multiple possible deadlines were found, so no deadline was selected automatically.");
  const eligibility = labeledValue(lines, /\b(eligible countries|countries eligible|geographic eligibility|eligible locations?)\b/i);
  const organization = labeledValue(lines, /\b(organization|organiser|organizer|funder|funding agency)\b/i);
  const agency = labeledValue(lines, /\b(agency|issuing agency)\b/i);
  const opportunityNumber = labeledValue(lines, /\b(opportunity number|reference number|reference no\.?|call number)\b/i);
  const openingDate = labeledValue(lines, /\b(opening date|applications? open|launch date)\b/i);
  return { fields: { organization: cleanText(organization, 200), agency: cleanText(agency, 200), eligibleCountries: eligibility ? cleanList(eligibility) : [], openingDate: normalizeDate(openingDate), deadline: uniqueDeadlines.length === 1 ? uniqueDeadlines[0] : null, opportunityNumber: cleanText(opportunityNumber, 120), ...extractFunding(lines) }, warnings };
}
