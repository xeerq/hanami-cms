-- Modify appointments table to support non-registered clients
ALTER TABLE public.appointments 
ADD COLUMN guest_name text,
ADD COLUMN guest_phone text,
ADD COLUMN is_guest boolean DEFAULT false;

-- Update the appointments table to make user_id nullable for guest appointments
ALTER TABLE public.appointments 
ALTER COLUMN user_id DROP NOT NULL;

-- Add constraint to ensure either user_id OR guest info is provided
ALTER TABLE public.appointments 
ADD CONSTRAINT check_user_or_guest 
CHECK (
  (user_id IS NOT NULL AND is_guest = false) OR 
  (user_id IS NULL AND is_guest = true AND guest_name IS NOT NULL AND guest_phone IS NOT NULL)
);

-- Update RLS policies for appointments to handle guest appointments
DROP POLICY IF EXISTS "Users can create their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view their own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can update their own appointments" ON public.appointments;

-- New policies that handle both registered users and therapist/admin access
CREATE POLICY "Users can create their own appointments"
ON public.appointments
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id AND is_guest = false) OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'therapist')
);

CREATE POLICY "Users can view their own appointments"
ON public.appointments
FOR SELECT
USING (
  (auth.uid() = user_id AND is_guest = false) OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'therapist')
);

CREATE POLICY "Users can update their own appointments"
ON public.appointments
FOR UPDATE
USING (
  (auth.uid() = user_id AND is_guest = false) OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'therapist')
);