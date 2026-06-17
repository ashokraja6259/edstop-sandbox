-- Fix overly permissive orders RLS policies

drop policy if exists "allow_all_authenticated_select"
on public.orders;

drop policy if exists "allow_all_authenticated_insert"
on public.orders;

drop policy if exists "allow_all_authenticated_update"
on public.orders;

drop policy if exists "allow_all_authenticated_delete"
on public.orders;

drop policy if exists "users_can_insert_own_orders"
on public.orders;

create policy "users_can_insert_own_orders"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "users_can_update_own_pending_orders"
on public.orders;

create policy "users_can_update_own_pending_orders"
on public.orders
for update
to authenticated
using (
  user_id = auth.uid()
  and status = 'pending'
)
with check (
  user_id = auth.uid()
  and status = 'pending'
);

drop policy if exists "admins_can_update_orders"
on public.orders;

create policy "admins_can_update_orders"
on public.orders
for update
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "admins_can_delete_orders"
on public.orders;

create policy "admins_can_delete_orders"
on public.orders
for delete
to authenticated
using (public.is_admin_user());

drop policy if exists "admins_can_insert_orders"
on public.orders;

create policy "admins_can_insert_orders"
on public.orders
for insert
to authenticated
with check (public.is_admin_user());