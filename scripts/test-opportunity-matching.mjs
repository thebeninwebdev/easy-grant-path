import assert from 'node:assert/strict';
import { matchOpportunity, normalizeMatchText } from '../lib/opportunity-matching/index.ts';

const profile = {
  fullName: 'Test User', applicantType: 'startup_sme', countryCode: 'CI', interests: ['agriculture'],
  opportunityTypes: ['grant'], inferredOpportunityTypes: [], primaryGoal: 'find_opportunities', primaryGoals: ['find_opportunities'],
  onboardingCompleted: true, onboardingSkipped: false, paid: true, accessStatus: 'active', activatedAt: null,
};

function opportunity(overrides = {}) {
  return {
    id: '1', slug: 'test', title: 'Agritech Growth Grant', summary: 'Support for farming innovation', description: null,
    organization: 'Funder', agency: null, type: 'grant', countries: [], eligibleCountries: ['Côte d’Ivoire'],
    applicantTypes: ['SMEs and startups'], sectors: ['Agribusiness'], fundingMin: null, fundingMax: 10000,
    currency: 'USD', openingDate: null, deadline: null, officialUrl: null, opportunityNumber: null, status: 'open',
    ...overrides,
  };
}

assert.equal(normalizeMatchText('Côte d’Ivoire'), 'cote d ivoire');
const direct = matchOpportunity(opportunity(), profile);
assert.ok(direct);
assert.equal(direct.label, 'Strong potential match');
assert.ok(direct.reasons.some((reason) => reason.text.includes('agriculture')));

assert.ok(matchOpportunity(opportunity({ eligibleCountries: ['West Africa'] }), profile), 'Regional eligibility should match');
assert.ok(matchOpportunity(opportunity({ eligibleCountries: ['Global'] }), profile), 'Global eligibility should match');
assert.equal(matchOpportunity(opportunity({ eligibleCountries: ['East Africa'] }), profile), null, 'A different African region must not match through the generic Africa alias');
assert.equal(matchOpportunity(opportunity({ eligibleCountries: ['Kenya only'] }), profile), null, 'Confirmed geographic incompatibility must be excluded');
assert.equal(matchOpportunity(opportunity({ applicantTypes: ['Universities'] }), profile), null, 'Confirmed applicant incompatibility must be excluded');
assert.ok(matchOpportunity(opportunity({ eligibleCountries: [], countries: [], applicantTypes: [] }), profile)?.reasons.some((reason) => reason.confidence === 'unknown'), 'Missing eligibility must remain uncertain');

console.log('Opportunity matching tests passed.');
