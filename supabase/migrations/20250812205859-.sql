-- Tighten voucher visibility: only owner and admins can SELECT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'vouchers' 
      AND policyname = 'Users and staff can view vouchers'
  ) THEN
    DROP POLICY "Users and staff can view vouchers" ON public.vouchers;
  END IF;
END $$;

CREATE POLICY "Owner and admins can view vouchers"
ON public.vouchers
FOR SELECT
USING (
  auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role)
);

-- Restrict therapists to only their own appointments on SELECT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'appointments' 
      AND policyname = 'Users can view their own appointments'
  ) THEN
    DROP POLICY "Users can view their own appointments" ON public.appointments;
  END IF;
END $$;

CREATE POLICY "Users and assigned therapists can view appointments"
ON public.appointments
FOR SELECT
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (
    has_role(auth.uid(), 'therapist'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.therapists t
      WHERE t.id = appointments.therapist_id
        AND t.user_id = auth.uid()
    )
  )
);
