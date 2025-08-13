-- Drop the problematic view if it exists
DROP VIEW IF EXISTS public.team_members_public;

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

-- Create a secure bucket policy for therapist-avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('therapist-avatars-secure', 'therapist-avatars-secure', false)
ON CONFLICT (id) DO NOTHING;

-- Remove public access to therapist avatars
UPDATE storage.buckets 
SET public = false 
WHERE id = 'therapist-avatars';

-- Create secure storage policies for therapist avatars
CREATE POLICY "Admins can upload therapist avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'therapist-avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view therapist avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'therapist-avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view therapist avatars" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'therapist-avatars');