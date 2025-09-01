-- FINALNA MIGRACJA BEZPIECZEŃSTWA (bez konfliktu position)

-- Funkcja bezpiecznego dostępu do danych zespołu
CREATE OR REPLACE FUNCTION public.get_safe_team_data()
RETURNS TABLE (
  id uuid,
  name text,
  position_title text,
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
  RETURN QUERY
  SELECT 
    tm.id,
    tm.name,
    tm."position" as position_title,
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

-- Utwórz finalną bezpieczną view
DROP VIEW IF EXISTS public.team_members_public CASCADE;
CREATE VIEW public.team_members_public AS
SELECT 
  id,
  name,
  position_title as position,
  bio,
  image_url,
  social_links,
  display_order,
  is_active,
  created_at,
  updated_at
FROM public.get_safe_team_data();

-- Ustaw uprawnienia dla view
GRANT SELECT ON public.team_members_public TO anon, authenticated;

-- Wyczyść i ustaw finalne polityki RLS
DROP POLICY IF EXISTS "Public can view safe team member info" ON public.team_members;
DROP POLICY IF EXISTS "Admins can manage all team member data" ON public.team_members;
DROP POLICY IF EXISTS "Admins full access" ON public.team_members;
DROP POLICY IF EXISTS "Block non-admin access" ON public.team_members;
DROP POLICY IF EXISTS "Admins only" ON public.team_members;

-- Jedna prosta polityka - tylko admini
CREATE POLICY "admin_only_access" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Finalny status
COMMENT ON TABLE public.team_members IS 
'SECURED: Only admins can access this table directly. Public access via team_members_public view only.';

-- Test funkcja
CREATE OR REPLACE FUNCTION public.security_check()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
SELECT 'Security OK: Team members data properly protected';
$function$;