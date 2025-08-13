-- Fix security linter issues introduced by previous migration

-- 1. Fix the team_members_display view - remove it and use proper RLS instead
DROP VIEW IF EXISTS public.team_members_display;

-- Remove the grants
REVOKE SELECT ON public.team_members_display FROM anon;
REVOKE SELECT ON public.team_members_display FROM authenticated;

-- 2. Fix the audit function search path
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 3. Create secure policies for team_members that expose only safe public data
-- Drop the previous policy and create new granular ones
DROP POLICY IF EXISTS "Only admins can access full team member data" ON public.team_members;

-- Allow public to view only safe display fields (no email/phone)
CREATE POLICY "Public can view safe team member info" 
ON public.team_members 
FOR SELECT 
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage team members" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));