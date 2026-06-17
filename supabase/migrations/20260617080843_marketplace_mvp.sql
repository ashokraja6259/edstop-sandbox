-- Buy & Sell Marketplace MVP with image storage

create table if not exists public.marketplace_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 5 and 1500),
  category text not null default 'other',
  price integer not null default 0 check (price >= 0),

  condition text not null default 'used' check (condition in ('new', 'like_new', 'used', 'fair')),
  location text not null check (char_length(trim(location)) between 2 and 160),

  contact_phone text,
  image_url text,

  status text not null default 'active' check (status in ('active', 'sold', 'closed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marketplace_items_user_id_idx
  on public.marketplace_items(user_id);

create index if not exists marketplace_items_status_created_at_idx
  on public.marketplace_items(status, created_at desc);

create index if not exists marketplace_items_category_idx
  on public.marketplace_items(category);

create index if not exists marketplace_items_price_idx
  on public.marketplace_items(price);

alter table public.marketplace_items enable row level security;

create or replace function public.set_marketplace_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists marketplace_items_set_updated_at on public.marketplace_items;

create trigger marketplace_items_set_updated_at
before update on public.marketplace_items
for each row
execute function public.set_marketplace_updated_at();

drop policy if exists "Authenticated users can view active marketplace items"
on public.marketplace_items;

create policy "Authenticated users can view active marketplace items"
on public.marketplace_items
for select
to authenticated
using (
  status = 'active'
  or user_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "Users can create their own marketplace items"
on public.marketplace_items;

create policy "Users can create their own marketplace items"
on public.marketplace_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own marketplace items"
on public.marketplace_items;

create policy "Users can update their own marketplace items"
on public.marketplace_items
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "Users can delete their own marketplace items"
on public.marketplace_items;

create policy "Users can delete their own marketplace items"
on public.marketplace_items
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'marketplace-images',
  'marketplace-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view marketplace images"
on storage.objects;

create policy "Anyone can view marketplace images"
on storage.objects
for select
using (bucket_id = 'marketplace-images');

drop policy if exists "Authenticated users can upload marketplace images"
on storage.objects;

create policy "Authenticated users can upload marketplace images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'marketplace-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own marketplace images"
on storage.objects;

create policy "Users can update their own marketplace images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'marketplace-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
)
with check (
  bucket_id = 'marketplace-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
);

drop policy if exists "Users can delete their own marketplace images"
on storage.objects;

create policy "Users can delete their own marketplace images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'marketplace-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
);