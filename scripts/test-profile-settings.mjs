import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  accountDetailsSchema,
  fundingPreferencesSchema,
  onboardingProfileSchema,
  organizationDetailsSchema,
} from '../lib/profile-validation.ts';

const account = { fullName: 'Amina Bello', countryCode: 'NG' };
assert.equal(accountDetailsSchema.safeParse(account).success, true);
for (const forbidden of ['email', 'userId', 'role', 'onboardingCompleted', 'verificationStatus']) {
  assert.equal(accountDetailsSchema.safeParse({ ...account, [forbidden]: 'forbidden' }).success, false, `${forbidden} must not be editable`);
}

const funding = {
  applicantType: 'startup_sme',
  countryCode: 'NG',
  interests: ['technology', 'entrepreneurship'],
  opportunityTypes: ['grant'],
  primaryGoal: 'find_opportunities',
};
assert.equal(fundingPreferencesSchema.safeParse(funding).success, true);
assert.equal(fundingPreferencesSchema.safeParse({ ...funding, interests: [] }).success, false);
assert.equal(fundingPreferencesSchema.safeParse({ ...funding, interests: ['technology', 'health', 'education', 'research'] }).success, false);
assert.equal(fundingPreferencesSchema.safeParse({ ...funding, onboardingCompleted: true }).success, false);

assert.equal(onboardingProfileSchema.safeParse({ applicantType: 'individual', onboardingCompleted: false, onboardingSkipped: false }).success, true);
assert.equal(onboardingProfileSchema.safeParse({ fullName: 'Amina Bello', countryCode: 'NG', interests: ['technology'], opportunityTypes: ['grant'], onboardingCompleted: true, onboardingSkipped: false }).success, true);
assert.equal(onboardingProfileSchema.safeParse({ ...funding, onboardingCompleted: true, onboardingSkipped: false }).success, false);

const organization = { organizationType: 'ngo_nonprofit', name: 'Community Futures', countryCode: 'NG', registrationStatus: 'registered' };
assert.equal(organizationDetailsSchema.safeParse(organization).success, true);
assert.equal(organizationDetailsSchema.safeParse({ ...organization, verificationStatus: 'verified' }).success, false);

const accountRoute = readFileSync('app/api/profile/account/route.ts', 'utf8');
const profileRoute = readFileSync('app/api/profile/route.ts', 'utf8');
const organizationRoute = readFileSync('app/api/organization-profile/route.ts', 'utf8');
assert.match(accountRoute, /session\.user\.id/);
assert.match(accountRoute, /session\.user\.emailVerified/);
assert.match(profileRoute, /saveFundingPreferences/);
assert.match(organizationRoute, /organizationDetailsSchema/);
assert.doesNotMatch(profileRoute, /onboardingCompleted|onboardingSkipped/);

console.log('Profile settings validation and mutation-boundary tests passed.');
