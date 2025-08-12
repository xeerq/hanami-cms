-- Restrict voucher SELECT policy to prevent public data exposure
DO $$
BEGIN
  -- Drop the existing broad SELECT policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vouchers' 
      AND policyname = 'Users can view vouchers for verification'
  ) THEN
    DROP POLICY "Users can view vouchers for verification" ON public.vouchers;
  END IF;
END $$;

-- Recreate a stricter SELECT policy
CREATE POLICY "Users and staff can view vouchers"
ON public.vouchers
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'therapist'::app_role)
);
