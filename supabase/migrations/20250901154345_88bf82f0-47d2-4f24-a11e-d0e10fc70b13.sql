-- Fix remaining security issues from linter

-- Fix search_path for existing functions that are missing it
ALTER FUNCTION public.enhanced_role_audit() SET search_path = 'public';
ALTER FUNCTION public.log_sensitive_table_access() SET search_path = 'public';

-- Check for and fix any remaining SECURITY DEFINER views
-- Note: The linter detected a SECURITY DEFINER view - let's ensure all are removed
DO $$
DECLARE
    view_record RECORD;
BEGIN
    -- Find any remaining SECURITY DEFINER views
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%SECURITY DEFINER%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        RAISE NOTICE 'Dropped SECURITY DEFINER view: %.%', view_record.schemaname, view_record.viewname;
    END LOOP;
END $$;

-- Add comment about manual leaked password protection configuration
COMMENT ON FUNCTION public.check_auth_rate_limit IS 
'Authentication rate limiting function. MANUAL ACTION REQUIRED: Enable leaked password protection in Supabase Auth settings > Password Security for complete protection against compromised passwords.';

-- Create secure replacement functions for any functionality that was in the dropped views
-- Secure voucher lookup for therapists (replaces vouchers_therapist_view)
CREATE OR REPLACE FUNCTION public.get_therapist_voucher_codes()
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
  service_id uuid,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only accessible by therapists and admins
  IF NOT (has_role(auth.uid(), 'therapist'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

  -- Return voucher codes without purchaser contact information
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
    v.service_id,
    v.notes
  FROM public.vouchers v
  WHERE v.status = 'active'
    AND (v.expires_at IS NULL OR v.expires_at > now())
  ORDER BY v.created_at DESC;
END;
$function$;

-- Secure appointment view for therapists (replaces appointments_therapist_view)
CREATE OR REPLACE FUNCTION public.get_therapist_appointments(p_therapist_id uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  therapist_id uuid,
  service_id uuid,
  appointment_date date,
  appointment_time time,
  duration integer,
  status text,
  notes text,
  is_guest boolean,
  guest_name text,
  guest_phone text,
  voucher_code text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_therapist_id uuid;
BEGIN
  -- Verify user is a therapist or admin
  IF NOT (has_role(auth.uid(), 'therapist'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RETURN;
  END IF;

  -- If user is therapist (not admin), only show their appointments
  IF has_role(auth.uid(), 'therapist'::app_role) AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    SELECT t.id INTO v_therapist_id
    FROM public.therapists t
    WHERE t.user_id = auth.uid();
    
    IF p_therapist_id IS NOT NULL AND p_therapist_id != v_therapist_id THEN
      RETURN; -- Therapist can only access their own appointments
    END IF;
    
    p_therapist_id := v_therapist_id;
  END IF;

  -- Return appointments (with guest contact info masked for non-admins)
  RETURN QUERY
  SELECT 
    a.id,
    a.user_id,
    a.therapist_id,
    a.service_id,
    a.appointment_date,
    a.appointment_time,
    a.duration,
    a.status,
    a.notes,
    a.is_guest,
    a.guest_name,
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN a.guest_phone
      ELSE CASE 
        WHEN a.guest_phone IS NOT NULL THEN '***-***-' || RIGHT(a.guest_phone, 3)
        ELSE NULL
      END
    END as guest_phone,
    a.voucher_code,
    a.created_at,
    a.updated_at
  FROM public.appointments a
  WHERE (p_therapist_id IS NULL OR a.therapist_id = p_therapist_id)
  ORDER BY a.appointment_date DESC, a.appointment_time DESC;
END;
$function$;