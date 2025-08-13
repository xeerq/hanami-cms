-- Critical Security Fixes

-- 1. CRITICAL: Fix role escalation vulnerability in user_roles table
-- Drop existing policies and create secure ones
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Prevent users from escalating their own privileges
CREATE POLICY "Only existing admins can manage user roles" 
ON public.user_roles 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Users can view their own roles, admins can view all
CREATE POLICY "Users can view roles securely" 
ON public.user_roles 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- 2. Fix team_members data exposure - secure contact information
-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Only admins can view full team member data" ON public.team_members;

-- Create granular policies for team_members
-- Public can view safe display info only
CREATE POLICY "Public can view team member display info" 
ON public.team_members 
FOR SELECT 
USING (is_active = true);

-- However, we need to create a view for public access that excludes contact info
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
ORDER BY display_order;

-- Grant public access to the safe view
GRANT SELECT ON public.team_members_display TO anon;
GRANT SELECT ON public.team_members_display TO authenticated;

-- Restrict full team_members table to admins only
DROP POLICY IF EXISTS "Public can view team member display info" ON public.team_members;

CREATE POLICY "Only admins can access full team member data" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add audit logging for role changes
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  changed_user_id uuid NOT NULL,
  old_role text,
  new_role text,
  changed_by uuid REFERENCES auth.users(id),
  change_type text NOT NULL, -- 'INSERT', 'DELETE', 'UPDATE'
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Only admins can view role audit logs" 
ON public.role_change_audit 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger function for role change auditing
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_change_audit (changed_user_id, new_role, changed_by, change_type)
    VALUES (NEW.user_id, NEW.role::text, auth.uid(), 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_change_audit (changed_user_id, old_role, changed_by, change_type)
    VALUES (OLD.user_id, OLD.role::text, auth.uid(), 'DELETE');
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_change_audit (changed_user_id, old_role, new_role, changed_by, change_type)
    VALUES (NEW.user_id, OLD.role::text, NEW.role::text, auth.uid(), 'UPDATE');
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for role change auditing
DROP TRIGGER IF EXISTS role_change_audit_trigger ON public.user_roles;
CREATE TRIGGER role_change_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.audit_role_changes();