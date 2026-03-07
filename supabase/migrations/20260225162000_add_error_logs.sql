-- Create error_logs table for tracking 404/403 error events
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  route TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  referrer TEXT,
  user_agent TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON public.error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON public.error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_occurred_at ON public.error_logs(occurred_at);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own error logs
DROP POLICY IF EXISTS "users_insert_own_error_logs" ON public.error_logs;
CREATE POLICY "users_insert_own_error_logs"
  ON public.error_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Allow anonymous inserts (unauthenticated 404/403 events)
DROP POLICY IF EXISTS "anon_insert_error_logs" ON public.error_logs;
CREATE POLICY "anon_insert_error_logs"
  ON public.error_logs
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Admins can read all error logs
DROP POLICY IF EXISTS "admin_read_error_logs" ON public.error_logs;
CREATE POLICY "admin_read_error_logs"
  ON public.error_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role = 'admin'
    )
  );
