-- Aktualizacja triggera dla lepszego zarządzania terapeutami wywodzącymi się z użytkowników

-- Najpierw usuń stary trigger i funkcję
DROP TRIGGER IF EXISTS therapist_role_trigger ON public.user_roles;
DROP FUNCTION IF EXISTS public.handle_therapist_role_changes();

-- Nowa funkcja obsługująca zmiany ról terapeutów
CREATE OR REPLACE FUNCTION public.handle_therapist_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_profile RECORD;
BEGIN
    -- Jeśli dodano rolę 'therapist'
    IF TG_OP = 'INSERT' AND NEW.role = 'therapist' THEN
        -- Sprawdź czy użytkownik już istnieje w tabeli therapists
        IF NOT EXISTS (
            SELECT 1 FROM public.therapists 
            WHERE user_id = NEW.user_id
        ) THEN
            -- Pobierz dane użytkownika z profilu
            SELECT first_name, last_name, phone
            INTO user_profile
            FROM public.profiles 
            WHERE user_id = NEW.user_id;
            
            -- Stwórz nazwę na podstawie profilu lub domyślną
            DECLARE
                therapist_name TEXT;
            BEGIN
                IF user_profile.first_name IS NOT NULL AND user_profile.last_name IS NOT NULL THEN
                    therapist_name := user_profile.first_name || ' ' || user_profile.last_name;
                ELSE
                    therapist_name := 'Nowy Terapeuta';
                END IF;
                
                -- Dodaj użytkownika do tabeli therapists
                INSERT INTO public.therapists (
                    user_id,
                    name,
                    specialization,
                    experience,
                    is_active
                ) VALUES (
                    NEW.user_id,
                    therapist_name,
                    'Do określenia',
                    'Do określenia',
                    true
                );
            END;
        END IF;
    END IF;
    
    -- Jeśli usunięto rolę 'therapist'
    IF TG_OP = 'DELETE' AND OLD.role = 'therapist' THEN
        -- Usuń użytkownika z tabeli therapists tylko jeśli był powiązany z użytkownikiem
        DELETE FROM public.therapists 
        WHERE user_id = OLD.user_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- Utwórz nowy trigger
CREATE TRIGGER therapist_role_trigger
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW
    WHEN ((NEW.role = 'therapist') OR (OLD.role = 'therapist'))
    EXECUTE FUNCTION public.handle_therapist_role_changes();

-- Funkcja do synchronizacji nazw terapeutów z profilami użytkowników
CREATE OR REPLACE FUNCTION public.sync_therapist_names()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Aktualizuj nazwy terapeutów na podstawie profili użytkowników
    UPDATE public.therapists 
    SET name = p.first_name || ' ' || p.last_name,
        updated_at = now()
    FROM public.profiles p
    WHERE therapists.user_id = p.user_id
      AND p.first_name IS NOT NULL 
      AND p.last_name IS NOT NULL
      AND therapists.name != (p.first_name || ' ' || p.last_name);
END;
$$;

-- Trigger do automatycznej aktualizacji nazw terapeutów gdy zmieni się profil
CREATE OR REPLACE FUNCTION public.update_therapist_name_on_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    -- Jeśli zmieniono imię lub nazwisko, zaktualizuj nazwę terapeuty
    IF (OLD.first_name != NEW.first_name OR OLD.last_name != NEW.last_name) THEN
        IF NEW.first_name IS NOT NULL AND NEW.last_name IS NOT NULL THEN
            UPDATE public.therapists 
            SET name = NEW.first_name || ' ' || NEW.last_name,
                updated_at = now()
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Utwórz trigger na tabeli profiles
DROP TRIGGER IF EXISTS update_therapist_name_trigger ON public.profiles;
CREATE TRIGGER update_therapist_name_trigger
    AFTER UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_therapist_name_on_profile_change();

-- Wykonaj jednorazową synchronizację istniejących danych
SELECT public.sync_therapist_names();