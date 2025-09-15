-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capacity INTEGER NOT NULL DEFAULT 1,
  floor_area NUMERIC, -- in square meters
  floor_plan_data JSONB DEFAULT '{}'::jsonb, -- coordinates and layout data
  amenities TEXT[], -- array of amenities like "shower", "storage", "music_system"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT NOT NULL, -- "massage_table", "chair", "music_system", etc.
  brand TEXT,
  model TEXT,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'active', -- active, maintenance, damaged, retired
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  purchase_date DATE,
  warranty_expires DATE,
  maintenance_schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create room bookings table to track room usage
CREATE TABLE public.room_bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, cancelled, completed
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_room_requirements table to specify which rooms are suitable for which services
CREATE TABLE public.service_room_requirements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  is_preferred BOOLEAN NOT NULL DEFAULT false, -- true if this room is preferred for this service
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(service_id, room_id)
);

-- Enable RLS
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_room_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies for rooms
CREATE POLICY "Admins can manage all rooms" 
ON public.rooms 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Therapists can view rooms" 
ON public.rooms 
FOR SELECT 
USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'therapist'::app_role));

-- Create policies for equipment
CREATE POLICY "Admins can manage all equipment" 
ON public.equipment 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Therapists can view equipment" 
ON public.equipment 
FOR SELECT 
USING (status = 'active' OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'therapist'::app_role));

-- Create policies for room bookings
CREATE POLICY "Admins can manage all room bookings" 
ON public.room_bookings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Therapists can view and create room bookings" 
ON public.room_bookings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'therapist'::app_role));

CREATE POLICY "Therapists can create room bookings" 
ON public.room_bookings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'therapist'::app_role));

-- Create policies for service room requirements
CREATE POLICY "Admins can manage service room requirements" 
ON public.service_room_requirements 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view service room requirements" 
ON public.service_room_requirements 
FOR SELECT 
USING (true);

-- Create function to check room availability
CREATE OR REPLACE FUNCTION public.check_room_availability(
  p_room_id UUID,
  p_booking_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_booking_id UUID DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict_count INTEGER;
BEGIN
  -- Check for conflicts with existing room bookings
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.room_bookings rb
  WHERE rb.room_id = p_room_id
    AND rb.booking_date = p_booking_date
    AND rb.status NOT IN ('cancelled')
    AND (p_exclude_booking_id IS NULL OR rb.id != p_exclude_booking_id)
    AND (
      -- Booking starts during our time slot
      (rb.start_time >= p_start_time AND rb.start_time < p_end_time)
      OR
      -- Booking ends during our time slot
      (rb.end_time > p_start_time AND rb.end_time <= p_end_time)
      OR
      -- Our booking is completely within existing booking
      (rb.start_time <= p_start_time AND rb.end_time >= p_end_time)
    );
  
  -- Return true if no conflicts
  RETURN v_conflict_count = 0;
END;
$$;

-- Create function to get suitable rooms for a service
CREATE OR REPLACE FUNCTION public.get_suitable_rooms_for_service(p_service_id UUID)
RETURNS TABLE(
  room_id UUID,
  room_name TEXT,
  is_preferred BOOLEAN,
  capacity INTEGER,
  amenities TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as room_id,
    r.name as room_name,
    COALESCE(srr.is_preferred, false) as is_preferred,
    r.capacity,
    r.amenities
  FROM public.rooms r
  LEFT JOIN public.service_room_requirements srr ON r.id = srr.room_id AND srr.service_id = p_service_id
  WHERE r.is_active = true
    AND (srr.room_id IS NOT NULL OR NOT EXISTS (
      SELECT 1 FROM public.service_room_requirements 
      WHERE service_id = p_service_id
    ))
  ORDER BY COALESCE(srr.is_preferred, false) DESC, r.name;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_rooms_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
  BEFORE UPDATE ON public.equipment
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_bookings_updated_at
  BEFORE UPDATE ON public.room_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();