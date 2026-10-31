import assert from "node:assert/strict";
import { buildProposalDocument, formatFundingAmount, sanitizeProposalFilename } from "../lib/proposal-document.ts";

const source = {
  opportunityTitle: "Youth & Skills / Grant 2027",
  fundingOrganization: "Example Foundation",
  proposalMetadata: { projectTitle: "Youth Employment Project", applicantType: "ngo_nonprofit", applicantOrganization: "Rebirth Impact Centre", amountRequested: 15000, currency: "USD", projectLocation: "Benin City, Nigeria" },
  templateTitle: "Community Proposal",
  status: "draft",
  sections: [
    { key: "optional-empty", title: "Optional Empty", content: "", required: false, order: 3 },
    { key: "required", title: "Required", content: "Required response", required: true, order: 1 },
    { key: "optional-filled", title: "Optional Filled", content: "Useful optional response", required: false, order: 2 },
    { key: "disabled", title: "Disabled", content: "Must never render", required: true, enabled: false, order: 0 },
    { key: "required-empty", title: "Required Empty", content: "", required: true, order: 4 },
  ],
};
const preview = buildProposalDocument(source, "preview");
const exported = buildProposalDocument(source, "export");
assert.deepEqual(preview.sections.map((section) => section.key), ["required", "optional-filled", "optional-empty", "required-empty"]);
assert.deepEqual(exported.sections.map((section) => section.key), ["required", "optional-filled", "required-empty"]);
assert.equal(exported.sections.some((section) => section.content.includes("Start writing")), false);
assert.equal(exported.incompleteRequiredCount, 1);
assert.equal(exported.metadata.title, "Youth Employment Project");
assert.equal(exported.metadata.fundingOrganization, "Example Foundation");
assert.equal(exported.metadata.applicantDisplayName, "Rebirth Impact Centre");
assert.equal(exported.metadata.projectLocation, "Benin City, Nigeria");
assert.equal(formatFundingAmount(15000, "USD"), "$15,000");
const legacy = buildProposalDocument({ opportunityTitle: "Legacy Grant", fundingOrganization: "Legacy Funder", templateTitle: "Old Template", status: "draft", sections: [] });
assert.equal(legacy.metadata.title, "Legacy Grant");
assert.equal(legacy.metadata.fundingOrganization, "Legacy Funder");
assert.equal(legacy.metadata.applicantDisplayName, "Applicant");
assert.equal(sanitizeProposalFilename(source.opportunityTitle), "Youth-Skills-Grant-2027-Proposal");
console.log("Proposal document tests passed.");
