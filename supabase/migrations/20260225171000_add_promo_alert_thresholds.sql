-- Create promo_alert_thresholds table
CREATE TABLE IF NOT EXISTS public.promo_alert_thresholds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    redemption_cap_pct INTEGER NOT NULL DEFAULT 80,
    expiry_days_before INTEGER NOT NULL DEFAULT 3,
    roi_target_pct INTEGER NOT NULL DEFAULT 200,
    alert_emails TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create promo_alert_logs table
CREATE TABLE IF NOT EXISTS public.promo_alert_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    promo_code TEXT NOT NULL,
    details JSONB DEFAULT '{}'::JSONB,
    sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_promo_alert_logs_promo_code_id ON public.promo_alert_logs(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_alert_logs_alert_type ON public.promo_alert_logs(alert_type);
CREATE INDEX IF NOT EXISTS idx_promo_alert_logs_sent_at ON public.promo_alert_logs(sent_at);

-- Enable RLS
ALTER TABLE public.promo_alert_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_alert_logs ENABLE ROW LEVEL SECURITY;

-- RLS: only admins can manage thresholds
DROP POLICY IF EXISTS "admin_manage_promo_alert_thresholds" ON public.promo_alert_thresholds;
CREATE POLICY "admin_manage_promo_alert_thresholds"
ON public.promo_alert_thresholds
FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'))
WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS: only admins can read alert logs
DROP POLICY IF EXISTS "admin_read_promo_alert_logs" ON public.promo_alert_logs;
CREATE POLICY "admin_read_promo_alert_logs"
ON public.promo_alert_logs
FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- RLS: service role can insert alert logs
DROP POLICY IF EXISTS "service_insert_promo_alert_logs" ON public.promo_alert_logs;
CREATE POLICY "service_insert_promo_alert_logs"
ON public.promo_alert_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Seed default thresholds row
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.promo_alert_thresholds LIMIT 1) THEN
        INSERT INTO public.promo_alert_thresholds (redemption_cap_pct, expiry_days_before, roi_target_pct, alert_emails)
        VALUES (80, 3, 200, ARRAY[]::TEXT[]);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Seed failed: %', SQLERRM;
END $$;
