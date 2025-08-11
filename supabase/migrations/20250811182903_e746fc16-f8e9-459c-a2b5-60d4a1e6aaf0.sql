-- Drop the current public access policy for team_members
DROP POLICY IF EXISTS "Anyone can view active team members" ON public.team_members;

-- Create a restricted policy that only allows admins to see full team member data
CREATE POLICY "Only admins can view full team member data" 
ON public.team_members 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create a public view for team members that excludes sensitive contact information
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
WHERE is_active = true;

-- Grant public access to the view
GRANT SELECT ON public.team_members_public TO anon;
GRANT SELECT ON public.team_members_public TO authenticated;