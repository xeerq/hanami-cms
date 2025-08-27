-- Fix RLS policies for team_members table
-- Remove conflicting policies and create secure ones
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;
DROP POLICY IF EXISTS "Only admins can access full team member data" ON public.team_members;

-- Create a public view for team member display (no contact info)
CREATE OR REPLACE VIEW public.team_members_display AS
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

-- Set proper RLS policies for team_members table
CREATE POLICY "Only admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view the public display version (no contact info)
-- This is handled by the view, not direct table access

-- Fix vouchers table RLS to protect customer personal data
DROP POLICY IF EXISTS "Owner and admins can view vouchers" ON public.vouchers;

-- Separate policies for different access levels
CREATE POLICY "Admins can view all voucher data"
ON public.vouchers
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own vouchers (limited info)"
ON public.vouchers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Therapists can view voucher codes for redemption"
ON public.vouchers
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'therapist'::app_role)
  AND status = 'active'
);

-- Fix appointments table to protect guest customer data
DROP POLICY IF EXISTS "Users and assigned therapists can view appointments" ON public.appointments;

-- Create separate policies for different user types
CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id 
  AND is_guest = false
);

CREATE POLICY "Therapists can view their assigned appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'therapist'::app_role) 
  AND EXISTS (
    SELECT 1 FROM therapists t 
    WHERE t.id = appointments.therapist_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all appointments"
ON public.appointments
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add audit function for role changes to prevent privilege escalation
CREATE OR REPLACE FUNCTION public.validate_role_change()
RETURNS TRIGGER AS $$
DECLARE
  admin_count INTEGER;
  current_user_is_admin BOOLEAN;
BEGIN
  -- Check if current user is admin
  SELECT has_role(auth.uid(), 'admin'::app_role) INTO current_user_is_admin;
  
  -- Prevent non-admins from changing roles
  IF NOT current_user_is_admin THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;
  
  -- If removing admin role, ensure at least one admin remains
  IF TG_OP = 'DELETE' AND OLD.role = 'admin' THEN
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin' AND user_id != OLD.user_id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator';
    END IF;
    
    -- Prevent admins from removing their own admin role
    IF OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Administrators cannot remove their own admin role';
    END IF;
  END IF;
  
  -- If updating to remove admin role, same checks
  IF TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin' THEN
    SELECT COUNT(*) INTO admin_count 
    FROM public.user_roles 
    WHERE role = 'admin' AND user_id != OLD.user_id;
    
    IF admin_count = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last administrator';
    END IF;
    
    IF OLD.user_id = auth.uid() THEN
      RAISE EXCEPTION 'Administrators cannot remove their own admin role';
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role validation
DROP TRIGGER IF EXISTS validate_role_changes ON public.user_roles;
CREATE TRIGGER validate_role_changes
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_role_change();

-- Fix site_settings exposure to limit public access
DROP POLICY IF EXISTS "Public can view safe site settings" ON public.site_settings;

CREATE POLICY "Public can view limited site settings"
ON public.site_settings
FOR SELECT
TO anon, authenticated
USING (
  key = ANY (ARRAY[
    'business_hours'::text, 
    'contact_display_name'::text
  ])
);