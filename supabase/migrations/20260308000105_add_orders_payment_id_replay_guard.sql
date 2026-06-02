ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS payment_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_id_unique
ON public.orders(payment_id)
WHERE payment_id IS NOT NULL;
