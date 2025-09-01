-- OSTATECZNA NAPRAW BEZPIECZEŃSTWA - Kompletny refactoring

-- 1. Napraw RLS dla team_members - usuń dostęp do wrażliwych danych
DROP POLICY IF EXISTS "Public can view team member basic info" ON public.team_members;
DROP POLICY IF EXISTS "Admins can view all team member data" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON public.team_members;

-- Nowe, bezpieczne polityki RLS dla team_members
CREATE POLICY "Public can view safe team member info" 
ON public.team_members 
FOR SELECT 
USING (
  is_active = true AND (
    -- Tylko publiczne dane - bez email i phone
    NOT EXISTS (SELECT 1 WHERE current_setting('request.columns', true) LIKE '%email%' OR current_setting('request.columns', true) LIKE '%phone%')
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Admins can manage all team member data" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Utwórz bezpieczną view dla publicznych danych team members
CREATE OR REPLACE VIEW public.team_members_public AS
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
ORDER BY display_order ASC, created_at ASC;

-- Ustaw odpowiednie uprawnienia dla view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- 3. Utwórz funkcję do bezpiecznego pobierania danych zespołu
CREATE OR REPLACE FUNCTION public.get_team_members_safe(include_contacts boolean DEFAULT false)
RETURNS TABLE (
  id uuid,
  name text,
  position text,
  bio text,
  image_url text,
  social_links jsonb,
  display_order integer,
  is_active boolean,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  email text,
  phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Sprawdź uprawnienia
  IF include_contacts AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Brak uprawnień do dostępu do danych kontaktowych';
  END IF;

  -- Zwróć dane z lub bez kontaktów w zależności od uprawnień
  RETURN QUERY
  SELECT 
    tm.id,
    tm.name,
    tm.position,
    tm.bio,
    tm.image_url,
    tm.social_links,
    tm.display_order,
    tm.is_active,
    tm.created_at,
    tm.updated_at,
    CASE 
      WHEN include_contacts AND has_role(auth.uid(), 'admin'::app_role) THEN tm.email
      ELSE NULL
    END as email,
    CASE 
      WHEN include_contacts AND has_role(auth.uid(), 'admin'::app_role) THEN tm.phone
      ELSE NULL
    END as phone
  FROM public.team_members tm
  WHERE tm.is_active = true OR has_role(auth.uid(), 'admin'::app_role)
  ORDER BY tm.display_order ASC NULLS LAST, tm.created_at ASC;
END;
$function$;

-- 4. Dodaj indeksy dla optymalizacji
CREATE INDEX IF NOT EXISTS idx_team_members_active_display 
ON public.team_members (is_active, display_order, created_at) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_team_members_admin_access 
ON public.team_members (id, email, phone) 
WHERE email IS NOT NULL OR phone IS NOT NULL;

-- 5. Utwórz trigger do walidacji danych team members
CREATE OR REPLACE FUNCTION public.validate_team_member_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Walidacja email
  IF NEW.email IS NOT NULL AND NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Nieprawidłowy format email: %', NEW.email;
  END IF;
  
  -- Walidacja telefonu (format polski)
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^\+?[0-9\s\-\(\)]{9,15}$' THEN
    RAISE EXCEPTION 'Nieprawidłowy format telefonu: %', NEW.phone;
  END IF;
  
  -- Automatyczne ustawienie display_order
  IF NEW.display_order IS NULL THEN
    SELECT COALESCE(MAX(display_order), 0) + 1 INTO NEW.display_order 
    FROM public.team_members;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS validate_team_member_trigger ON public.team_members;
CREATE TRIGGER validate_team_member_trigger
  BEFORE INSERT OR UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.validate_team_member_data();

-- 6. Dodaj audyt dla zmian w team_members
CREATE OR REPLACE FUNCTION public.audit_team_member_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_security_event(
      'team_member_created',
      'team_members',
      NEW.id,
      jsonb_build_object(
        'name', NEW.name,
        'position', NEW.position,
        'has_contact_info', (NEW.email IS NOT NULL OR NEW.phone IS NOT NULL)
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'team_member_updated',
      'team_members',
      NEW.id,
      jsonb_build_object(
        'name_changed', OLD.name != NEW.name,
        'position_changed', OLD.position != NEW.position,
        'contact_info_changed', (OLD.email != NEW.email OR OLD.phone != NEW.phone),
        'status_changed', OLD.is_active != NEW.is_active
      )
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_security_event(
      'team_member_deleted',
      'team_members',
      OLD.id,
      jsonb_build_object(
        'name', OLD.name,
        'had_contact_info', (OLD.email IS NOT NULL OR OLD.phone IS NOT NULL)
      )
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_team_member_changes_trigger ON public.team_members;
CREATE TRIGGER audit_team_member_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.audit_team_member_changes();

-- 7. Funkcja do masowego importu team members z walidacją
CREATE OR REPLACE FUNCTION public.bulk_import_team_members(members_data jsonb)
RETURNS TABLE (success boolean, imported_count integer, errors text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  member_record jsonb;
  import_count integer := 0;
  error_messages text[] := ARRAY[]::text[];
  current_display_order integer;
BEGIN
  -- Sprawdź uprawnienia administratora
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN QUERY SELECT false, 0, ARRAY['Brak uprawnień administratora']::text[];
    RETURN;
  END IF;

  -- Pobierz następny dostępny display_order
  SELECT COALESCE(MAX(display_order), 0) + 1 INTO current_display_order 
  FROM public.team_members;

  -- Przetwórz każdy element
  FOR member_record IN SELECT * FROM jsonb_array_elements(members_data)
  LOOP
    BEGIN
      INSERT INTO public.team_members (
        name, 
        position, 
        bio, 
        email, 
        phone, 
        image_url, 
        display_order,
        is_active
      ) VALUES (
        member_record->>'name',
        member_record->>'position',
        member_record->>'bio',
        NULLIF(member_record->>'email', ''),
        NULLIF(member_record->>'phone', ''),
        NULLIF(member_record->>'image_url', ''),
        current_display_order,
        COALESCE((member_record->>'is_active')::boolean, true)
      );
      
      import_count := import_count + 1;
      current_display_order := current_display_order + 1;
      
    EXCEPTION WHEN OTHERS THEN
      error_messages := array_append(error_messages, 
        format('Błąd dla %s: %s', member_record->>'name', SQLERRM));
    END;
  END LOOP;

  RETURN QUERY SELECT true, import_count, error_messages;
END;
$function$;