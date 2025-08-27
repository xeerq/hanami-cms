-- Fix function search path issue by updating existing functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;