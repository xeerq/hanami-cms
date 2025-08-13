-- Fix RLS for team_members_public table
ALTER TABLE public.team_members_public ENABLE ROW LEVEL SECURITY;

-- Only allow viewing of active team members publicly
CREATE POLICY "Anyone can view active team members" 
ON public.team_members_public 
FOR SELECT 
USING (is_active = true);

-- Admins can manage all team members
CREATE POLICY "Admins can manage team members" 
ON public.team_members_public 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Restrict site_settings access - remove public access and only allow authenticated users to read non-sensitive settings
DROP POLICY IF EXISTS "Anyone can view site settings" ON public.site_settings;

-- Only allow viewing of specific safe settings to public
CREATE POLICY "Public can view safe site settings" 
ON public.site_settings 
FOR SELECT 
USING (key IN ('business_hours', 'social_media', 'about_text', 'services_intro', 'contact_display_name'));

-- Authenticated users can view more settings
CREATE POLICY "Authenticated users can view site settings" 
ON public.site_settings 
FOR SELECT 
TO authenticated
USING (key NOT IN ('admin_email', 'smtp_settings', 'payment_keys', 'api_keys'));

-- Only admins can manage site settings  
CREATE POLICY "Admins can manage site settings" 
ON public.site_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));