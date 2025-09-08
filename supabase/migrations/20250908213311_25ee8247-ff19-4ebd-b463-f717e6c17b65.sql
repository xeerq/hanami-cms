-- Dodaj funkcję do synchronizacji nazw terapeutów z profili
CREATE OR REPLACE FUNCTION public.sync_therapist_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
    -- Aktualizuj nazwy terapeutów na podstawie danych z profili
    UPDATE public.therapists 
    SET name = COALESCE(p.first_name || ' ' || p.last_name, therapists.name)
    FROM public.profiles p 
    WHERE therapists.user_id = p.user_id 
    AND therapists.user_id IS NOT NULL
    AND p.first_name IS NOT NULL 
    AND p.last_name IS NOT NULL;
    
    -- Log synchronization
    PERFORM public.log_security_event(
        'therapists_names_synchronized',
        'therapists',
        NULL,
        jsonb_build_object('synchronized_at', now())
    );
END;
$function$;

-- Uruchom synchronizację
SELECT public.sync_therapist_names();