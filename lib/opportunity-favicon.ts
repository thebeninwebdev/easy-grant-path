/** Builds a safe, display-only favicon URL from a known website URL. */
export function hostnameFromKnownUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try { const url = new URL(value); return (url.protocol === "http:" || url.protocol === "https:") && url.hostname && !url.username && !url.password ? url.hostname.toLowerCase() : null; } catch { return null; }
}
export function faviconUrlFromKnownUrl(value: unknown): string | null { const domain = hostnameFromKnownUrl(value); return domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null; }
export function opportunityFaviconUrl(value: { applicationUrl?: string | null; officialUrl?: string | null; organizationUrl?: string | null; discoveryUrl?: string | null }) { return faviconUrlFromKnownUrl(value.applicationUrl || value.officialUrl || value.organizationUrl || value.discoveryUrl); }
