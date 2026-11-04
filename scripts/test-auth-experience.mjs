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
assert.match(passwordInput, /Show password/);
assert.match(passwordInput, /Hide password/);
assert.match(passwordInput, /aria-pressed=\{visible\}/);

const authForm = readFileSync('components/auth/auth-form.tsx', 'utf8');
assert.match(authForm, /autoComplete='username'/);
assert.match(authForm, /'new-password' : 'current-password'/);
assert.match(authForm, /request-password-reset|forgot-password/);
assert.match(authForm, /cooldown/);

const authShell = readFileSync('components/auth/auth-shell.tsx', 'utf8');
assert.doesNotMatch(authShell, /new Date\(|Date\.now\(/);

const recovery = readFileSync('components/auth/password-recovery-form.tsx', 'utf8');
assert.match(recovery, /requestPasswordReset/);
assert.match(recovery, /resetPassword/);
assert.match(recovery, /If an account exists/);

const authConfig = readFileSync('lib/auth.ts', 'utf8');
assert.match(authConfig, /sendResetPassword/);
assert.match(authConfig, /resetPasswordTokenExpiresIn: 3600/);
assert.match(authConfig, /requireEmailVerification: true/);

console.log('Authentication UX, redirect, and recovery-boundary tests passed.');
