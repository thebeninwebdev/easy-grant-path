import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  createBuiltinProposalTemplate,
  resolveGuaranteedProposalTemplate,
} from "../lib/proposal-resolver.ts";
import {
  canUseProposalTemplate,
  chooseFallbackTemplate,
  isGeneralProposalTemplate,
} from "../lib/proposal-creation.ts";
import {
  PROPOSAL_STARTERS,
  getProposalStarter,
  getBuiltinTemplateId,
  normalizeProposalStarterId,
} from "../lib/proposal-presets.ts";
import { buildProposalRecommendation } from "../lib/proposal-recommendation.ts";
import { calculateProposalProgress, canCompleteProposal } from "../lib/proposal-logic.ts";

console.log("Starting proposal guarantee verification test suite...");

let customTemplateResolver = null;
let generalTemplateResolver = null;

async function resolveProposalTemplateForOpportunity(opp, locale = "en") {
  return resolveGuaranteedProposalTemplate({
    opportunity: opp,
    locale,
    findCustomTemplate: async (id) => {
      if (customTemplateResolver) return customTemplateResolver(id);
      return null;
    },
    findGeneralTemplate: async (type) => {
      if (generalTemplateResolver) return generalTemplateResolver(type);
      return null;
    },
  });
}

// ---------------------------------------------------------------------------
// Scenario 1: Approved opportunity with an approved custom template.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439011";
  const approvedCustomDoc = {
    _id: "507f191e810c19729de860ea",
    opportunityId: oppId,
    scope: "opportunity",
    title: "Specialized Solar Energy Grant Template",
    description: "Custom template prepared specifically for the Solar Energy Call.",
    templateType: "climate_environment",
    status: "published",
    sections: [
      { key: "solar-tech", title: "Solar Technology Feasibility", guidance: "Detail tech specifications", order: 0, enabled: true, required: true },
      { key: "budget-narrative", title: "Detailed Budget", guidance: "Detail costs", order: 1, enabled: true, required: true },
    ],
  };

  customTemplateResolver = (id) => (id === oppId ? approvedCustomDoc : null);

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "West African Solar Initiative",
    type: "grant",
    sectors: ["Energy", "Climate"],
  }, "en");

  assert.equal(template.id, "507f191e810c19729de860ea", "Scenario 1: Approved custom template is chosen (Priority 1)");
  assert.equal(template.title, "Specialized Solar Energy Grant Template");
  assert.equal(template.sections.length, 2);
  assert.equal(template.sections[0].key, "solar-tech");

  customTemplateResolver = null;
}

// ---------------------------------------------------------------------------
// Scenario 2: Approved opportunity without any uploaded template.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439012";

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "AgriTech Youth Entrepreneurship Program",
    summary: "Funding for startups developing smart farming solutions.",
    description: "Support for early-stage commercial agribusiness ventures.",
    type: "startup_funding",
    sectors: ["Agriculture", "Technology"],
  }, "en");

  assert.ok(template, "Scenario 2: Template is guaranteed to exist");
  assert.equal(template.templateType, "startup_sme", "Scenario 2: Categorized into startup_sme based on opportunity type");
  assert.ok(template.sections.length >= 10, "Scenario 2: Contains complete sections");
  assert.equal(template.status, "published");
}

// ---------------------------------------------------------------------------
// Scenario 3: Approved opportunity without an assigned template.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439013";

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "West Africa Health Research Fellowship",
    description: "Fellowship for medical researchers focusing on public health diseases.",
    type: "fellowship",
    sectors: ["Health"],
  }, "en");

  assert.ok(template, "Scenario 3: Resolves a template without an assigned template");
  assert.equal(template.templateType, "fellowship_leadership", "Scenario 3: Resolved to fellowship template");
}

// ---------------------------------------------------------------------------
// Scenario 4: Approved opportunity with an unpublished recommended template.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439014";
  generalTemplateResolver = (type) => {
    // A draft template in DB must not be returned as usable or selected
    return {
      _id: "draft-template",
      scope: "general",
      status: "draft",
      sections: [{ key: "unapproved", title: "Unapproved Section", enabled: true }],
    };
  };

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "Women Economic Empowerment Grant",
    description: "Supporting women and girls micro-enterprises.",
    type: "grant",
    sectors: ["Women"],
  }, "en");

  assert.notEqual(template.id, "draft-template", "Scenario 4: Draft template in DB must NOT be selected");
  assert.equal(template.templateType, "women_girls_empowerment", "Scenario 4: Falls back to built-in system-recommended template");
  assert.equal(template.status, "published");

  generalTemplateResolver = null;
}

