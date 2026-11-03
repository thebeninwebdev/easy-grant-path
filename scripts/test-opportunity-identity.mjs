import assert from "node:assert/strict";
import {
  buildResearchQuery,
  isGenericOpportunityTitle,
  opportunityIdentityMatches,
  rankResearchSources,
  resolveOpportunityIdentity,
} from "../services/opportunity-extraction/opportunity-identity.ts";
import { clearOpportunityResearchCache, withOpportunityResearchCache } from "../services/opportunity-extraction/research-cache.ts";

const url = "https://aggregator.example/opportunity/9234";

const provided = resolveOpportunityIdentity({ submittedUrl: url, providedName: "ECOWAS Startup Awards 2026", headingTitle: "Applications Now Open" });
assert.equal(provided?.source, "admin", "URL + admin name should use the admin identity");
assert.equal(provided?.searchName, "ECOWAS Startup Awards 2026");

const crawled = resolveOpportunityIdentity({ submittedUrl: url, headingTitle: "Africa Climate Innovation Challenge 2026" });
assert.equal(crawled?.source, "crawler", "URL-only import should use a strong crawled heading");

const crawlFailureWithName = resolveOpportunityIdentity({ submittedUrl: url, providedName: "UNDP Youth Innovation Challenge 2026" });
assert.equal(crawlFailureWithName?.source, "admin", "A provided name should survive crawl failure");
assert.equal(resolveOpportunityIdentity({ submittedUrl: url }), null, "Crawl failure without a name should stop identification");

assert.equal(isGenericOpportunityTitle("UNDP Opportunities"), true, "Generic branded headings must be rejected");
assert.equal(isGenericOpportunityTitle("Applications Now Open"), true, "Generic application headings must be rejected");
assert.equal(resolveOpportunityIdentity({ submittedUrl: url, headingTitle: "Call for Applications", pageTitle: "Funding Opportunities | UNDP" }), null);

assert.equal(opportunityIdentityMatches("ECOWAS Startup Awards 2026", "Applications open: ECOWAS Startup Award 2026"), true, "Small title differences should still match");
assert.equal(opportunityIdentityMatches("ECOWAS Startup Awards 2026", "African Youth Innovation Fund 2026"), false, "Unrelated results must be rejected");
assert.equal(opportunityIdentityMatches("ECOWAS Startup Awards 2026", "ECOWAS Startup Awards 2025"), false, "Wrong-year results must be rejected");

const sourceIdentity = resolveOpportunityIdentity({ submittedUrl: "https://aggregator.example/item", providedName: "ECOWAS Startup Awards 2026", organization: "ECOWAS" });
assert.ok(sourceIdentity);
const ranked = rankResearchSources(sourceIdentity, [
  { url: "https://opportunitydesk.org/ecowas-startup-awards-2026", title: "ECOWAS Startup Awards 2026" },
  { url: "https://aggregator.example/ecowas-startup-awards-2026", title: "ECOWAS Startup Awards 2026" },
  { url: "https://ecowas.int/startup-awards-2026", title: "ECOWAS Startup Awards 2026" },
]);
assert.equal(ranked[0].url, "https://ecowas.int/startup-awards-2026", "Official/institutional sources should outrank aggregators");

assert.equal(buildResearchQuery("Africa Youth Enterprise Grant 2026", "African Development Fund", "example.org"), '"Africa Youth Enterprise Grant 2026" African Development Fund official eligibility deadline funding requirements application');

clearOpportunityResearchCache();
let calls = 0;
const first = await withOpportunityResearchCache("identity-key", async () => { calls += 1; return { title: "Cached" }; }, 1_000);
const second = await withOpportunityResearchCache("identity-key", async () => { calls += 1; return { title: "Unexpected" }; }, 2_000);
assert.equal(first.cacheHit, false);
assert.equal(second.cacheHit, true);
assert.equal(calls, 1, "Duplicate research should reuse the recent identity cache");

console.log("Opportunity identity tests passed.");
