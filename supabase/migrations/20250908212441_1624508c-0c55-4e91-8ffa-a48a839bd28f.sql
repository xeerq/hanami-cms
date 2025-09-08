-- Napraw funkcję log_critical_operation - usuń problematyczny operator jsonb
CREATE OR REPLACE FUNCTION public.log_critical_operation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Log critical operations like profile updates, role changes, etc.
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'profile_updated',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'old_data', to_jsonb(OLD),
        'new_data', to_jsonb(NEW)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;