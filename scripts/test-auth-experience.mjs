import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { safeAuthCallback } from '../lib/auth-redirect.ts';

assert.equal(safeAuthCallback('/dashboard'), '/dashboard');
assert.equal(safeAuthCallback('/admin?view=review'), '/admin?view=review');
assert.equal(safeAuthCallback(['/dashboard/settings', '/admin']), '/dashboard/settings');
for (const unsafe of ['https://evil.example', '//evil.example', 'javascript:alert(1)', undefined]) {
  assert.equal(safeAuthCallback(unsafe), '/dashboard/onboarding');
}

const passwordInput = readFileSync('components/auth/password-input.tsx', 'utf8');
assert.match(passwordInput, /type=\{visible \? 'text' : 'password'\}/);
assert.match(passwordInput, /type='button'/);
assert.match(passwordInput, /showPassword/);
assert.match(passwordInput, /hidePassword/);
const englishMessages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
assert.equal(englishMessages.Auth.fields.showPassword, 'Show password');
assert.equal(englishMessages.Auth.fields.hidePassword, 'Hide password');
assert.match(passwordInput, /aria-pressed=\{visible\}/);

const authForm = readFileSync('components/auth/auth-form.tsx', 'utf8');
assert.match(authForm, /autoComplete=.*username/);
assert.match(authForm, /new-password.*current-password/);
assert.match(authForm, /request-password-reset|forgot-password/);
assert.match(authForm, /cooldown/);

const authShell = readFileSync('components/auth/auth-shell.tsx', 'utf8');
assert.doesNotMatch(authShell, /new Date\(|Date\.now\(/);

const recovery = readFileSync('components/auth/password-recovery-form.tsx', 'utf8');
assert.match(recovery, /requestPasswordReset/);
assert.match(recovery, /resetPassword/);
assert.match(recovery, /ifAccountExists/);

const authConfig = readFileSync('lib/auth.ts', 'utf8');
assert.match(authConfig, /sendResetPassword/);
assert.match(authConfig, /resetPasswordTokenExpiresIn:\s*3600/);
assert.match(authConfig, /requireEmailVerification:\s*true/);


const authNavigation = readFileSync('lib/auth-navigation.ts', 'utf8');
assert.match(authNavigation, /hasActiveSession/);
assert.match(authNavigation, /hasAdminRole/);
assert.ok(authNavigation.includes('(?:en\\/|fr\\/)?dashboard'));

const home = readFileSync('app/page.tsx', 'utf8');
assert.ok(home.includes('redirect(localizedPath(destination'));
assert.ok(home.includes('redirect(localizedPath(destination'));
assert.ok(home.includes('redirect(localizedPath(destination'));

const signInPage = readFileSync('app/sign-in/page.tsx', 'utf8');
const signUpPage = readFileSync('app/sign-up/page.tsx', 'utf8');
assert.match(signInPage, /authenticatedDestination/);
assert.match(signUpPage, /authenticatedDestination/);
assert.match(signInPage, /getCurrentSession/);
assert.match(signUpPage, /getCurrentSession/);

const authContinue = readFileSync('app/auth/continue/page.tsx', 'utf8');
assert.match(authContinue, /getCurrentSession/);
assert.match(authContinue, /authenticatedDestination/);
assert.match(authContinue, /redirect\(destination/);
assert.match(authForm, /localizedCallbackURL/);
assert.match(authForm, /router\.replace/);

const dashboardLayout = readFileSync('app/dashboard/layout.tsx', 'utf8');
const adminLayout = readFileSync('app/admin/layout.tsx', 'utf8');
assert.match(dashboardLayout, /authenticatedDestination/);
assert.match(adminLayout, /hasActiveSession/);
assert.match(adminLayout, /redirect\("\/dashboard"\)/);
console.log('Authentication UX, redirect, and recovery-boundary tests passed.');
