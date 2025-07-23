-- Dodaj kolumnę avatar_url do tabeli therapists
ALTER TABLE public.therapists 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Utwórz bucket dla zdjęć terapeutów
INSERT INTO storage.buckets (id, name, public) 
VALUES ('therapist-avatars', 'therapist-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Polityki dla bucket therapist-avatars
CREATE POLICY "Anyone can view therapist avatars" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'therapist-avatars');

CREATE POLICY "Admins can upload therapist avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'therapist-avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update therapist avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'therapist-avatars' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete therapist avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'therapist-avatars' AND has_role(auth.uid(), 'admin'::app_role));