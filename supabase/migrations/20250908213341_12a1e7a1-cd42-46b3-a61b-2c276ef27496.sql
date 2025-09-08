-- Dodaj trigger do automatycznej synchronizacji nazw terapeutów
CREATE OR REPLACE FUNCTION public.sync_therapist_name_on_profile_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Jeśli zmieniono imię lub nazwisko, aktualizuj nazwę w tabeli therapists
    IF OLD.first_name IS DISTINCT FROM NEW.first_name OR OLD.last_name IS DISTINCT FROM NEW.last_name THEN
        UPDATE public.therapists 
        SET name = NEW.first_name || ' ' || NEW.last_name
        WHERE user_id = NEW.user_id 
        AND NEW.first_name IS NOT NULL 
        AND NEW.last_name IS NOT NULL;
        
        -- Log the synchronization
        PERFORM public.log_security_event(
            'therapist_name_auto_synchronized',
            'therapists',
            NULL,
            jsonb_build_object(
                'user_id', NEW.user_id,
                'old_name', COALESCE(OLD.first_name || ' ' || OLD.last_name, 'unknown'),
                'new_name', NEW.first_name || ' ' || NEW.last_name
            )
        );
    END IF;
    
    RETURN NEW;
END;
$function$;

-- Utwórz trigger
DROP TRIGGER IF EXISTS sync_therapist_name_trigger ON public.profiles;
CREATE TRIGGER sync_therapist_name_trigger
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_therapist_name_on_profile_update();