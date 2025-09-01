-- Find and list all existing views to identify the security definer ones
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE schemaname = 'public';

-- Find views that might have security definer issues
\d+ team_members_display;

-- Check if there are any remaining problematic views by looking at the exact error
-- Drop any remaining problematic views that might exist from previous migrations
DROP VIEW IF EXISTS public.team_members_display CASCADE;

-- Update TeamMembersDisplay component to use proper RLS instead of views
-- The component should query team_members directly with proper field selection

-- For leaked password protection, this must be enabled manually in Supabase Auth settings
-- Add a comment about this requirement
COMMENT ON FUNCTION public.check_auth_rate_limit IS 
'Authentication rate limiting function. Note: Leaked password protection must be enabled manually in Supabase Auth settings for complete security.';