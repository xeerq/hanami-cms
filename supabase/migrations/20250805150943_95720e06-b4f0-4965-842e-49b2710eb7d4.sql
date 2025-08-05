-- Allow authenticated users to view vouchers by code for verification
-- This enables guests to verify vouchers during booking
DROP POLICY IF EXISTS "Users can view their own vouchers" ON public.vouchers;

CREATE POLICY "Users can view vouchers for verification" 
ON public.vouchers 
FOR SELECT 
USING (
  -- Users can see their own vouchers
  (auth.uid() = user_id) 
  OR 
  -- Users can see guest vouchers (for verification during booking)
  (user_id IS NULL)
  OR 
  -- Admins and therapists can see all vouchers
  has_role(auth.uid(), 'admin'::app_role) 
  OR 
  has_role(auth.uid(), 'therapist'::app_role)
);