-- Fix only what's missing - remove the problematic view
DROP VIEW IF EXISTS public.team_members_public;

-- Restrict site_settings access properly
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

-- Make therapist-avatars bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'therapist-avatars';