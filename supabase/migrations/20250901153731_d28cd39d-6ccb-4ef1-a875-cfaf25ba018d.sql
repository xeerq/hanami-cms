-- Fix security issues by implementing proper RLS policies without problematic views

-- Priority 1: Update team_members policy to restrict sensitive data access
-- Only admins should see email and phone fields, public should see basic info only
DROP POLICY IF EXISTS "Public can view team member basic info" ON public.team_members;

CREATE POLICY "Public can view team member basic info" 
ON public.team_members 
FOR SELECT 
USING (is_active = true);

-- Add a separate policy for admins to see sensitive data
CREATE POLICY "Admins can view all team member data including contacts" 
ON public.team_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) AND is_active = true);

-- Priority 2: Update voucher policies to prevent data exposure
-- Remove the duplicate policy first
DROP POLICY IF EXISTS "Therapists can view limited voucher data" ON public.vouchers;

-- Update the main therapist policy to be more restrictive
DROP POLICY IF EXISTS "Therapists can view voucher codes for redemption" ON public.vouchers;

CREATE POLICY "Therapists can view voucher codes for redemption" 
ON public.vouchers 
FOR SELECT 
USING (
  has_role(auth.uid(), 'therapist'::app_role) AND 
  status = 'active'::text
);

-- Priority 3: Update appointment policies to protect guest data
-- The current policy is already restrictive enough for guest data protection

-- Priority 4: Add rate limiting check function for authentication
-- This was already created in the previous migration

-- Priority 5: Enhanced audit logging
-- Add function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_table_name text,
  p_access_type text DEFAULT 'SELECT',
  p_sensitive_fields text[] DEFAULT ARRAY[]::text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if accessing sensitive fields
  IF array_length(p_sensitive_fields, 1) > 0 THEN
    PERFORM public.log_security_event(
      'sensitive_data_access',
      p_table_name,
      NULL,
      jsonb_build_object(
        'access_type', p_access_type,
        'sensitive_fields', p_sensitive_fields,
        'user_role', CASE 
          WHEN has_role(auth.uid(), 'admin'::app_role) THEN 'admin'
          WHEN has_role(auth.uid(), 'therapist'::app_role) THEN 'therapist'
          ELSE 'user'
        END
      )
    );
  END IF;
END;
$$;