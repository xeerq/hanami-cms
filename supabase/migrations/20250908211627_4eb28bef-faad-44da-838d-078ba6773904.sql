-- Sprawdź wszystkie istniejące policies i usuń je
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'profiles' AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_rec.policyname || '" ON public.profiles';
    END LOOP;
END $$;

-- Stwórz nowe, poprawne policies
-- Policy dla użytkowników - mogą tworzyć swój własny profil
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy dla użytkowników - mogą edytować swój własny profil
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy dla wyświetlania profili
CREATE POLICY "Profiles view policy" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role)
);

-- Policy dla administratorów - mogą zarządzać wszystkimi profilami
CREATE POLICY "Admin full access policy" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));