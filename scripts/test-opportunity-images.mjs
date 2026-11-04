import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { load } from "cheerio";
import { clearImageDiscoveryCaches, collectImageCandidates, discoverImages, scoreImageCandidate } from "../services/opportunity-extraction/image-discovery.ts";
import { isUnsafeSvgContent, validateImageAsset } from "../services/opportunity-extraction/image-validation.ts";

const identity = {
  searchName: "UNDP Youth Innovation Challenge 2026",
  source: "admin",
  confidence: "high",
  detectedName: null,
  organizationHint: "United Nations Development Programme",
  originalDomain: "directory.example",
  searchQuery: "test",
  cacheKey: "undp-youth-innovation-2026|undp|2026",
};
const page = { url: "https://undp.org/opportunities/youth-innovation-2026", authority: 5, official: true };
const html = [
  "<html><head>",
  "<meta property='og:image' content='/media/undp-youth-innovation-challenge-2026-banner.jpg'>",
  "<meta property='og:image:width' content='1200'><meta property='og:image:height' content='630'>",
  "<script type='application/ld+json'>{\"@type\":\"Article\",\"image\":{\"url\":\"/media/programme-2026.webp\"},\"publisher\":{\"logo\":{\"url\":\"/brand/undp-logo.svg\"}}}</script>",
  "</head><body><main>",
  "<picture><source srcset='/media/hero-small.webp 400w, /media/undp-youth-innovation-2026-hero.webp 1200w'></picture>",
  "<img data-src='/media/lazy-programme.png' alt='Youth Innovation Challenge 2026 programme'>",
  "<img src='/icons/facebook-icon.png' width='24' height='24' alt='Facebook icon'>",
  "</main></body></html>",
].join("");

const candidates = collectImageCandidates(load(html), { ...page, html });
assert(candidates.some((item) => item.metadata === "open-graph"), "discovers Open Graph images");
assert(candidates.some((item) => item.metadata === "json-ld" && item.url.includes("programme-2026")), "discovers JSON-LD images");
assert(candidates.some((item) => item.metadata === "json-ld" && item.url.includes("undp-logo")), "discovers JSON-LD logos");
assert(candidates.some((item) => item.url.includes("2026-hero")), "selects the largest srcset candidate");
assert(candidates.some((item) => item.url.includes("lazy-programme")), "discovers lazy-loaded images");

const banner = scoreImageCandidate(candidates.find((item) => item.metadata === "open-graph"), identity, "United Nations Development Programme");
assert.equal(banner.kind, "opportunity-banner", "classifies the exact official banner");
assert(banner.score >= 65, "gives the official identity-matching banner a high score");
const wrongYear = scoreImageCandidate({ ...banner, url: "https://undp.org/startup-awards-2025.jpg", alt: "Startup Awards 2025", score: 0, reasons: [] }, identity, "UNDP");
assert.equal(wrongYear.kind, "irrelevant", "rejects wrong-year promotional images");
const aggregatorLogo = scoreImageCandidate({ ...banner, sourceUrl: "https://opportunitydesk.org/item", url: "https://opportunitydesk.org/logo.png", alt: "Opportunity Desk logo", score: 0, reasons: [] }, identity, "UNDP");
assert(aggregatorLogo.score < 0 && aggregatorLogo.reasons.includes("aggregator branding"), "rejects aggregator branding as the funder logo");
const tiny = scoreImageCandidate({ ...banner, url: "https://undp.org/pixel.png", width: 1, height: 1, score: 0, reasons: [] }, identity, "UNDP");
assert.equal(tiny.kind, "irrelevant", "rejects tracking pixels and tiny images");

const valid = async (url) => ({ valid: true, finalUrl: url, contentType: url.endsWith(".svg") ? "image/svg+xml" : "image/jpeg", width: url.endsWith(".svg") ? 300 : 1200, height: url.endsWith(".svg") ? 300 : 630, reasons: ["test validation"] });
clearImageDiscoveryCaches();
const discovered = await discoverImages({ originalPage: { ...page, html }, identity, organization: "United Nations Development Programme", validate: valid });
assert(discovered.opportunityImage?.url.includes("2026-banner"), "selects the official opportunity banner");
assert(discovered.organizationLogo?.url.includes("undp-logo"), "selects the official funder logo separately");
assert.notEqual(discovered.opportunityImage?.url, discovered.organizationLogo?.url, "does not reuse one asset for both roles");
assert.equal(discovered.opportunityImage?.verified, true, "persists technical validation state");
assert(discovered.inspectedSources.includes(page.url), "records inspected source provenance");
const cachedLogoResult = await discoverImages({
  originalPage: { ...page, html: "<html><main>No images</main></html>" },
  identity: { ...identity, cacheKey: "another-undp-opportunity|undp|2026" },
  organization: "United Nations Development Programme",
  validate: valid,
});
assert(cachedLogoResult.organizationLogo?.url.includes("undp-logo"), "reuses a verified organization logo from cache");
assert.equal(cachedLogoResult.cacheHits, 1, "reports organization logo cache hits");

clearImageDiscoveryCaches();
const none = await discoverImages({ originalPage: { ...page, html: "<html><main>No images</main></html>" }, identity: { ...identity, cacheKey: "no-image" }, validate: valid });
assert.equal(none.opportunityImage, null, "handles pages with no available image");
assert.equal(none.organizationLogo, null, "handles pages with no available logo");

assert.equal(isUnsafeSvgContent("<svg><script>alert(1)</script></svg>"), true, "rejects scripted SVG");
assert.equal(isUnsafeSvgContent("<svg viewBox='0 0 100 100'><path d='M0 0'/></svg>"), false, "allows inert SVG markup");
const blocked = await validateImageAsset("http://127.0.0.1/image.png");
assert.equal(blocked.valid, false, "blocks private-network image URLs");

const [formSource, routeSource, syncSource, publicSource, cardSource, matchedSource, detailSource] = await Promise.all([
  readFile(new URL("../components/admin/opportunities/opportunity-create-form.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/admin/opportunities/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../services/opportunity-ingestion/sync-source.ts", import.meta.url), "utf8"),
  readFile(new URL("../lib/public-opportunities.ts", import.meta.url), "utf8"),
  readFile(new URL("../components/opportunities/opportunity-card.tsx", import.meta.url), "utf8"),
  readFile(new URL("../components/opportunities/matched-opportunity-card.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/dashboard/opportunities/[slug]/page.tsx", import.meta.url), "utf8"),
]);
assert(formSource.includes("opportunityImage: images.opportunityImage"), "manual imports submit image metadata");
assert(routeSource.includes("validateManualImage") && routeSource.includes("opportunityImage, organizationLogo"), "manual create validates and persists both assets");
assert(syncSource.includes("missingBanner") && syncSource.includes("missingLogo"), "scheduled imports fill missing images");
assert(syncSource.includes("reviewStatus") && syncSource.includes("refresh.replaceBanner"), "scheduled updates preserve approved images and refresh eligible automatic assets");
assert(publicSource.includes("serializePublicImage") && publicSource.includes("opportunityImage:"), "public serialization exposes safe image metadata");
assert(cardSource.includes("OpportunityBanner") && cardSource.includes("OrganizationLogo"), "standard cards render banner and logo");
assert(matchedSource.includes("OpportunityBanner") && matchedSource.includes("OrganizationLogo"), "matched cards render banner and logo");
assert(detailSource.includes("<OpportunityBanner") && detailSource.includes("<OrganizationLogo"), "detail pages render banner and logo");

console.log("Opportunity image discovery tests passed.");
