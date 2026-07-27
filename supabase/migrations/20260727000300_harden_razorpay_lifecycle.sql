-- Additive Razorpay lifecycle hardening.
-- Existing payment intents and orders are preserved and backfilled. Online food
-- payment remains disabled; this schema supports the dark-store Test Mode path.

ALTER TABLE public.payment_intents
  ALTER COLUMN provider_order_id DROP NOT NULL;

ALTER TABLE public.payment_intents
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS receipt TEXT,
  ADD COLUMN IF NOT EXISTS restaurant_id UUID,
  ADD COLUMN IF NOT EXISTS store_id TEXT,
  ADD COLUMN IF NOT EXISTS item_subtotal_paise BIGINT,
  ADD COLUMN IF NOT EXISTS tax_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fee_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wallet_amount_paise BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS razorpay_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS total_amount_paise BIGINT,
  ADD COLUMN IF NOT EXISTS internal_order_id UUID,
  ADD COLUMN IF NOT EXISTS failure_code TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS environment_mode TEXT NOT NULL DEFAULT 'test',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_provider_sync_at TIMESTAMPTZ;

UPDATE public.payment_intents
SET
  idempotency_key = COALESCE(idempotency_key, 'legacy-' || id::TEXT),
  receipt = COALESCE(receipt, 'legacy_' || REPLACE(id::TEXT, '-', '')),
  item_subtotal_paise = COALESCE(item_subtotal_paise, amount_paise),
  fee_amount_paise = COALESCE(fee_amount_paise, 0),
  razorpay_amount_paise = COALESCE(razorpay_amount_paise, amount_paise),
  total_amount_paise = COALESCE(total_amount_paise, amount_paise),
  expires_at = COALESCE(expires_at, created_at + INTERVAL '30 minutes'),
  status = CASE WHEN status = 'paid' THEN 'captured' ELSE status END;

UPDATE public.payment_intents AS pi
SET
  internal_order_id = o.id,
  status = 'order_created',
  verified_at = COALESCE(pi.verified_at, o.created_at),
  completed_at = COALESCE(pi.completed_at, o.created_at)
FROM public.orders AS o
WHERE pi.provider_payment_id IS NOT NULL
  AND o.payment_id = pi.provider_payment_id
  AND pi.internal_order_id IS NULL;

