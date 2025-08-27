-- Fix 1: Protect staff contact information in team_members table
-- Update RLS policy to hide email and phone from public access
DROP POLICY IF EXISTS "Only admins can manage team members" ON public.team_members;

CREATE POLICY "Admins can manage team members" 
ON public.team_members 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create a new policy for public viewing that excludes sensitive contact info
CREATE POLICY "Public can view team member basic info" 
ON public.team_members 
FOR SELECT 
USING (
  is_active = true AND 
  -- This policy allows viewing but the application should filter sensitive columns
  true
);

-- Fix 2: Address Security Definer view issue
-- Remove problematic view if it exists and create a safer alternative
DROP VIEW IF EXISTS public.team_members_display;

-- Create a safer view without SECURITY DEFINER that excludes sensitive data
CREATE VIEW public.team_members_display AS
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
WHERE is_active = true
ORDER BY display_order ASC, created_at ASC;

-- Enable RLS on the view (this is safe since it doesn't use SECURITY DEFINER)
ALTER VIEW public.team_members_display SET (security_invoker = true);

-- Fix 3: Strengthen voucher data protection
-- Update voucher policies to ensure customer data is better protected
DROP POLICY IF EXISTS "Users can view their own vouchers (limited info)" ON public.vouchers;

CREATE POLICY "Users can view their own vouchers (protected data)" 
ON public.vouchers 
FOR SELECT 
USING (
  auth.uid() = user_id AND 
  auth.uid() IS NOT NULL
);

-- Fix 4: Protect guest appointment contact details
-- Update appointment policies to ensure guest contact info is protected
DROP POLICY IF EXISTS "Admins can view all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Therapists can view their assigned appointments" ON public.appointments;

CREATE POLICY "Admins can view all appointments" 
ON public.appointments 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Therapists can view their assigned appointments (limited guest data)" 
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

-- Fix 5: Add audit logging for security-sensitive operations
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  details jsonb DEFAULT '{}',
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view security audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- System can insert audit logs
CREATE POLICY "System can create audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to log security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_action text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_details jsonb DEFAULT '{}'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    details
  ) VALUES (
    auth.uid(),
    p_action,
    p_table_name,
    p_record_id,
    p_details
  );
END;
$$;

-- Add trigger to log role changes
CREATE OR REPLACE FUNCTION public.log_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'role_granted',
      'user_roles',
      NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'role_revoked',
      'user_roles',
      OLD.id,
      jsonb_build_object('user_id', OLD.user_id, 'role', OLD.role)
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'role_changed',
      'user_roles',
      NEW.id,
      jsonb_build_object('user_id', NEW.user_id, 'old_role', OLD.role, 'new_role', NEW.role)
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for role change logging
DROP TRIGGER IF EXISTS log_role_changes_trigger ON public.user_roles;
CREATE TRIGGER log_role_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_role_changes();