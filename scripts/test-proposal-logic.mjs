import assert from "node:assert/strict";
import { calculateProposalProgress, canCompleteProposal, isPublishedTemplateVisible, ownsProposal, snapshotTemplateSections } from "../lib/proposal-logic.ts";
import { getProposalPreset, getRecommendedStarterIds, PROPOSAL_STARTERS } from "../lib/proposal-presets.ts";
assert.equal(isPublishedTemplateVisible("draft", 2), false);
assert.equal(isPublishedTemplateVisible("published", 0), false);
assert.equal(isPublishedTemplateVisible("published", 2), true);
assert.equal(ownsProposal("user-a", "user-a"), true);
assert.equal(ownsProposal("user-a", "user-b"), false);
const sections = [{ key: "summary", title: "Summary", guidance: "Explain it", required: true, order: 1 }, { key: "optional", title: "Optional", guidance: "Optional", required: false, order: 0 }];
const snapshot = snapshotTemplateSections(sections);
assert.equal(snapshot[0].key, "optional");
assert.equal(snapshot[1].content, "");
sections[0].title = "Changed later";
assert.equal(snapshot[1].title, "Summary");
assert.equal(calculateProposalProgress([{ required: true, content: "" }, { required: true, content: "Written" }, { required: false, content: "" }]), 50);
assert.equal(calculateProposalProgress([{ required: true, content: "Written" }, { required: false, content: "" }]), 100);
assert.equal(calculateProposalProgress([{ required: true, content: "   " }]), 0);
assert.equal(canCompleteProposal([{ required: true, content: "Done" }, { required: false, content: "" }]), true);
assert.equal(canCompleteProposal([{ required: true, content: "" }]), false);
assert.equal(PROPOSAL_STARTERS.length, 12, "all ready-made starters are present");
for (const starter of PROPOSAL_STARTERS) {
  assert.ok(starter.description.length >= 30, `${starter.id} has a useful description`);
  assert.ok(starter.sections.length >= 12, `${starter.id} has a complete section set`);
  assert.equal(new Set(starter.sections.map((section) => section.key)).size, starter.sections.length, `${starter.id} keys are unique`);
  assert.deepEqual(starter.sections.map((section) => section.order), starter.sections.map((_, index) => index), `${starter.id} order is contiguous`);
  for (const section of starter.sections) {
    assert.ok(section.guidance.length >= 100, `${starter.id}/${section.key} has meaningful guidance`);
    assert.ok((section.prompt || "").length >= 30, `${starter.id}/${section.key} has a useful prompt`);
    assert.ok((section.placeholder || "").length >= 30, `${starter.id}/${section.key} has a useful placeholder`);
    assert.ok(section.wordLimit >= 100 && section.wordLimit <= 600, `${starter.id}/${section.key} has a sensible word limit`);
  }
  const firstCopy = getProposalPreset(starter.id);
  const secondCopy = getProposalPreset(starter.id);
  assert.notEqual(firstCopy, secondCopy, `${starter.id} returns a copied array`);
  firstCopy[0].title = "Locally customized";
  assert.notEqual(secondCopy[0].title, "Locally customized", `${starter.id} copies do not share section objects`);
}
assert.ok(getRecommendedStarterIds("startup_funding", []).includes("startup_sme"));
assert.ok(getRecommendedStarterIds("grant", ["Climate adaptation"]).includes("climate_environment"));
assert.equal(getRecommendedStarterIds("grant", ["Climate adaptation"]).includes("ngo_community_development"), false);
assert.ok(getRecommendedStarterIds("scholarship", []).includes("scholarship_study"));
console.log("Proposal business-logic tests passed.");
