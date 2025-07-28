-- Fix security warning for function search path
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'VOC' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE vouchers.code = code) INTO exists_check;
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$;