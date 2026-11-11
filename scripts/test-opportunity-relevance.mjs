import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createJiti } from "jiti";

const jiti = createJiti(import.meta.url, { alias: { "@": process.cwd() } });
const { assessOpportunityRelevance, detectOpportunityType, findMentionedCountries, isFundingOpportunity, normalizeMatchingText } = await jiti.import("../sources/shared/relevance.ts");
const { declaredStatus, normalizeOfficial } = await jiti.import("../sources/shared/official-html.ts");
const { assessGrantsGovRelevance } = await jiti.import("../sources/grants-gov/relevance.ts");
const { normalizeGrantsGov } = await jiti.import("../sources/grants-gov/normalize.ts");
const { assessEcowasRelevance } = await jiti.import("../sources/ecowas/relevance.ts");
const { assessUndpRelevance } = await jiti.import("../sources/undp/relevance.ts");
const { assessAfdbAccfRelevance } = await jiti.import("../sources/afdb-accf/relevance.ts");
const { assessUnMptfRelevance } = await jiti.import("../sources/un-mptf/relevance.ts");
const { canonicalIdentity, opportunityFingerprint } = await jiti.import("../services/opportunity-ingestion/deduplicate.ts");
const { getOpportunityStatus } = await jiti.import("../services/opportunity-ingestion/status.ts");
const { NEW_OPPORTUNITY_VERIFICATION_STATUS } = await jiti.import("../services/opportunity-ingestion/sync-source.ts");

function opportunity(overrides = {}) {
  return { externalId: "test", title: "Climate grant", officialUrl: "https://example.org/call", ...overrides };
}

assert.equal(normalizeMatchingText("Côte d’Ivoire"), "cote d'ivoire");
for (const spelling of ["Côte d’Ivoire", "Côte d'Ivoire", "Cote d'Ivoire", "Ivory Coast"]) {
  assert.deepEqual(findMentionedCountries(spelling), ["Côte d’Ivoire"]);
  const assessment = assessOpportunityRelevance(opportunity({ eligibleCountries: [spelling] }));
  assert.equal(assessment.classification, "relevant");
  assert.equal(assessment.eligibility, "explicit_country");
}

const africa = assessOpportunityRelevance(opportunity({ description: "Applications are open to nonprofit organizations based in Sub-Saharan Africa." }));
assert.equal(africa.classification, "relevant");
assert.equal(africa.eligibility, "africa");

const westAfrica = assessOpportunityRelevance(opportunity({ description: "Eligible startups based in West Africa and ECOWAS member states may apply." }));
assert.equal(westAfrica.classification, "relevant");
assert.equal(westAfrica.eligibility, "west_africa");
const nigeriaOnly = assessOpportunityRelevance(opportunity({ description: "Eligible organizations based in Nigeria may apply." }));
assert.deepEqual(nigeriaOnly.reasons, ["Eligibility language includes Nigeria"]);

const worldwide = assessOpportunityRelevance(opportunity({ description: "Applications from all countries are eligible. International applicants are welcome." }));
assert.equal(worldwide.classification, "relevant");
assert.equal(worldwide.eligibility, "worldwide");

const uncertain = assessOpportunityRelevance(opportunity({ description: "This grant supports climate resilience projects across Africa." }));
assert.equal(uncertain.classification, "potentially_relevant");
assert.equal(uncertain.confidence, "medium");
assert.equal(uncertain.eligibility, "uncertain");

for (const description of [
  "Research concerning Ghana is included, but U.S. organizations only may apply.",
  "This call discusses Africa. EU applicants only are eligible.",
  "Africa research call; eligibility is limited to United States organizations.",
  "Africa research call; only organizations established in the European Union may apply.",
]) {
  const assessment = assessOpportunityRelevance(opportunity({ description }));
  assert.equal(assessment.classification, "irrelevant");
  assert.equal(assessment.eligibility, "explicitly_ineligible");
}

