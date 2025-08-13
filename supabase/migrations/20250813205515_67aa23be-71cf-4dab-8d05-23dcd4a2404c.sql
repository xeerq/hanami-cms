-- Fix audit function search path (ignore errors if view doesn't exist)
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