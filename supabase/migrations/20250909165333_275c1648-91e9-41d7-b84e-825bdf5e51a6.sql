-- Add delivery address fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- Add delivery address fields to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS delivery_address JSONB DEFAULT '{}'::jsonb;

-- Update orders RLS policies to allow admins to manage all orders
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to update order status
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow system to update orders (for edge functions)
CREATE POLICY "System can update orders" ON public.orders
  FOR UPDATE
  USING (true);

-- Create function to get order statistics
CREATE OR REPLACE FUNCTION public.get_order_statistics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_orders INTEGER;
  pending_orders INTEGER;
  completed_orders INTEGER;
  total_revenue NUMERIC;
  avg_order_value NUMERIC;
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT COUNT(*) INTO total_orders FROM orders;
  SELECT COUNT(*) INTO pending_orders FROM orders WHERE status = 'pending';
  SELECT COUNT(*) INTO completed_orders FROM orders WHERE status = 'completed';
  SELECT COALESCE(SUM(total_amount), 0) INTO total_revenue FROM orders WHERE status = 'completed';
  SELECT COALESCE(AVG(total_amount), 0) INTO avg_order_value FROM orders WHERE status = 'completed';

  RETURN json_build_object(
    'total_orders', total_orders,
    'pending_orders', pending_orders,
    'completed_orders', completed_orders,
    'total_revenue', total_revenue,
    'avg_order_value', avg_order_value
  );
END;
$$;