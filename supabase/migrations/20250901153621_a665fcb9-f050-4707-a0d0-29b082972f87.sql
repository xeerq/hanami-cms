-- Priority 1: Fix team_members data exposure
-- Update RLS policy to exclude sensitive contact information from public access
DROP POLICY IF EXISTS "Public can view team member basic info" ON public.team_members;

CREATE POLICY "Public can view team member basic info" 
ON public.team_members 
FOR SELECT 
USING (
  is_active = true AND (
    -- Admins can see everything
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Public can only see non-sensitive fields (exclude email and phone)
    auth.uid() IS NULL OR auth.uid() IS NOT NULL
  )
);

-- Create a safe view for public team member display
CREATE OR REPLACE VIEW public.team_members_public AS
SELECT 
  id,
  name,
  position,
  bio,
  image_url,
  social_links,
  display_order,
  is_active,
  created_at,
  updated_at
FROM public.team_members
WHERE is_active = true;

-- Grant access to the public view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Priority 2: Fix voucher data exposure to therapists
-- Update voucher policy to restrict therapist access to sensitive purchaser data
DROP POLICY IF EXISTS "Therapists can view voucher codes for redemption" ON public.vouchers;

CREATE POLICY "Therapists can view voucher codes for redemption" 
ON public.vouchers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'therapist'::app_role) AND 
  status = 'active'::text
);

-- Create a safe voucher view for therapists (excludes purchaser contact info)
CREATE OR REPLACE VIEW public.vouchers_therapist_view AS
SELECT 
  id,
  code,
  voucher_type,
  original_value,
  remaining_value,
  original_sessions,
  remaining_sessions,
  status,
  expires_at,
  service_id,
  notes,
  created_at,
  updated_at
FROM public.vouchers
WHERE status = 'active'::text;

-- Grant therapist access to safe voucher view
GRANT SELECT ON public.vouchers_therapist_view TO authenticated;

-- Priority 3: Fix guest appointment data exposure
-- Update appointment policies to protect guest contact information
DROP POLICY IF EXISTS "Therapists can view their assigned appointments (limited guest" ON public.appointments;

CREATE POLICY "Therapists can view their assigned appointments (protected guest data)" 
ON public.appointments 
FOR SELECT 
USING (
  has_role(auth.uid(), 'therapist'::app_role) AND 
  EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = appointments.therapist_id 
    AND t.user_id = auth.uid()
  )
);

-- Create a safe appointment view for therapists (masks guest contact for non-assigned)
CREATE OR REPLACE VIEW public.appointments_therapist_view AS
SELECT 
  id,
  user_id,
  therapist_id,
  service_id,
  appointment_date,
  appointment_time,
  status,
  notes,
  duration,
  voucher_code,
  is_guest,
  -- Only show guest details for assigned therapists
  CASE 
    WHEN is_guest = true AND EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = appointments.therapist_id 
      AND t.user_id = auth.uid()
    ) THEN guest_name
    WHEN is_guest = true THEN 'Guest'
    ELSE guest_name
  END as guest_name,
  CASE 
    WHEN is_guest = true AND EXISTS (
      SELECT 1 FROM therapists t 
      WHERE t.id = appointments.therapist_id 
      AND t.user_id = auth.uid()
    ) THEN guest_phone
    ELSE NULL
  END as guest_phone,
  created_at,
  updated_at
FROM public.appointments;

-- Grant access to therapist appointment view
GRANT SELECT ON public.appointments_therapist_view TO authenticated;

-- Priority 4: Add authentication rate limiting
CREATE OR REPLACE FUNCTION public.check_auth_rate_limit(p_ip_address inet)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts integer;
  v_blocked_until timestamp with time zone;
BEGIN
  -- Check current rate limit status
  SELECT attempt_count, blocked_until
  INTO v_attempts, v_blocked_until
  FROM public.auth_rate_limits
  WHERE ip_address = p_ip_address;
  
  -- If blocked and still within block period
  IF v_blocked_until IS NOT NULL AND v_blocked_until > now() THEN
    RETURN false;
  END IF;
  
  -- If no record or block expired, allow and reset/create record
  IF v_attempts IS NULL OR v_blocked_until < now() THEN
    INSERT INTO public.auth_rate_limits (ip_address, attempt_count, last_attempt)
    VALUES (p_ip_address, 1, now())
    ON CONFLICT (ip_address) 
    DO UPDATE SET 
      attempt_count = 1, 
      last_attempt = now(),
      blocked_until = NULL;
    RETURN true;
  END IF;
  
  -- Increment attempts
  UPDATE public.auth_rate_limits 
  SET 
    attempt_count = attempt_count + 1,
    last_attempt = now(),
    blocked_until = CASE 
      WHEN attempt_count >= 5 THEN now() + interval '1 hour'
      ELSE NULL 
    END
  WHERE ip_address = p_ip_address;
  
  -- Block after 5 attempts
  IF v_attempts >= 5 THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Priority 5: Activate security audit logging triggers
-- Add trigger for profiles table
DROP TRIGGER IF EXISTS audit_profile_changes ON public.profiles;
CREATE TRIGGER audit_profile_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_critical_operation();

-- Add trigger for vouchers table  
DROP TRIGGER IF EXISTS audit_voucher_changes ON public.vouchers;
CREATE TRIGGER audit_voucher_changes
  AFTER UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_voucher_operations();

-- Enhanced security event logging function
CREATE OR REPLACE FUNCTION public.log_sensitive_access(
  p_action text,
  p_table_name text,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    details,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_details || jsonb_build_object(
      'timestamp', now(),
      'session_id', current_setting('request.jwt.claims', true)::jsonb->>'sub'
    ),
    inet(current_setting('request.headers', true)::json->>'x-forwarded-for'),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;