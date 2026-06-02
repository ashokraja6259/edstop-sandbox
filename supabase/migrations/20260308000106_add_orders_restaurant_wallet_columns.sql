ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS restaurant_id UUID;

ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS wallet_used NUMERIC(10, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.restaurants') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM pg_constraint
       WHERE conname = 'orders_restaurant_id_fkey'
         AND conrelid = 'public.orders'::regclass
     ) THEN
    ALTER TABLE public.orders
    ADD CONSTRAINT orders_restaurant_id_fkey
    FOREIGN KEY (restaurant_id)
    REFERENCES public.restaurants(id)
    ON DELETE SET NULL
    NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id
ON public.orders(restaurant_id);
