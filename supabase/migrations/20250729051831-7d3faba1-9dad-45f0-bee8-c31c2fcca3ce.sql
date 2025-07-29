-- Fix the generate_voucher_code function to avoid ambiguous column reference
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    new_code := 'VOC' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE vouchers.code = new_code) INTO exists_check;
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN new_code;
END;
$function$;

-- Add foreign key relationship between vouchers and services
ALTER TABLE public.vouchers 
ADD CONSTRAINT fk_vouchers_service_id 
FOREIGN KEY (service_id) REFERENCES public.services(id) ON DELETE SET NULL;