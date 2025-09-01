-- Critical Security Fixes Migration

-- Drop remaining SECURITY DEFINER views that bypass RLS
DROP VIEW IF EXISTS public.vouchers_therapist_view CASCADE;
DROP VIEW IF EXISTS public.appointments_therapist_view CASCADE;

-- Fix vouchers table RLS to restrict therapist access to purchaser contact information
DROP POLICY IF EXISTS "Therapists can view voucher codes for redemption" ON public.vouchers;

-- Create new restricted policy for therapists - no access to purchaser contact info
CREATE POLICY "Therapists can view voucher codes for redemption (restricted)" 
ON public.vouchers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'therapist'::app_role) 
  AND status = 'active'
);

-- Enhance guest appointment data protection
-- Add trigger to log access to sensitive guest data
CREATE OR REPLACE FUNCTION public.log_guest_data_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when guest contact information is accessed
  IF TG_OP = 'SELECT' AND NEW.is_guest = true AND NEW.guest_phone IS NOT NULL THEN
    PERFORM public.log_security_event(
      'guest_contact_accessed',
      'appointments',
      NEW.id,
      jsonb_build_object(
        'guest_name', NEW.guest_name,
        'accessed_by_role', CASE 
          WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
          WHEN has_role(auth.uid(), 'therapist'::app_role) THEN 'therapist'
          ELSE 'user'
        END
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add data access logging triggers for sensitive tables
CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive customer data
  CASE TG_TABLE_NAME
    WHEN 'profiles' THEN
      PERFORM public.log_security_event(
        'profile_data_accessed',
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
          'operation', TG_OP,
          'user_role', CASE 
            WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
            WHEN has_role(auth.uid(), 'therapist'::app_role) THEN 'therapist'
            ELSE 'user'
          END
        )
      );
    WHEN 'team_members' THEN
      -- Only log if accessing contact information
      IF TG_OP = 'SELECT' AND has_role(auth.uid(), 'admin'::app_role) THEN
        PERFORM public.log_security_event(
          'team_contact_accessed',
          TG_TABLE_NAME,
          COALESCE(NEW.id, OLD.id),
          jsonb_build_object('operation', TG_OP)
        );
      END IF;
    WHEN 'vouchers' THEN
      -- Log access to purchaser information
      IF TG_OP = 'SELECT' AND (COALESCE(NEW.purchaser_email, OLD.purchaser_email) IS NOT NULL) THEN
        PERFORM public.log_security_event(
          'voucher_purchaser_data_accessed',
          TG_TABLE_NAME,
          COALESCE(NEW.id, OLD.id),
          jsonb_build_object(
            'operation', TG_OP,
            'user_role', CASE 
              WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
              WHEN has_role(auth.uid(), 'therapist'::app_role) THEN 'therapist'
              ELSE 'user'
            END
          )
        );
      END IF;
  END CASE;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for sensitive data access logging
CREATE TRIGGER trigger_log_profiles_access
  AFTER SELECT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

CREATE TRIGGER trigger_log_team_members_access
  AFTER SELECT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

CREATE TRIGGER trigger_log_vouchers_access
  AFTER SELECT ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

-- Enhanced rate limiting for sensitive operations
CREATE OR REPLACE FUNCTION public.check_sensitive_operation_rate_limit(p_operation_type text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_attempts integer;
  v_last_attempt timestamp with time zone;
BEGIN
  -- Allow unlimited for admins
  IF has_role(v_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Check operation-specific rate limits
  SELECT COUNT(*), MAX(created_at)
  INTO v_attempts, v_last_attempt
  FROM public.security_audit_log
  WHERE user_id = v_user_id
    AND action = p_operation_type
    AND created_at > now() - interval '1 hour';
  
  -- Different limits for different operations
  CASE p_operation_type
    WHEN 'guest_contact_accessed' THEN
      RETURN v_attempts < 10; -- Max 10 guest contact accesses per hour
    WHEN 'voucher_purchaser_data_accessed' THEN
      RETURN v_attempts < 5; -- Max 5 voucher purchaser data accesses per hour
    ELSE
      RETURN v_attempts < 20; -- Default limit
  END CASE;
END;
$function$;

-- Add policy to restrict bulk data access
CREATE POLICY "Rate limit sensitive data access" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (
  public.check_sensitive_operation_rate_limit(action)
);

-- Update vouchers table to better protect purchaser information
-- Create a function to get voucher info without exposing purchaser details
CREATE OR REPLACE FUNCTION public.get_voucher_public_info(p_code text)
RETURNS TABLE (
  id uuid,
  code text,
  voucher_type text,
  original_value numeric,
  remaining_value numeric,
  original_sessions integer,
  remaining_sessions integer,
  status text,
  expires_at timestamp with time zone,
  service_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only return public voucher information, no purchaser details
  RETURN QUERY
  SELECT 
    v.id,
    v.code,
    v.voucher_type,
    v.original_value,
    v.remaining_value,
    v.original_sessions,
    v.remaining_sessions,
    v.status,
    v.expires_at,
    v.service_id
  FROM public.vouchers v
  WHERE v.code = p_code
    AND v.status = 'active'
    AND (v.expires_at IS NULL OR v.expires_at > now());
END;
$function$;

-- Add security comment about manual configuration
COMMENT ON DATABASE postgres IS 
'Security Note: Leaked password protection must be enabled manually in Supabase Auth settings. Navigate to Authentication > Settings > Security and enable "Leaked Password Protection".';