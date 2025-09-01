-- Critical Security Fixes Migration (Fixed)

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

-- Add data access logging function for sensitive tables
CREATE OR REPLACE FUNCTION public.log_sensitive_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive customer data based on table and operation
  IF TG_TABLE_NAME = 'profiles' AND TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.log_security_event(
      'profile_data_modified',
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
  
  IF TG_TABLE_NAME = 'team_members' AND TG_OP IN ('UPDATE', 'DELETE') AND has_role(auth.uid(), 'admin'::app_role) THEN
    PERFORM public.log_security_event(
      'team_member_modified',
      TG_TABLE_NAME,
      COALESCE(NEW.id, OLD.id),
      jsonb_build_object('operation', TG_OP)
    );
  END IF;
  
  IF TG_TABLE_NAME = 'vouchers' AND TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.log_security_event(
      'voucher_modified',
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
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add triggers for sensitive data modification logging
DROP TRIGGER IF EXISTS trigger_log_profiles_access ON public.profiles;
CREATE TRIGGER trigger_log_profiles_access
  AFTER UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

DROP TRIGGER IF EXISTS trigger_log_team_members_access ON public.team_members;
CREATE TRIGGER trigger_log_team_members_access
  AFTER UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.log_sensitive_table_access();

DROP TRIGGER IF EXISTS trigger_log_vouchers_access ON public.vouchers;
CREATE TRIGGER trigger_log_vouchers_access
  AFTER UPDATE OR DELETE ON public.vouchers
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
BEGIN
  -- Allow unlimited for admins
  IF has_role(v_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Check operation-specific rate limits
  SELECT COUNT(*)
  INTO v_attempts
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

-- Add security logging for role changes
CREATE OR REPLACE FUNCTION public.enhanced_role_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Enhanced logging for role changes with additional security context
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'role_granted_enhanced',
      'user_roles',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id, 
        'role', NEW.role,
        'granted_by', auth.uid(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_revoked_enhanced',
      'user_roles',
      OLD.id,
      jsonb_build_object(
        'user_id', OLD.user_id, 
        'role', OLD.role,
        'revoked_by', auth.uid(),
        'ip_address', current_setting('request.headers', true)::json->>'x-forwarded-for'
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Replace existing role audit trigger with enhanced version
DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER enhanced_role_audit_trigger
  AFTER INSERT OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.enhanced_role_audit();