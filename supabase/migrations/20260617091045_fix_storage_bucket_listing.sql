-- Prevent public listing of public image buckets.
-- Public buckets still allow direct public URL access to known object paths.

drop policy if exists "Anyone can view lost found images"
on storage.objects;

drop policy if exists "Anyone can view marketplace images"
on storage.objects;