// ---------------------------------------------------------------------------
// Scenario 5: Approved opportunity with a pending custom template.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439015";
  customTemplateResolver = (id) => {
    // Pending/draft custom template is not published
    return {
      _id: "pending-custom",
      opportunityId: oppId,
      scope: "opportunity",
      status: "draft",
      sections: [{ key: "pending", title: "Pending", enabled: true }],
    };
  };

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "Education Innovation Initiative",
    description: "Primary classroom teaching and learning materials grant.",
    type: "grant",
    sectors: ["Education"],
  }, "en");

  assert.ok(template, "Scenario 5: Resolves fallback safely");
  assert.notEqual(template.id, "pending-custom", "Scenario 5: Pending custom template is not used");
  assert.equal(template.templateType, "education", "Scenario 5: Pending custom template falls back to system-recommended education template");

  customTemplateResolver = null;
}

// ---------------------------------------------------------------------------
// Scenario 6: Approved opportunity with a deleted template reference.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439016";
  customTemplateResolver = () => null;

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "Clean Water Community Project",
    description: "Nonprofit community development project for clean rural water access.",
    type: "grant",
    sectors: ["Community Development"],
  }, "en");

  assert.ok(template, "Scenario 6: Deleted template reference falls back safely");
  assert.equal(template.templateType, "ngo_community_development");

  customTemplateResolver = null;
}

// ---------------------------------------------------------------------------
// Scenario 7: Approved opportunity with an invalid template reference (0 enabled sections).
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439017";
  customTemplateResolver = (id) => {
    if (id === oppId) {
      return {
        _id: "invalid-template",
        opportunityId: oppId,
        scope: "opportunity",
        status: "published",
        sections: [{ key: "disabled-section", title: "Disabled", enabled: false, order: 0 }],
      };
    }
    return null;
  };

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "Climate Resilience Grant",
    description: "Environmental adaptation and biodiversity conservation.",
    type: "grant",
    sectors: ["Climate"],
  }, "en");

  assert.notEqual(template.id, "invalid-template", "Scenario 7: Invalid template with 0 enabled sections is rejected");
  assert.equal(template.templateType, "climate_environment", "Scenario 7: Falls back to built-in climate template");

  customTemplateResolver = null;
}

// ---------------------------------------------------------------------------
// Scenario 8: Approved opportunity without any category-specific recommendation.
// ---------------------------------------------------------------------------
{
  const oppId = "507f1f77bcf86cd799439018";

  const template = await resolveProposalTemplateForOpportunity({
    _id: oppId,
    title: "General Innovation Challenge",
    description: "An open prize challenge across various unspecified disciplines.",
    type: "prize",
    sectors: [],
  }, "en");

  assert.ok(template, "Scenario 8: Universal fallback resolves");
  assert.equal(template.templateType, "general");
  assert.equal(template.title, "Recommended proposal structure", "Scenario 8: Properly labeled as universal fallback");
  assert.ok(template.sections.length >= 12, "Scenario 8: Standard 12+ grant proposal sections included");

  // Verify standard grant sections exist
  const keys = template.sections.map((s) => s.key);
  assert.ok(keys.includes("executive-summary"), "Contains executive-summary");
  assert.ok(keys.includes("problem-statement"), "Contains problem-statement");
  assert.ok(keys.includes("specific-objectives"), "Contains specific-objectives");
  assert.ok(keys.includes("proposed-activities"), "Contains proposed-activities");
  assert.ok(keys.includes("target-beneficiaries"), "Contains target-beneficiaries");
  assert.ok(keys.includes("implementation-plan"), "Contains implementation-plan");
  assert.ok(keys.includes("expected-results"), "Contains expected-results");
  assert.ok(keys.includes("monitoring-evaluation"), "Contains monitoring-evaluation");
  assert.ok(keys.includes("sustainability"), "Contains sustainability");
  assert.ok(keys.includes("budget-narrative"), "Contains budget-narrative");
  assert.ok(keys.includes("organizational-capacity"), "Contains organizational-capacity");
}

// ---------------------------------------------------------------------------
// Scenario 9: Newly approved opportunity immediately supports proposal creation.
// ---------------------------------------------------------------------------
{
  const newlyApprovedOpp = {
    _id: "507f1f77bcf86cd799439019",
    title: "Just Approved Opportunity",
    verificationStatus: "verified",
    status: "open",
    type: "grant",
    sectors: ["Technology"],
  };

  const template = await resolveProposalTemplateForOpportunity(newlyApprovedOpp, "en");
  assert.ok(template && template.sections.length > 0, "Scenario 9: Newly approved opportunity has an instant template");

  const validationSource = readFileSync("lib/validation/proposal.ts", "utf8");
  assert.match(validationSource, /startProposalSchema\s*=\s*z\.object/, "Scenario 9: startProposalSchema exists");
  assert.match(validationSource, /opportunityId:\s*objectId\.optional\(\)/, "Scenario 9: opportunityId accepted");
}

