-- AI Usage tracking table for AI Companion
CREATE TABLE IF NOT EXISTS public.ai_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  questions_used INTEGER NOT NULL DEFAULT 0,
  questions_limit INTEGER NOT NULL DEFAULT 5,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  last_reset_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one row per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_usage_user_id ON public.ai_usage(user_id);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_last_reset ON public.ai_usage(last_reset_at);

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_ai_usage_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_usage_updated_at ON public.ai_usage;
CREATE TRIGGER ai_usage_updated_at
  BEFORE UPDATE ON public.ai_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ai_usage_updated_at();

-- Enable RLS
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "users_manage_own_ai_usage" ON public.ai_usage;
CREATE POLICY "users_manage_own_ai_usage"
  ON public.ai_usage
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Mock data: seed ai_usage for existing users
DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_profiles'
  ) THEN
    SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
    IF existing_user_id IS NOT NULL THEN
      INSERT INTO public.ai_usage (user_id, questions_used, questions_limit, is_premium, last_reset_at)
      VALUES (existing_user_id, 3, 5, false, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO NOTHING;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'AI usage mock data insertion failed: %', SQLERRM;
END $$;
