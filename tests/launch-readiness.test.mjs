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

test('operational order RPCs match client calls and enforce scoped transitions', async () => {
  const [
    admin,
    vendor,
    rider,
    migration,
    dispatchMigration,
    driftMigration,
    anonMigration,
  ] =
    await Promise.all([
      read('src/app/admin/operations/page.tsx'),
      read('src/app/vendor/orders/page.tsx'),
      read(
        'src/app/rider-dashboard/components/RiderDashboardInteractive.tsx'
      ),
      read(
        'supabase/migrations/20260731000100_add_operational_order_rpcs.sql'
      ),
      read(
        'supabase/migrations/20260731000200_require_rider_for_admin_dispatch.sql'
      ),
      read(
        'supabase/migrations/20260731000300_reconcile_operational_rpc_drift.sql'
      ),
      read(
        'supabase/migrations/20260731000400_harden_anonymous_public_surface.sql'
      ),
    ]);

  assert.match(admin, /rpc\('admin_update_order_status',\s*\{\s*p_order_id:/);
  assert.match(vendor, /rpc\('vendor_update_order_status',\s*\{\s*p_order_id:/);
  assert.match(rider, /rpc\('rider_claim_order',\s*\{\s*p_order_id:/);
  assert.match(rider, /rpc\('rider_mark_delivered',\s*\{\s*p_order_id:/);

  for (const functionName of [
    'admin_update_order_status',
    'vendor_update_order_status',
    'rider_claim_order',
    'rider_mark_delivered',
  ]) {
    assert.match(
      migration,
      new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`)
    );
  }

  assert.match(migration, /FOR UPDATE;/);
  assert.match(migration, /order is outside vendor scope/);
  assert.match(migration, /order is not assigned to this rider/);
  assert.match(migration, /idempotent_replay/);
  assert.match(migration, /INSERT INTO public\.order_events/);
  assert.doesNotMatch(migration, /public\.wallets/);
  assert.doesNotMatch(migration, /public\.transactions/);
  assert.doesNotMatch(migration, /public\.payment_intents/);
  assert.match(dispatchMigration, /rider assignment required/);
  assert.match(dispatchMigration, /v_rider_id IS NULL/);

  assert.match(
    driftMigration,
    /DROP FUNCTION IF EXISTS public\.admin_update_order_status\(\s*UUID,\s*public\.order_status/
  );
  assert.match(
    driftMigration,
    /DROP FUNCTION IF EXISTS public\.vendor_update_order_status\(\s*UUID,\s*public\.order_status/
  );
  assert.match(
    driftMigration,
    /DROP FUNCTION IF EXISTS public\.rider_claim_order\(UUID\)/
  );
  assert.match(
    driftMigration,
    /DROP FUNCTION IF EXISTS public\.rider_mark_delivered\(UUID\)/
  );
  assert.doesNotMatch(driftMigration, /DROP FUNCTION[\s\S]*\bCASCADE\b/);
  assert.match(driftMigration, /dependent object exists/);
  assert.match(driftMigration, /RETURNS JSONB/g);
  assert.match(driftMigration, /FOR UPDATE;/);
  assert.match(driftMigration, /idempotent_replay/);
  assert.match(driftMigration, /order is outside vendor scope/);
  assert.match(driftMigration, /order is not assigned to this rider/);
  assert.match(driftMigration, /rider assignment required/);

  assert.match(
    anonMigration,
    /REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public\s+FROM PUBLIC, anon, authenticated/
  );
  assert.match(
    anonMigration,
    /ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public\s+REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated/
  );
  assert.match(
    anonMigration,
    /GRANT USAGE ON SCHEMA public TO anon/
  );
  assert.match(
    anonMigration,
    /GRANT SELECT ON TABLE public\.restaurants, public\.menu_items TO anon/
  );
  assert.doesNotMatch(
    anonMigration,
    /GRANT\s+(?:INSERT|UPDATE|DELETE|ALL)[\s\S]*\bTO anon\b/i
  );
  for (const functionName of [
    'admin_update_order_status',
    'vendor_update_order_status',
    'rider_claim_order',
    'rider_mark_delivered',
  ]) {
    assert.match(
      driftMigration,
      new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${functionName}[\\s\\S]*?FROM PUBLIC, anon, authenticated`
      )
    );
  }
});

test('restaurant drift repair narrows policies without normalizing the production FK', async () => {
  const migration = await read(
    'supabase/migrations/20260731000300_reconcile_operational_rpc_drift.sql'
  );

  assert.match(migration, /owner_missing_profiles|v_missing_profiles/);
  assert.match(migration, /intentionally deferred/);
  assert.doesNotMatch(
    migration,
    /DROP CONSTRAINT\s+restaurants_owner_id_fkey/i
  );
  assert.match(migration, /ALTER COLUMN is_active SET NOT NULL/);
  assert.match(migration, /ALTER COLUMN is_open SET NOT NULL/);

  for (const policy of [
    'Admin full access restaurants',
    'Vendor manage own restaurant',
    'Admin full access menu',
    'Vendor manage own menu',
  ]) {
    assert.match(
      migration,
      new RegExp(`DROP POLICY IF EXISTS "${policy}"`)
    );
  }

  assert.match(migration, /up\.role = 'vendor'::public\.user_role/);
  assert.match(migration, /WITH CHECK \(/);
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
