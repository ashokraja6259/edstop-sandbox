-- The application already protects and renders vendor routes, but the
-- authoritative role enum did not include vendor.
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'vendor';
