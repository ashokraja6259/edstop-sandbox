-- Allow phone-auth users (who may have null email) to be created without trigger failures.
-- Fixes Supabase OTP signup error: "Database error saving new user".

ALTER TABLE public.user_profiles
  ALTER COLUMN email DROP NOT NULL;
