-- Persist dark-store Razorpay checkout state so verification cannot trust
-- client-resubmitted cart or promo data.

CREATE TABLE IF NOT EXISTS public.payment_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'razorpay',
  provider_order_id TEXT NOT NULL UNIQUE,
  provider_payment_id TEXT UNIQUE,
  order_type public.order_type NOT NULL DEFAULT 'store',
  amount_paise INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  items JSONB NOT NULL,
  promo_code TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.payment_intents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own payment intents" ON public.payment_intents;
CREATE POLICY "Users can view own payment intents"
ON public.payment_intents
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON TABLE public.payment_intents FROM anon, authenticated;
GRANT SELECT ON TABLE public.payment_intents TO authenticated;

DROP TRIGGER IF EXISTS update_payment_intents_updated_at ON public.payment_intents;
CREATE TRIGGER update_payment_intents_updated_at
  BEFORE UPDATE ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