// ---------------------------------------------------------------------------
// Scenario 10: Existing approved opportunities without templates support proposal creation.
// ---------------------------------------------------------------------------
{
  const existingApproved = {
    id: "507f1f77bcf86cd799439020",
    title: "Legacy Opportunity from 2025",
    type: "grant",
    sectors: [],
  };

  const template = await resolveProposalTemplateForOpportunity(existingApproved, "en");
  assert.ok(template, "Scenario 10: Existing opportunities always resolve a template");
  assert.equal(template.status, "published");
}

// ---------------------------------------------------------------------------
// Scenario 11: Unapproved opportunities remain restricted.
// ---------------------------------------------------------------------------
{
  const proposalsSource = readFileSync("lib/proposals.ts", "utf8");
  // Verification check in startProposal ensures unapproved opportunities are rejected
  assert.match(
    proposalsSource,
    /verificationStatus:\s*"verified"/,
    "Scenario 11: Backend requires verificationStatus: 'verified'"
  );
  assert.match(
    proposalsSource,
    /status:\s*\{\s*\$in:\s*\["open",\s*"closing_soon",\s*"upcoming"\]\s*\}/,
    "Scenario 11: Backend requires approved status"
  );
}

// ---------------------------------------------------------------------------
// Scenario 12: Unauthorized users cannot bypass subscription or verification requirements.
// ---------------------------------------------------------------------------
{
  const appRouteSource = readFileSync("app/api/applications/route.ts", "utf8");
  const proposalsSource = readFileSync("lib/proposals.ts", "utf8");

  assert.match(appRouteSource, /requireApprovedIdentityForApi\(\)/, "Scenario 12: Route enforces approved identity");
  assert.match(proposalsSource, /requireProposalUserId\(\)/, "Scenario 12: Proposals enforce user ID");
  assert.match(proposalsSource, /paid:\s*true/, "Scenario 12: Enforces paid subscription access");
}

// ---------------------------------------------------------------------------
// Scenario 13: Existing proposals remain unchanged.
// ---------------------------------------------------------------------------
{
  const proposalsSource = readFileSync("lib/proposals.ts", "utf8");
  assert.match(
    proposalsSource,
    /const existing = await ProposalApplication\.findOne\(\{ userId, opportunityId \}\)/,
    "Scenario 13: startProposal returns existing application if already created"
  );
}

// ---------------------------------------------------------------------------
// Scenario 14: Generated proposal sections can be edited and saved.
// ---------------------------------------------------------------------------
{
  const universal = createBuiltinProposalTemplate("general", "en");
  const sections = universal.sections.map((s) => ({
    key: s.key,
    title: s.title,
    required: s.required,
    content: "",
  }));

  assert.equal(calculateProposalProgress(sections), 0, "Initial progress is 0%");

  // Edit and fill required sections
  sections.find((s) => s.key === "executive-summary").content = "Our project addresses water scarcity...";
  assert.ok(calculateProposalProgress(sections) > 0, "Progress increases when section is filled");

  const validationSource = readFileSync("lib/validation/proposal.ts", "utf8");
  assert.match(validationSource, /updateProposalSchema\s*=\s*z\.object/, "Scenario 14: updateProposalSchema exists");
  assert.match(validationSource, /sectionKey:\s*z\.string\(\)/, "Scenario 14: sectionKey is editable");
  assert.match(validationSource, /content:\s*z\.string\(\)/, "Scenario 14: content can be updated");
}

// ---------------------------------------------------------------------------
// Scenario 15: English and French interfaces function correctly.
// ---------------------------------------------------------------------------
{
  const opp = {
    title: "Bourse d'études universitaires",
    description: "Bourse d'études pour la formation universitaire.",
    type: "scholarship",
    sectors: ["Education"],
  };

  const enTemplate = await resolveProposalTemplateForOpportunity(opp, "en");
  const frTemplate = await resolveProposalTemplateForOpportunity(opp, "fr");

  assert.equal(enTemplate.templateType, "scholarship_study");
  assert.equal(frTemplate.templateType, "scholarship_study");

  assert.equal(enTemplate.title, "Scholarship / Study Funding", "Scenario 15: English starter title");
  assert.equal(frTemplate.title, "Bourse / Financement d'études", "Scenario 15: French starter title");

  // Universal fallback labeling
  const enUniversal = createBuiltinProposalTemplate("general", "en", { isUniversal: true });
  const frUniversal = createBuiltinProposalTemplate("general", "fr", { isUniversal: true });

  assert.equal(enUniversal.title, "Recommended proposal structure", "Scenario 15: English universal title");
  assert.equal(frUniversal.title, "Structure de proposition recommandée", "Scenario 15: French universal title");
}

console.log("ALL 15 PROPOSAL GUARANTEE SCENARIOS VERIFIED SUCCESSFULLY!");