ALTER TABLE public.payment_intents
  ALTER COLUMN idempotency_key SET NOT NULL,
  ALTER COLUMN receipt SET NOT NULL,
  ALTER COLUMN item_subtotal_paise SET NOT NULL,
  ALTER COLUMN fee_amount_paise SET NOT NULL,
  ALTER COLUMN razorpay_amount_paise SET NOT NULL,
  ALTER COLUMN total_amount_paise SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_internal_order_id_fkey'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_internal_order_id_fkey
      FOREIGN KEY (internal_order_id) REFERENCES public.orders(id)
      ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_status_check'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_status_check CHECK (
        status IN (
          'created', 'pending', 'razorpay_order_created', 'authorized',
          'captured', 'verified', 'order_created', 'failed', 'cancelled',
          'expired', 'refund_pending', 'partially_refunded', 'refunded',
          'refund_failed', 'manual_review'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_amounts_check'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_amounts_check CHECK (
        amount_paise >= 0
        AND item_subtotal_paise >= 0
        AND tax_amount_paise >= 0
        AND fee_amount_paise >= 0
        AND discount_amount_paise >= 0
        AND wallet_amount_paise >= 0
        AND razorpay_amount_paise >= 0
        AND total_amount_paise >= 0
        AND amount_paise = razorpay_amount_paise
        AND item_subtotal_paise + tax_amount_paise + fee_amount_paise
              = total_amount_paise + discount_amount_paise
        AND total_amount_paise = wallet_amount_paise + razorpay_amount_paise
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_currency_check'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_currency_check CHECK (currency = 'INR');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_environment_mode_check'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_environment_mode_check
      CHECK (environment_mode IN ('test', 'live'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_intents_timestamps_check'
      AND conrelid = 'public.payment_intents'::regclass
  ) THEN
    ALTER TABLE public.payment_intents
      ADD CONSTRAINT payment_intents_timestamps_check CHECK (
        expires_at >= created_at
        AND (verified_at IS NULL OR verified_at >= created_at)
        AND (completed_at IS NULL OR completed_at >= created_at)
      );
  END IF;
END;
$constraints$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_user_idempotency
ON public.payment_intents(user_id, idempotency_key);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_receipt
ON public.payment_intents(receipt);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_provider_payment
ON public.payment_intents(provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_internal_order
ON public.payment_intents(internal_order_id)
WHERE internal_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intents_status_expires
ON public.payment_intents(status, expires_at);

CREATE TABLE IF NOT EXISTS public.payment_intent_audit (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  payment_intent_id UUID NOT NULL
    REFERENCES public.payment_intents(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  source TEXT NOT NULL,
  actor_user_id UUID,
  event_fingerprint TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payment_intent_audit_intent_created
ON public.payment_intent_audit(payment_intent_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.razorpay_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_fingerprint TEXT NOT NULL UNIQUE,
  event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  provider_order_id TEXT,
  provider_payment_id TEXT,
  provider_refund_id TEXT,
  payment_intent_id UUID
    REFERENCES public.payment_intents(id) ON DELETE SET NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMPTZ,
  processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processed', 'ignored', 'failed')),
  outcome TEXT,
  payload_metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_razorpay_webhook_events_intent
ON public.razorpay_webhook_events(payment_intent_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_intent_id UUID NOT NULL
    REFERENCES public.payment_intents(id) ON DELETE RESTRICT,
  requested_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  provider_refund_id TEXT UNIQUE,
  amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
  currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  status TEXT NOT NULL DEFAULT 'refund_pending'
    CHECK (status IN (
      'refund_pending', 'processed', 'failed', 'manual_review'
    )),
  failure_code TEXT,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMPTZ,
  UNIQUE (payment_intent_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_intent_status
ON public.payment_refunds(payment_intent_id, status);

DROP TRIGGER IF EXISTS update_payment_refunds_updated_at
ON public.payment_refunds;
CREATE TRIGGER update_payment_refunds_updated_at
  BEFORE UPDATE ON public.payment_refunds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.payment_intent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.razorpay_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.payment_intents FROM anon, authenticated;
GRANT SELECT (
  id, order_type, item_subtotal_paise, tax_amount_paise, fee_amount_paise,
  discount_amount_paise, wallet_amount_paise, razorpay_amount_paise,
  total_amount_paise, currency, status, internal_order_id, failure_code,
  failure_reason, created_at, updated_at, expires_at, verified_at, completed_at
) ON public.payment_intents TO authenticated;

REVOKE ALL ON TABLE public.payment_intent_audit FROM anon, authenticated;
REVOKE ALL ON TABLE public.razorpay_webhook_events FROM anon, authenticated;
REVOKE ALL ON TABLE public.payment_refunds FROM anon, authenticated;

CREATE POLICY "Users view own payment refunds"
ON public.payment_refunds
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.payment_intents AS pi
    WHERE pi.id = payment_refunds.payment_intent_id
      AND pi.user_id = auth.uid()
  )
);

GRANT SELECT (
  id, payment_intent_id, amount_paise, currency, status,
  failure_code, failure_reason, created_at, updated_at, completed_at
) ON public.payment_refunds TO authenticated;

CREATE OR REPLACE FUNCTION public.payment_transition_is_legal(
  p_from TEXT,
  p_to TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog
AS $$
  SELECT p_from = p_to OR CASE p_from
    WHEN 'created' THEN p_to IN ('pending', 'failed', 'cancelled', 'expired')
    WHEN 'pending' THEN p_to IN (
      'razorpay_order_created', 'failed', 'manual_review', 'expired'
    )
    WHEN 'razorpay_order_created' THEN p_to IN (
      'authorized', 'captured', 'verified', 'failed', 'expired', 'manual_review'
    )
    WHEN 'authorized' THEN p_to IN (
      'captured', 'failed', 'expired', 'manual_review'
    )
    WHEN 'captured' THEN p_to IN (
      'verified', 'order_created', 'refund_pending', 'manual_review'
    )
    WHEN 'verified' THEN p_to IN ('order_created', 'manual_review')
    WHEN 'order_created' THEN p_to IN (
      'refund_pending', 'partially_refunded', 'refunded', 'manual_review'
    )
    WHEN 'failed' THEN p_to = 'manual_review'
    WHEN 'cancelled' THEN p_to = 'manual_review'
    WHEN 'expired' THEN p_to = 'manual_review'
    WHEN 'refund_pending' THEN p_to IN (
      'partially_refunded', 'refunded', 'refund_failed', 'manual_review'
    )
    WHEN 'partially_refunded' THEN p_to IN (
      'refund_pending', 'refunded', 'manual_review'
    )
    WHEN 'refund_failed' THEN p_to IN ('refund_pending', 'manual_review')
    WHEN 'manual_review' THEN p_to IN (
      'authorized', 'captured', 'verified', 'order_created',
      'refund_pending', 'partially_refunded', 'refunded', 'refund_failed'
    )
    ELSE FALSE
  END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_payment_intent_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND NOT public.payment_transition_is_legal(OLD.status, NEW.status) THEN
    RAISE EXCEPTION 'Illegal payment transition from % to %',
      OLD.status, NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_payment_intent_transition
ON public.payment_intents;
CREATE TRIGGER enforce_payment_intent_transition
  BEFORE UPDATE OF status ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_payment_intent_transition();

CREATE OR REPLACE FUNCTION public.audit_payment_intent_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.payment_intent_audit (
      payment_intent_id, from_status, to_status, source, actor_user_id, detail
    )
    VALUES (
      NEW.id,
      OLD.status,
      NEW.status,
      COALESCE(
        NULLIF(current_setting('app.payment_transition_source', true), ''),
        'database_transition'
      ),
      auth.uid(),
      '{}'::JSONB
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_payment_intent_transition
ON public.payment_intents;
CREATE TRIGGER audit_payment_intent_transition
  AFTER UPDATE OF status ON public.payment_intents
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_payment_intent_transition();

CREATE OR REPLACE FUNCTION public.finalize_razorpay_payment(
  p_payment_intent_id UUID,
  p_provider_payment_id TEXT,
  p_amount_paise BIGINT,
  p_currency TEXT,
  p_provider_snapshot JSONB DEFAULT '{}'::JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_order_id UUID;
  v_order_number TEXT;
  v_existing_intent_id UUID;
  v_item_count INTEGER;
BEGIN
  IF CURRENT_USER NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Trusted backend role required';
  END IF;

  IF p_provider_payment_id IS NULL OR LENGTH(p_provider_payment_id) > 128 THEN
    RAISE EXCEPTION 'Invalid provider payment id';
  END IF;

  SELECT *
  INTO v_intent
  FROM public.payment_intents
  WHERE id = p_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment intent not found';
  END IF;

  IF v_intent.internal_order_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'order_id', v_intent.internal_order_id,
      'idempotent_replay', true
    );
  END IF;

  IF v_intent.status NOT IN (
    'razorpay_order_created', 'authorized', 'captured', 'verified',
    'manual_review'
  ) THEN
    RAISE EXCEPTION 'Payment intent is not finalizable from state %',
      v_intent.status;
  END IF;

  IF p_amount_paise <> v_intent.razorpay_amount_paise
     OR p_currency <> v_intent.currency
     OR p_currency <> 'INR' THEN
    RAISE EXCEPTION 'Provider amount or currency mismatch';
  END IF;

  SELECT id
  INTO v_existing_intent_id
  FROM public.payment_intents
  WHERE provider_payment_id = p_provider_payment_id
    AND id <> v_intent.id
  LIMIT 1;

  IF v_existing_intent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Provider payment already consumed';
  END IF;

  IF v_intent.total_amount_paise
       <> v_intent.wallet_amount_paise + v_intent.razorpay_amount_paise THEN
    RAISE EXCEPTION 'Payment accounting mismatch';
  END IF;

  IF v_intent.status NOT IN ('captured', 'verified') THEN
    UPDATE public.payment_intents
    SET
      status = 'captured',
      provider_payment_id = p_provider_payment_id,
      last_provider_sync_at = CURRENT_TIMESTAMP
    WHERE id = v_intent.id;
  END IF;

  SELECT COUNT(*)
  INTO v_item_count
  FROM jsonb_to_recordset(v_intent.items)
    AS item(
      id TEXT,
      name TEXT,
      quantity INTEGER,
      "pricePaise" BIGINT,
      "totalPricePaise" BIGINT
    )
  WHERE item.id IS NOT NULL
    AND item.name IS NOT NULL
    AND item.quantity > 0
    AND item."pricePaise" >= 0
    AND item."totalPricePaise" = item."pricePaise" * item.quantity;

  IF v_item_count = 0
     OR v_item_count <> jsonb_array_length(v_intent.items) THEN
    RAISE EXCEPTION 'Stored payment items are invalid';
  END IF;

  IF v_intent.wallet_amount_paise > 0 THEN
    SELECT *
    INTO v_wallet
    FROM public.wallets
    WHERE user_id = v_intent.user_id
    FOR UPDATE;

    IF NOT FOUND
       OR ROUND(v_wallet.balance * 100)::BIGINT
            < v_intent.wallet_amount_paise THEN
      RAISE EXCEPTION 'Insufficient wallet balance';
    END IF;
  END IF;

  v_order_id := gen_random_uuid();
  v_order_number :=
    'DS' || UPPER(SUBSTRING(REPLACE(v_intent.id::TEXT, '-', '') FROM 1 FOR 14));

  INSERT INTO public.orders (
    id, user_id, order_number, order_type, status, total_amount,
    delivery_fee, tax_amount, discount_amount, promo_code, promo_discount,
    final_amount, payment_method, payment_id, wallet_used, items, notes
  )
  VALUES (
    v_order_id,
    v_intent.user_id,
    v_order_number,
    'store',
    'pending',
    (v_intent.item_subtotal_paise
      + v_intent.fee_amount_paise
      + v_intent.tax_amount_paise)::NUMERIC / 100,
    v_intent.fee_amount_paise::NUMERIC / 100,
    v_intent.tax_amount_paise::NUMERIC / 100,
    v_intent.discount_amount_paise::NUMERIC / 100,
    v_intent.promo_code,
    v_intent.discount_amount_paise::NUMERIC / 100,
    v_intent.total_amount_paise::NUMERIC / 100,
    'razorpay',
    p_provider_payment_id,
    v_intent.wallet_amount_paise::NUMERIC / 100,
    v_intent.items,
    NULL
  );

  INSERT INTO public.order_items (
    order_id, item_id, item_name, quantity, price, total_price
  )
  SELECT
    v_order_id,
    item.id,
    item.name,
    item.quantity,
    item."pricePaise"::NUMERIC / 100,
    item."totalPricePaise"::NUMERIC / 100
  FROM jsonb_to_recordset(v_intent.items)
    AS item(
      id TEXT,
      name TEXT,
      quantity INTEGER,
      "pricePaise" BIGINT,
      "totalPricePaise" BIGINT
    );

  IF v_intent.wallet_amount_paise > 0 THEN
    UPDATE public.wallets
    SET balance =
      balance - (v_intent.wallet_amount_paise::NUMERIC / 100),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = v_wallet.id;

    INSERT INTO public.wallet_transactions (
      user_id, amount, type, reference_id, description, metadata
    )
    VALUES (
      v_intent.user_id,
      -(v_intent.wallet_amount_paise::NUMERIC / 100),
      'order_payment',
      v_order_id,
      'Wallet used for Razorpay order ' || v_order_number,
      jsonb_build_object('payment_intent_id', v_intent.id)
    );
  END IF;

  INSERT INTO public.order_events (
    order_id, event_type, old_status, new_status, metadata
  )
  VALUES (
    v_order_id,
    'ORDER_CREATED',
    NULL,
    'pending',
    jsonb_build_object(
      'payment_method', 'razorpay',
      'payment_intent_id', v_intent.id,
      'wallet_amount_paise', v_intent.wallet_amount_paise,
      'razorpay_amount_paise', v_intent.razorpay_amount_paise
    )
  );

  UPDATE public.payment_intents
  SET
    provider_payment_id = p_provider_payment_id,
    status = 'order_created',
    internal_order_id = v_order_id,
    verified_at = COALESCE(verified_at, CURRENT_TIMESTAMP),
    completed_at = CURRENT_TIMESTAMP,
    last_provider_sync_at = CURRENT_TIMESTAMP,
    metadata = metadata || jsonb_build_object(
      'provider_snapshot', COALESCE(p_provider_snapshot, '{}'::JSONB)
    )
  WHERE id = v_intent.id;

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'order_number', v_order_number,
    'idempotent_replay', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reserve_razorpay_refund(
  p_payment_intent_id UUID,
  p_requested_by UUID,
  p_idempotency_key TEXT,
  p_amount_paise BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_intent public.payment_intents%ROWTYPE;
  v_existing public.payment_refunds%ROWTYPE;
  v_committed BIGINT;
  v_refundable BIGINT;
  v_amount BIGINT;
  v_refund_id UUID;
BEGIN
  IF CURRENT_USER NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Trusted backend role required';
  END IF;

  IF p_idempotency_key IS NULL
     OR LENGTH(p_idempotency_key) > 128
     OR p_idempotency_key !~ '^[A-Za-z0-9_-]+$' THEN
    RAISE EXCEPTION 'Invalid refund idempotency key';
  END IF;

  SELECT *
  INTO v_intent
  FROM public.payment_intents
  WHERE id = p_payment_intent_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment intent not found';
  END IF;

  SELECT *
  INTO v_existing
  FROM public.payment_refunds
  WHERE payment_intent_id = v_intent.id
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'refund_id', v_existing.id,
      'amount_paise', v_existing.amount_paise,
      'status', v_existing.status,
      'idempotent_replay', true
    );
  END IF;

  IF v_intent.provider_payment_id IS NULL
     OR v_intent.internal_order_id IS NULL
     OR v_intent.status NOT IN (
       'order_created', 'partially_refunded', 'refund_failed'
     ) THEN
    RAISE EXCEPTION 'Payment is not refundable';
  END IF;

  SELECT COALESCE(SUM(amount_paise), 0)
  INTO v_committed
  FROM public.payment_refunds
  WHERE payment_intent_id = v_intent.id
    AND status IN ('refund_pending', 'processed');

  v_refundable := v_intent.razorpay_amount_paise - v_committed;
  v_amount := COALESCE(p_amount_paise, v_refundable);

  IF v_amount <= 0 OR v_amount > v_refundable THEN
    RAISE EXCEPTION 'Refund exceeds refundable amount';
  END IF;

  v_refund_id := gen_random_uuid();
  INSERT INTO public.payment_refunds (
    id, payment_intent_id, requested_by, idempotency_key,
    amount_paise, currency, status
  )
  VALUES (
    v_refund_id, v_intent.id, p_requested_by, p_idempotency_key,
    v_amount, 'INR', 'refund_pending'
  );

  UPDATE public.payment_intents
  SET status = 'refund_pending'
  WHERE id = v_intent.id;

  RETURN jsonb_build_object(
    'refund_id', v_refund_id,
    'amount_paise', v_amount,
    'status', 'refund_pending',
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.payment_transition_is_legal(TEXT, TEXT)
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_payment_intent_transition()
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_payment_intent_transition()
FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finalize_razorpay_payment(
  UUID, TEXT, BIGINT, TEXT, JSONB
) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reserve_razorpay_refund(
  UUID, UUID, TEXT, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_razorpay_payment(
  UUID, TEXT, BIGINT, TEXT, JSONB
) TO service_role;
GRANT EXECUTE ON FUNCTION public.reserve_razorpay_refund(
  UUID, UUID, TEXT, BIGINT
) TO service_role;
