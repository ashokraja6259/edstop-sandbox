import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const repoFile = (path) => new URL(`../${path}`, import.meta.url);
const read = (path) => readFile(repoFile(path), 'utf8');

const payload = JSON.parse(
  await read('data/menu-import/2026-07-soft-launch-menus.json')
);

test('staging dataset is complete, deterministic, and unavailable', () => {
  assert.equal(payload.schema_version, 1);
  assert.equal(payload.status, 'repository_validation_only');
  assert.deepEqual(
    payload.restaurants.map((restaurant) => restaurant.name),
    [
      'Amigos Grill Cafe',
      'Spicy Darbar',
      'Amigos Andhra Bhawan',
      'Red Panda',
    ]
  );
  assert.equal(payload.items.length, 884);
  assert.equal(new Set(payload.items.map((item) => item.id)).size, 884);
  assert.equal(new Set(payload.items.map((item) => item.external_id)).size, 884);
  assert.equal(new Set(payload.restaurants.map((restaurant) => restaurant.slug)).size, 4);
  assert.equal(new Set(payload.items.map((item) => [
    item.restaurant_slug,
    item.category_name,
    item.logical_item_name,
    item.portion_name,
  ].join('|'))).size, 884);
  assert.ok(payload.restaurants.every((restaurant) => !restaurant.availability));
  assert.ok(payload.restaurants.every((restaurant) => !restaurant.is_active));
  assert.ok(payload.restaurants.every((restaurant) => !restaurant.is_open));
  assert.ok(payload.items.every((item) => !item.availability));
  assert.ok(payload.items.every((item) => Number.isInteger(item.price) && item.price > 0));
  assert.ok(payload.items.every((item) => item.category_name && item.item_name));
  assert.ok(payload.items.every((item) => item.item_description));
  assert.ok(payload.items.every((item) => item.dietary_type && item.spice_level));
  assert.ok(payload.items.every((item) => item.source_pdf && item.source_page > 0));

  const logicalItems = new Set(
    payload.items.map((item) => [
      item.restaurant_slug,
      item.category_name,
      item.logical_item_name,
    ].join('|'))
  );
  assert.equal(logicalItems.size, 738);
});

test('reviewed edge cases use approved deployment prices', () => {
  const find = (name) => payload.items.filter(
    (item) => item.logical_item_name === name
  );

  assert.deepEqual(find('Veg Arabian Mandi').map((item) => item.price), [249, 499, 799]);
  assert.deepEqual(find('Veg Arabian Mandi').map((item) => item.portion_name), [
    'Single Serving',
    'Half Platter',
    'Full Platter',
  ]);
  assert.equal(find('Peri-Peri Chicken Mac & Cheese')[0].price, 229);
  assert.equal(find('Mutton Keema Biryani')[0].price, 319);
  assert.equal(find('Amigos Raju Gari Kodi Pulao')[0].dietary_type, 'Veg');
  assert.equal(find('Tandoori Mushroom')[0].dietary_type, 'Non-Veg');

  const greekSalads = find('Greek Salad');
  assert.deepEqual(greekSalads.map((item) => item.price), [249, 329, 179]);
  assert.match(payload.source_policy.pricing_policy, /non-discounted/);
  assert.match(payload.source_policy.pricing_policy, /offer prices are not imported/);
  assert.match(payload.source_policy.duplicate_conflict, /₹229/);
  assert.match(payload.source_policy.mandi_price_approval, /₹249.*₹499.*₹799/);
});

test('migration stages only menu data and does not activate or delete outlets', async () => {
  const migration = await read(
    'supabase/migrations/20260731000700_stage_soft_launch_food_menus.sql'
  );

  assert.match(migration, /v_restaurant_count <> 4 OR v_item_count <> 884/);
  assert.match(migration, /is_available = false/);
  assert.match(migration, /is_open = false/);
  assert.match(migration, /is_active = false/);
  assert.match(migration, /NULL,\n    staged\.category_name/);
  assert.doesNotMatch(migration, /DELETE\s+FROM/i);
  assert.doesNotMatch(migration, /wallets|wallet_transactions|razorpay|payment_intents/i);
  assert.doesNotMatch(migration, /UPDATE\s+public\.orders|UPDATE\s+public\.order_items/i);
});

test('food ordering reads and displays ordered menu metadata', async () => {
  const [interactive, card] = await Promise.all([
    read('src/app/food-ordering-interface/components/FoodOrderingInteractive.tsx'),
    read('src/app/food-ordering-interface/components/MenuItemCard.tsx'),
  ]);

  assert.match(interactive, /category_sort_order/);
  assert.match(interactive, /item_sort_order/);
  assert.match(interactive, /display_order/);
  assert.match(interactive, /menuCategories\.map/);
  assert.match(card, /dietaryType/);
  assert.match(card, /spiceLevel/);
  assert.match(card, /item\.badge/);
});
