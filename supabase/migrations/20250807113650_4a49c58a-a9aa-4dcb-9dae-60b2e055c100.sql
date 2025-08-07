-- Fix the process_voucher_redemption function to correctly handle value vouchers
CREATE OR REPLACE FUNCTION public.process_voucher_redemption(p_voucher_code text, p_appointment_id uuid, p_service_price numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_voucher RECORD;
  v_service RECORD;
  v_redeemed_value NUMERIC;
  v_redeemed_sessions INTEGER DEFAULT 1;
  v_result JSON;
BEGIN
  -- Get voucher details
  SELECT * INTO v_voucher FROM vouchers WHERE code = p_voucher_code AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bon nie został znaleziony lub nie jest aktywny');
  END IF;
  
  -- Check if voucher has remaining value/sessions
  IF v_voucher.voucher_type = 'single' AND (v_voucher.remaining_value IS NULL OR v_voucher.remaining_value <= 0) THEN
    RETURN json_build_object('success', false, 'error', 'Bon nie ma pozostałej wartości');
  END IF;
  
  IF v_voucher.voucher_type = 'package' AND v_voucher.remaining_sessions <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Bon nie ma pozostałych sesji');
  END IF;
  
  -- Get service price if not provided
  IF p_service_price IS NULL THEN
    SELECT price INTO v_service FROM services s 
    INNER JOIN appointments a ON a.service_id = s.id 
    WHERE a.id = p_appointment_id;
    
    IF FOUND THEN
      p_service_price := v_service.price;
    ELSE
      p_service_price := 0;
    END IF;
  END IF;
  
  -- Calculate redemption amount
  IF v_voucher.voucher_type = 'single' THEN
    -- For value vouchers, use the minimum of remaining value or service price
    v_redeemed_value := LEAST(v_voucher.remaining_value, p_service_price);
    v_redeemed_sessions := NULL;
  ELSE
    -- For package vouchers, use full service price
    v_redeemed_value := p_service_price;
    v_redeemed_sessions := 1;
  END IF;
  
  -- Insert redemption record
  INSERT INTO voucher_redemptions (
    voucher_id,
    appointment_id,
    redeemed_value,
    redeemed_sessions,
    notes
  ) VALUES (
    v_voucher.id,
    p_appointment_id,
    v_redeemed_value,
    v_redeemed_sessions,
    'Realizacja za wizytę'
  );
  
  -- Update voucher remaining amount
  IF v_voucher.voucher_type = 'single' THEN
    UPDATE vouchers 
    SET remaining_value = remaining_value - v_redeemed_value,
        status = CASE WHEN remaining_value - v_redeemed_value <= 0 THEN 'redeemed' ELSE 'active' END
    WHERE id = v_voucher.id;
  ELSE
    UPDATE vouchers 
    SET remaining_sessions = remaining_sessions - 1,
        status = CASE WHEN remaining_sessions - 1 <= 0 THEN 'redeemed' ELSE 'active' END
    WHERE id = v_voucher.id;
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'redeemed_value', v_redeemed_value,
    'redeemed_sessions', v_redeemed_sessions,
    'remaining_value', CASE WHEN v_voucher.voucher_type = 'single' THEN v_voucher.remaining_value - v_redeemed_value ELSE NULL END,
    'remaining_sessions', CASE WHEN v_voucher.voucher_type = 'package' THEN v_voucher.remaining_sessions - 1 ELSE NULL END
  );
END;
$function$