assert.equal(isFundingOpportunity("Appel à propositions — subvention pour les ONG"), true);
assert.equal(isFundingOpportunity("Appel à candidatures pour une bourse de recherche"), true);
assert.equal(isFundingOpportunity("Youth innovation competition with a cash prize of USD 20,000"), true);
assert.equal(isFundingOpportunity("Capacity-building programme offering financial support to SMEs"), true);
assert.equal(isFundingOpportunity("Avis d'appel d'offres pour fournitures informatiques"), false);
assert.equal(isFundingOpportunity("Recruitment of an agricultural consultant"), false);
assert.equal(isFundingOpportunity("Annual report describing a grant awarded in 2020"), false);
assert.equal(detectOpportunityType("Startup grant and seed funding for women entrepreneurs"), "startup_funding");
assert.equal(detectOpportunityType("Research fellowship for African scientists"), "fellowship");
assert.equal(detectOpportunityType("Scholarship for graduate students"), "scholarship");
assert.equal(detectOpportunityType("Innovation challenge with a cash prize"), "competition");

assert.equal(declaredStatus("Appel ouvert aux candidatures"), "open");
assert.equal(declaredStatus("Cette opportunité est ouverte."), "open");
assert.equal(declaredStatus("L'appel est clôturé."), "closed");
assert.equal(declaredStatus("Annonce clôturée"), "closed");

const french = normalizeOfficial({
  id: "fr-1",
  data: {
    title: "Appel à candidatures — subvention pour les PME",
    description: "Cette opportunité est ouverte aux organisations basées en Côte d’Ivoire. Financement FCFA 10000000. Date limite: 31 décembre 2099.",
    officialUrl: "https://example.org/fr-call",
  },
}, "Official funder");
assert.ok(french);
assert.equal(french.metadata?.sourceLanguage, "fr");
assert.deepEqual(french.eligibleCountries, ["Côte d’Ivoire"]);
assert.equal(french.type, "startup_funding");
assert.equal(french.deadline?.getUTCFullYear(), 2099);

const grantsGov = normalizeGrantsGov({
  id: "grant-1",
  data: {
    opportunity: {
      opportunityId: "grant-1",
      opportunityTitle: "Africa community development grant",
      description: "Applications are open for community development funding in Africa.",
      synopsis: { applicantTypes: [{ description: "Foreign organizations" }] },
    },
  },
});
assert.ok(grantsGov);
assert.deepEqual(grantsGov.applicantTypes, ["Foreign organizations"]);
assert.equal(assessGrantsGovRelevance(grantsGov).classification, "relevant");

assert.equal(normalizeOfficial({
  id: "procurement",
  data: { title: "Avis d'appel d'offres", description: "Marché public de fournitures.", officialUrl: "https://example.org/tender" },
}, "Official funder"), null);

const past = new Date("2020-01-01T00:00:00.000Z");
assert.equal(getOpportunityStatus(undefined, past, new Date("2026-01-01T00:00:00.000Z")), "closed");

assert.equal(canonicalIdentity("https://example.org/call/?utm_source=test#details"), "https://example.org/call");
assert.equal(
  opportunityFingerprint(opportunity({ title: "Fonds Côte d’Ivoire", organization: "UNDP", deadline: new Date("2099-12-31") })),
  opportunityFingerprint(opportunity({ title: "Fonds Cote d'Ivoire", organization: "UNDP", deadline: new Date("2099-12-31") })),
);

for (const assess of [assessGrantsGovRelevance, assessEcowasRelevance, assessUndpRelevance, assessAfdbAccfRelevance, assessUnMptfRelevance]) {
  assert.equal(assess(opportunity({ description: "Eligible organizations based in Africa may apply." })).relevant, true);
}
assert.equal(NEW_OPPORTUNITY_VERIFICATION_STATUS, "needs_review");
const syncSource = readFileSync("services/opportunity-ingestion/sync-source.ts", "utf8");
for (const counter of ["potentiallyRelevant", "explicitlyIneligible", "duplicate", "invalid", "expired"]) assert.ok(syncSource.includes(counter));
assert.ok(syncSource.includes("verificationStatus: NEW_OPPORTUNITY_VERIFICATION_STATUS"));

console.log("Opportunity relevance, normalization, diagnostics, expiry, deduplication, and review-status tests passed.");
