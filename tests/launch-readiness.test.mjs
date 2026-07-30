import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getSafeAuthRedirect } from '../src/lib/auth/safe-redirect.mjs';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('auth callback redirects only to local application paths', () => {
  assert.equal(getSafeAuthRedirect('/student-dashboard'), '/student-dashboard');
  assert.equal(
    getSafeAuthRedirect('/reset-password?source=email#form'),
    '/reset-password?source=email#form'
  );
  assert.equal(getSafeAuthRedirect('//attacker.example/path'), '/student-dashboard');
  assert.equal(
    getSafeAuthRedirect('https://attacker.example/path'),
    '/student-dashboard'
  );
  assert.equal(getSafeAuthRedirect('/\\attacker.example'), '/student-dashboard');
  assert.equal(getSafeAuthRedirect(null), '/student-dashboard');
});

test('profile launch fields are writable without exposing privileged fields', async () => {
  const migration = await read(
    'supabase/migrations/20260730000200_restore_launch_profile_and_operations_access.sql'
  );

  for (const field of [
    'roll_number',
    'hall',
    'room_number',
    'department',
    'year_of_study',
  ]) {
    assert.match(migration, new RegExp(`\\b${field}\\b`));
  }

  const profileGrant = migration.match(
    /GRANT UPDATE \(([\s\S]*?)\) ON TABLE public\.user_profiles TO authenticated;/
  )?.[1];

  assert.ok(profileGrant);
  assert.doesNotMatch(profileGrant, /\brole\b/);
  assert.doesNotMatch(profileGrant, /\bemail\b/);
  assert.doesNotMatch(profileGrant, /\bphone\b/);
  assert.doesNotMatch(profileGrant, /\bphone_verified\b/);
  assert.doesNotMatch(profileGrant, /\bcampus_email_verified\b/);
  assert.doesNotMatch(profileGrant, /\bupdated_at\b/);
  assert.match(migration, /roll number is locked after first save/);
  assert.match(migration, /department is locked after first save/);
  assert.match(migration, /year of study is locked after first save/);
});

test('admin role changes use the trusted role assignment RPC', async () => {
  const [riders, vendors] = await Promise.all([
    read('src/app/admin/riders/page.tsx'),
    read('src/app/admin/vendors/page.tsx'),
  ]);

  for (const source of [riders, vendors]) {
    assert.match(source, /rpc\('admin_assign_user_role'/);
    assert.doesNotMatch(
      source,
      /\.from\('user_profiles'\)\s*\.update\(\{\s*role/
    );
  }
});

test('dark-store COD checkout is idempotent and uses one atomic RPC', async () => {
  const [route, client, migration] = await Promise.all([
    read('src/app/api/dark-store/cod/create-order/route.ts'),
    read(
      'src/app/dark-store-shopping/components/DarkStoreInteractive.tsx'
    ),
    read(
      'supabase/migrations/20260730000300_add_atomic_dark_store_cod_checkout.sql'
    ),
  ]);

  assert.match(client, /edstop-cod:/);
  assert.match(client, /idempotencyKey: codIdempotencyKey/);
  assert.match(route, /rpc\(\s*'create_dark_store_cod_order'/);
  assert.doesNotMatch(route, /\.from\('orders'\)\s*\.insert/);
  assert.match(
    migration,
    /ON CONFLICT \(user_id, checkout_idempotency_key\)/
  );
  assert.match(migration, /INSERT INTO public\.order_items/);
  assert.match(migration, /INSERT INTO public\.order_events/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_dark_store_cod_order/
  );
});

test('environment template contains every documented production variable', async () => {
  const env = await read('.env.example');

  for (const name of [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'RAZORPAY_MODE',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'NEXT_PUBLIC_RAZORPAY_KEY_ID',
    'RAZORPAY_TEST_CHECKOUT_ENABLED',
    'RAZORPAY_TEST_USER_IDS',
  ]) {
    assert.match(env, new RegExp(`^${name}=`, 'm'));
  }
});
