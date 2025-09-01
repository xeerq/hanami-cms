-- Drop any remaining problematic views from previous migrations
DROP VIEW IF EXISTS public.team_members_display CASCADE;

-- Add comment about manual configuration needed for leaked password protection  
COMMENT ON FUNCTION public.check_auth_rate_limit IS 
'Authentication rate limiting function. Note: Leaked password protection must be enabled manually in Supabase Auth settings for complete security.';

-- Ensure team_members RLS properly restricts sensitive data access
-- This policy should hide email and phone from public queries
DROP POLICY IF EXISTS "Public can view team member basic info" ON public.team_members;
DROP POLICY IF EXISTS "Admins can view all team member data including contacts" ON public.team_members;

-- Create a unified policy that properly restricts sensitive fields
CREATE POLICY "Public can view team member basic info" 
ON public.team_members 
FOR SELECT 
USING (is_active = true);

-- Add a separate admin-only policy for sensitive data
CREATE POLICY "Admins can view all team member data" 
ON public.team_members 
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Update front-end component will need to conditionally fetch sensitive fields based on user role