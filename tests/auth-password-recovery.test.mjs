import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getPasswordRecoveryRedirect,
  getRecoveryOtpParams,
  isValidEmailAddress,
  normalizeEmailAddress,
} from '../src/lib/auth/password-recovery.mjs';

test('normalizes and validates reset email addresses', () => {
  assert.equal(normalizeEmailAddress('  Student@IITKGP.AC.IN '), 'student@iitkgp.ac.in');
  assert.equal(isValidEmailAddress('student@iitkgp.ac.in'), true);
  assert.equal(isValidEmailAddress('student@'), false);
  assert.equal(isValidEmailAddress(''), false);
});

test('uses the configured public site origin for recovery links', () => {
  assert.equal(
    getPasswordRecoveryRedirect('https://edstop.com/', 'http://localhost:3000'),
    'https://edstop.com/auth/callback?next=/reset-password'
  );
  assert.equal(
    getPasswordRecoveryRedirect(undefined, 'http://localhost:3000'),
    'http://localhost:3000/auth/callback?next=/reset-password'
  );
});

test('accepts only recovery token hashes', () => {
  assert.deepEqual(
    getRecoveryOtpParams(
      new URLSearchParams('token_hash=hashed-token&type=recovery')
    ),
    { token_hash: 'hashed-token', type: 'recovery' }
  );
  assert.equal(
    getRecoveryOtpParams(new URLSearchParams('token_hash=hashed-token&type=signup')),
    null
  );
  assert.equal(getRecoveryOtpParams(new URLSearchParams('type=recovery')), null);
});

test('callback verifies token-hash recovery and preserves legacy PKCE links', async () => {
  const callbackSource = await readFile(
    new URL('../src/app/auth/callback/route.ts', import.meta.url),
    'utf8'
  );

  assert.match(callbackSource, /verifyOtp\(recoveryOtp\)/);
  assert.match(callbackSource, /exchangeCodeForSession\(code!\)/);
  assert.match(callbackSource, /recovery_link_invalid/);
});

test('reset page updates the authenticated recovery user password', async () => {
  const resetPageSource = await readFile(
    new URL('../src/app/reset-password/page.tsx', import.meta.url),
    'utf8'
  );

  assert.match(resetPageSource, /auth\.getSession\(\)/);
  assert.match(resetPageSource, /auth\.updateUser\(\{\s*password,/s);
  assert.match(resetPageSource, /Password updated successfully/);
});
