-- Migration: Add audit_logs table
-- Tracks all data mutations, security changes, and user actions
-- with timestamps, user IDs, and change metadata

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_data JSONB DEFAULT NULL,
    new_data JSONB DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    severity TEXT NOT NULL DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON public.audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_id ON public.audit_logs(resource_type, resource_id);

-- 3. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies
-- Authenticated users can insert their own audit logs
DROP POLICY IF EXISTS "authenticated_users_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_users_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Anonymous users can insert audit logs (for unauthenticated actions like 404 hits)
DROP POLICY IF EXISTS "anon_users_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "anon_users_insert_audit_logs"
ON public.audit_logs
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Users can read their own audit logs
DROP POLICY IF EXISTS "users_read_own_audit_logs" ON public.audit_logs;
CREATE POLICY "users_read_own_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can read all audit logs
DROP POLICY IF EXISTS "admins_read_all_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_read_all_audit_logs"
ON public.audit_logs
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Admins can delete audit logs (for data retention management)
DROP POLICY IF EXISTS "admins_delete_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_delete_audit_logs"
ON public.audit_logs
FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);
