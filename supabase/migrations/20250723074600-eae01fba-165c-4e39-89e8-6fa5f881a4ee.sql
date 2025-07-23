-- Funkcja do automatycznego zarządzania terapeutami na podstawie ról
CREATE OR REPLACE FUNCTION public.handle_therapist_role_changes()
RETURNS TRIGGER AS $$
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
            SELECT first_name, last_name 
            INTO user_profile
            FROM public.profiles 
            WHERE user_id = NEW.user_id;
            
            -- Dodaj użytkownika do tabeli therapists
            INSERT INTO public.therapists (
                user_id,
                name,
                specialization,
                experience,
                is_active
            ) VALUES (
                NEW.user_id,
                COALESCE(user_profile.first_name || ' ' || user_profile.last_name, 'Nowy Terapeuta'),
                'Do określenia',
                'Do określenia',
                true
            );
        END IF;
    END IF;
    
    -- Jeśli usunięto rolę 'therapist'
    IF TG_OP = 'DELETE' AND OLD.role = 'therapist' THEN
        -- Usuń użytkownika z tabeli therapists
        DELETE FROM public.therapists 
        WHERE user_id = OLD.user_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Utwórz trigger na tabeli user_roles
CREATE TRIGGER therapist_role_management_trigger
    AFTER INSERT OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_therapist_role_changes();

-- Dodaj kolumnę user_id do tabeli therapists jeśli nie istnieje
ALTER TABLE public.therapists 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Utwórz unikatowy indeks dla user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_therapists_user_id 
ON public.therapists(user_id) 
WHERE user_id IS NOT NULL;