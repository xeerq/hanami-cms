-- Update process_voucher_redemption to assign voucher to user when redeemed
CREATE OR REPLACE FUNCTION public.process_voucher_redemption(p_voucher_code text, p_appointment_id uuid, p_service_price numeric DEFAULT NULL::numeric)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_voucher RECORD;
  v_service RECORD;
  v_appointment RECORD;
  v_redeemed_value NUMERIC;
  v_redeemed_sessions INTEGER DEFAULT 1;
  v_result JSON;
BEGIN
  -- Get voucher details
  SELECT * INTO v_voucher FROM vouchers WHERE code = p_voucher_code AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Bon nie został znaleziony lub nie jest aktywny');
  END IF;
  
  -- Get appointment details to know which user is redeeming
  SELECT * INTO v_appointment FROM appointments WHERE id = p_appointment_id;
  
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
    redeemed_by,
    notes
  ) VALUES (
    v_voucher.id,
    p_appointment_id,
    v_redeemed_value,
    v_redeemed_sessions,
    v_appointment.user_id,
    'Realizacja za wizytę'
  );
  
  -- Update voucher remaining amount and assign to user if not already assigned
  IF v_voucher.voucher_type = 'single' THEN
    UPDATE vouchers 
    SET remaining_value = remaining_value - v_redeemed_value,
        status = CASE WHEN remaining_value - v_redeemed_value <= 0 THEN 'redeemed' ELSE 'active' END,
        user_id = CASE WHEN user_id IS NULL AND v_appointment.user_id IS NOT NULL THEN v_appointment.user_id ELSE user_id END
    WHERE id = v_voucher.id;
  ELSE
    UPDATE vouchers 
    SET remaining_sessions = remaining_sessions - 1,
        status = CASE WHEN remaining_sessions - 1 <= 0 THEN 'redeemed' ELSE 'active' END,
        user_id = CASE WHEN user_id IS NULL AND v_appointment.user_id IS NOT NULL THEN v_appointment.user_id ELSE user_id END
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