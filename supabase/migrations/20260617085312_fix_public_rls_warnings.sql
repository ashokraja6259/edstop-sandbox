-- Fix Supabase rls_disabled_in_public warnings

alter table public.delivery_hubs enable row level security;
alter table public.delivery_points enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.dispatch_queue enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_item_variants enable row level security;
alter table public.restaurant_settlements enable row level security;
alter table public.rider_settlements enable row level security;
alter table public.riders enable row level security;

drop policy if exists "Public can view delivery hubs"
on public.delivery_hubs;

create policy "Public can view delivery hubs"
on public.delivery_hubs
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view delivery points"
on public.delivery_points;

create policy "Public can view delivery points"
on public.delivery_points
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view delivery zones"
on public.delivery_zones;

create policy "Public can view delivery zones"
on public.delivery_zones
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view menu categories"
on public.menu_categories;

create policy "Public can view menu categories"
on public.menu_categories
for select
to anon, authenticated
using (true);

drop policy if exists "Public can view menu item variants"
on public.menu_item_variants;

create policy "Public can view menu item variants"
on public.menu_item_variants
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage delivery hubs"
on public.delivery_hubs;

create policy "Admins can manage delivery hubs"
on public.delivery_hubs
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage delivery points"
on public.delivery_points;

create policy "Admins can manage delivery points"
on public.delivery_points
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage delivery zones"
on public.delivery_zones;

create policy "Admins can manage delivery zones"
on public.delivery_zones
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage menu categories"
on public.menu_categories;

create policy "Admins can manage menu categories"
on public.menu_categories
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage menu item variants"
on public.menu_item_variants;

create policy "Admins can manage menu item variants"
on public.menu_item_variants
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage dispatch queue"
on public.dispatch_queue;

create policy "Admins can manage dispatch queue"
on public.dispatch_queue
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Riders and admins can view dispatch queue"
on public.dispatch_queue;

create policy "Riders and admins can view dispatch queue"
on public.dispatch_queue
for select
to authenticated
using (
  public.is_admin_user()
  or exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'rider'
  )
);

drop policy if exists "Admins can manage restaurant settlements"
on public.restaurant_settlements;

create policy "Admins can manage restaurant settlements"
on public.restaurant_settlements
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage rider settlements"
on public.rider_settlements;

create policy "Admins can manage rider settlements"
on public.rider_settlements
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "Admins can manage riders"
on public.riders;

create policy "Admins can manage riders"
on public.riders
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

