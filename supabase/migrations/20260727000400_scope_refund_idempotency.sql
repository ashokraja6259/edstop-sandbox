-- Scope refund idempotency to the payment resource and authenticated actor.
-- This is additive for deployed databases and preserves all existing refunds.

ALTER TABLE public.payment_refunds
  DROP CONSTRAINT IF EXISTS payment_refunds_payment_intent_id_idempotency_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_refunds_actor_idempotency
ON public.payment_refunds (
  payment_intent_id,
  requested_by,
  idempotency_key
) NULLS NOT DISTINCT;

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

  IF p_requested_by IS NULL THEN
    RAISE EXCEPTION 'Refund actor is required';
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
    AND requested_by = p_requested_by
    AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'refund_id', v_existing.id,
      'provider_refund_id', v_existing.provider_refund_id,
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
    AND status IN ('refund_pending', 'processed', 'manual_review');

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
    'provider_refund_id', NULL,
    'amount_paise', v_amount,
    'status', 'refund_pending',
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reserve_razorpay_refund(
  UUID, UUID, TEXT, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_razorpay_refund(
  UUID, UUID, TEXT, BIGINT
) TO service_role;
