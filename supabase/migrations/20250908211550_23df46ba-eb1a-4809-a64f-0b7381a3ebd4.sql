-- Usuń wszystkie istniejące policies i utwórz nowe, poprawne
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert any profile" ON public.profiles;

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

-- Policy dla użytkowników - mogą wyświetlać swój profil oraz admini i terapeuci mogą wyświetlać wszystkie
CREATE POLICY "Users can view profiles securely" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role)
);

-- Policy dla administratorów - mogą zarządzać wszystkimi profilami
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));