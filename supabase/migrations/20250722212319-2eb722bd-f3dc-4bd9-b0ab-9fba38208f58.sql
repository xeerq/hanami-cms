-- Fix RLS policies for user_roles to allow users to read their own roles
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Keep admin management policy
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role(auth.uid(), 'admin'));