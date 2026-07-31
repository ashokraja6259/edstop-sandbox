import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('phone OTP is absent from the launch authentication surface', async () => {
  const [login, authContext] = await Promise.all([
    read('src/app/login/page.tsx'),
    read('src/contexts/AuthContext.tsx'),
  ]);

  assert.doesNotMatch(login, /Phone OTP|handlePhoneOtp|type="tel"/);
  assert.doesNotMatch(authContext, /signInWithPhoneOtp|verifyPhoneOtp|signInWithOtp/);
});

test('wallet surfaces use the database-backed wallet hook without fabricated balances', async () => {
  const [food, student, companion] = await Promise.all([
    read('src/app/food-ordering-interface/components/FoodOrderingInteractive.tsx'),
    read('src/app/student-dashboard/components/StudentDashboardInteractive.tsx'),
    read('src/app/ai-companion-interface/components/AICompanionInteractive.tsx'),
  ]);

  assert.match(food, /useWalletData\(user\?\.id\)/);
  assert.match(food, /WalletIndicator balance=\{walletBalance\}/);
  assert.match(food, /walletBalance=\{walletBalance\}/);
  assert.doesNotMatch(food, /balance=\{500\}|walletBalance=\{500\}/);
  assert.match(student, /liveBalance \?\? 0/);
  assert.doesNotMatch(student, /liveBalance \?\? 1250\.5/);
  assert.match(companion, /useWalletData\(user\?\.id\)/);
  assert.doesNotMatch(companion, /balance=\{1250\.5\}/);
});

test('food cart and checkout use the same persisted subtotal', async () => {
  const [food, cart, checkout] = await Promise.all([
    read('src/app/food-ordering-interface/components/FoodOrderingInteractive.tsx'),
    read('src/app/food-ordering-interface/components/CartSummary.tsx'),
    read('src/app/food-ordering-interface/components/CheckoutModal.tsx'),
  ]);

  assert.match(food, /convenienceFee=\{0\}/);
  assert.match(food, /total=\{subtotal\}/);
  assert.doesNotMatch(food, /subtotal \+ 10/);
  assert.match(cart, /convenienceFee > 0/);
  assert.match(checkout, /const remainingAmount = Math\.max\(0, subtotal - safeWalletAmount\)/);
});

test('rider orders are scoped server-side, include ledger items, and refresh after actions', async () => {
  const [route, hook, dashboard] = await Promise.all([
    read('src/app/api/rider/orders/route.ts'),
    read('src/hooks/useRiderRealtime.ts'),
    read('src/app/rider-dashboard/components/RiderDashboardInteractive.tsx'),
  ]);

  assert.match(route, /profile\?\.role !== 'rider'/);
  assert.match(route, /\.is\('rider_id', null\)\s*\.eq\('status', 'ready'\)/);
  assert.match(route, /\.eq\('rider_id', user\.id\)/);
  assert.match(route, /\.from\('order_items'\)/);
  assert.match(route, /itemsByOrder\.get\(order\.id\) \?\? \[\]/);
  assert.match(hook, /fetch\('\/api\/rider\/orders', \{ cache: 'no-store' \}\)/);
  assert.match(dashboard, /await refreshRiderOrders\(\)/g);
});

test('admin analytics resolves restaurant names using the order foreign key', async () => {
  const dashboard = await read('src/app/admin/dashboard/DashboardShell.tsx');

  assert.match(dashboard, /payment_method, restaurant_id, restaurant_name/);
  assert.match(dashboard, /restaurantNames\.get\(order\.restaurant_id\)/);
});
