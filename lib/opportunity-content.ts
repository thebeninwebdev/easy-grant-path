import { decode, encode } from "he";
import sanitizeHtml from "sanitize-html";

const NON_TEXT_TAGS = ["script", "style", "textarea", "option", "noscript"];
const RICH_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "ul", "ol", "li",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "a",
];

export function decodeHtmlEntities(value: string) {
  let decoded = value;
  for (let pass = 0; pass < 2; pass += 1) {
    const next = decode(decoded, { isAttributeValue: false });
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.replace(/\u00a0/g, " ");
}

export function normalizePlainText(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const separated = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li(?:\s[^>]*)?>/gi, "\n• ")
    .replace(/<\/(?:p|div|li|h[1-6]|tr|blockquote)>/gi, "\n");
  const withoutMarkup = sanitizeHtml(separated, {
    allowedTags: [], allowedAttributes: {}, nonTextTags: NON_TEXT_TAGS,
  });
  const decoded = decodeHtmlEntities(withoutMarkup)
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return decoded || null;
}

export function normalizePlainTextList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map(normalizePlainText).filter((value): value is string => Boolean(value)))];
}

function plainTextToHtml(value: string) {
  const decoded = decodeHtmlEntities(value).replace(/\r\n?/g, "\n").trim();
  return decoded.split(/\n{2,}/).map((paragraph) =>
    `<p>${paragraph.split("\n").map((line) => encode(line, { useNamedReferences: true })).join("<br>")}</p>`,
  ).join("");
}

function safeLinkAttributes(attribs: sanitizeHtml.Attributes): sanitizeHtml.Attributes {
  const href = attribs.href?.trim();
  if (!href) return {};
  if (/^https?:\/\//i.test(href)) return { href, target: "_blank", rel: "noopener noreferrer" };
  if (/^mailto:/i.test(href)) return { href };
  return {};
}

export function sanitizeOpportunityHtml(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const input = /<\/?[a-z][\s\S]*>/i.test(value) ? value : plainTextToHtml(value);
  const sanitized = sanitizeHtml(input, {
    allowedTags: RICH_TAGS,
    allowedAttributes: { a: ["href", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
    nonTextTags: NON_TEXT_TAGS,
    transformTags: { a: (_tagName, attribs) => ({ tagName: "a", attribs: safeLinkAttributes(attribs) }) },
  }).trim();
  return sanitized || null;
}
