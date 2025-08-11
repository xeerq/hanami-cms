-- Recreate the view explicitly as SECURITY INVOKER to ensure no security definer properties
DROP VIEW IF EXISTS public.team_members_public;

CREATE VIEW public.team_members_public
SECURITY INVOKER
AS
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
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON public.team_members_public TO anon;
GRANT SELECT ON public.team_members_public TO authenticated;