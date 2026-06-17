-- Lost & Found MVP with image storage

create table if not exists public.lost_found_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null check (char_length(trim(title)) between 3 and 120),
  description text not null check (char_length(trim(description)) between 5 and 1200),
  category text not null default 'other',
  item_type text not null check (item_type in ('lost', 'found')),
  location text not null check (char_length(trim(location)) between 2 and 160),

  contact_phone text,
  image_url text,

  status text not null default 'active' check (status in ('active', 'claimed', 'closed')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lost_found_items_user_id_idx
  on public.lost_found_items(user_id);

create index if not exists lost_found_items_status_created_at_idx
  on public.lost_found_items(status, created_at desc);

create index if not exists lost_found_items_item_type_idx
  on public.lost_found_items(item_type);

create index if not exists lost_found_items_category_idx
  on public.lost_found_items(category);

alter table public.lost_found_items enable row level security;

create or replace function public.is_admin_user()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.set_lost_found_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lost_found_items_set_updated_at on public.lost_found_items;

create trigger lost_found_items_set_updated_at
before update on public.lost_found_items
for each row
execute function public.set_lost_found_updated_at();

drop policy if exists "Authenticated users can view active lost found items"
on public.lost_found_items;

create policy "Authenticated users can view active lost found items"
on public.lost_found_items
for select
to authenticated
using (
  status = 'active'
  or user_id = auth.uid()
  or public.is_admin_user()
);

drop policy if exists "Users can create their own lost found items"
on public.lost_found_items;

create policy "Users can create their own lost found items"
on public.lost_found_items
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update their own lost found items"
on public.lost_found_items;

create policy "Users can update their own lost found items"
on public.lost_found_items
for update
to authenticated
using (user_id = auth.uid() or public.is_admin_user())
with check (user_id = auth.uid() or public.is_admin_user());

drop policy if exists "Users can delete their own lost found items"
on public.lost_found_items;

create policy "Users can delete their own lost found items"
on public.lost_found_items
for delete
to authenticated
using (user_id = auth.uid() or public.is_admin_user());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lost-found-images',
  'lost-found-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can view lost found images"
on storage.objects;

create policy "Anyone can view lost found images"
on storage.objects
for select
using (bucket_id = 'lost-found-images');

drop policy if exists "Authenticated users can upload lost found images"
on storage.objects;

create policy "Authenticated users can upload lost found images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'lost-found-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update their own lost found images"
on storage.objects;

create policy "Users can update their own lost found images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'lost-found-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
)
with check (
  bucket_id = 'lost-found-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
);

drop policy if exists "Users can delete their own lost found images"
on storage.objects;

create policy "Users can delete their own lost found images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'lost-found-images'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin_user()
  )
);