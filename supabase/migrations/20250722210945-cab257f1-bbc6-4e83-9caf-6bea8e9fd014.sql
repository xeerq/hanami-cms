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

-- Add therapist role for masseuses
INSERT INTO public.user_roles (user_id, role)
SELECT t.id, 'therapist'::app_role
FROM (
  SELECT 'aca24eb5-ed92-4461-bfe8-effc968519fc'::uuid AS id
  UNION ALL
  SELECT 'c4382304-3ad0-4582-953e-fb85b2c382e0'::uuid
  UNION ALL  
  SELECT 'f3b669c7-bc7b-4ecc-94d0-ad7296206d5a'::uuid
  UNION ALL
  SELECT '8ce29ff5-2413-406b-8ad9-8d0fa1a02813'::uuid
) t
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles ur 
  WHERE ur.user_id = t.id AND ur.role = 'therapist'
);

-- Create therapist_users table to map therapists to actual users
CREATE TABLE public.therapist_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  therapist_id uuid REFERENCES public.therapists(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (therapist_id, user_id)
);

-- Enable RLS
ALTER TABLE public.therapist_users ENABLE ROW LEVEL SECURITY;

-- RLS policies for therapist_users
CREATE POLICY "Admins can manage therapist users"
ON public.therapist_users
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Therapists can view their own mapping"
ON public.therapist_users
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));