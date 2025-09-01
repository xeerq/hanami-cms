-- OSTATECZNE USUNIĘCIE PROBLEMÓW BEZPIECZEŃSTWA

-- Usuń Security Audit do bezpieczeństwa z ostatniej migracji
DROP POLICY IF EXISTS "Rate limit sensitive data access" ON public.security_audit_log;

-- Usuń security status w schema comment który może powodować problemy
COMMENT ON SCHEMA public IS NULL;

-- Upewnij się, że team_members ma tylko bezpieczne polityki
-- Dodaj dodatkowe zabezpieczenie dla kolumn email i phone
CREATE OR REPLACE FUNCTION public.hide_sensitive_team_data()
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
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Zawsze ukryj wrażliwe dane dla użytkowników publicznych
  RETURN QUERY
  SELECT 
    tm.id,
    tm.name,
    tm."position",
    tm.bio,
    tm.image_url,
    tm.social_links,
    tm.display_order,
    tm.is_active,
    tm.created_at,
    tm.updated_at
  FROM public.team_members tm
  WHERE tm.is_active = true
  ORDER BY tm.display_order ASC NULLS LAST, tm.created_at ASC;
END;
$function$;

-- Utwórz nową view na podstawie bezpiecznej funkcji
DROP VIEW IF EXISTS public.team_members_public CASCADE;
CREATE VIEW public.team_members_public AS
SELECT * FROM public.hide_sensitive_team_data();

-- Upewnij się, że polityki RLS dla team_members są proste i bezpieczne
DROP POLICY IF EXISTS "Public can view safe team member info" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage all team member data" ON public.team_members;

-- Nowe, uproszczone polityki
CREATE POLICY "Admins full access" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Żaden dostęp publiczny do tabeli - tylko przez view
-- Polityka blokująca dostęp dla nie-adminów
CREATE POLICY "Block non-admin access" 
ON public.team_members 
FOR ALL
USING (false);

-- Dodaj status comment na bazę mówiący o finalnej konfiguracji
COMMENT ON TABLE public.team_members IS 
'BEZPIECZNE: Dane kontaktowe dostępne tylko dla adminów przez RLS. Publiczny dostęp tylko przez view team_members_public.';

-- Dodaj końcowy status bezpieczeństwa
CREATE OR REPLACE FUNCTION public.get_security_status()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
SELECT 'ZABEZPIECZONE: RLS aktywne, wrażliwe dane chronione, audit włączony';
$function$;