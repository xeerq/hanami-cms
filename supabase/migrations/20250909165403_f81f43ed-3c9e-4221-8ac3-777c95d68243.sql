-- Fix security definer function by removing SECURITY DEFINER
DROP FUNCTION IF EXISTS public.get_order_statistics();

-- Create a safer RLS-based approach for order statistics
CREATE OR REPLACE FUNCTION public.get_order_statistics()
RETURNS JSON
LANGUAGE plpgsql
STABLE
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