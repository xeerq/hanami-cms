-- Sprawdź i popraw RLS policies dla tabeli profiles
-- Dodaj policy pozwalającą administratorom edytować wszystkie profile

-- Sprawdź aktualne policies
-- DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Dodaj policy dla administratorów do edycji wszystkich profili
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Dodaj policy dla administratorów do tworzenia profili
CREATE POLICY "Admins can insert any profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));