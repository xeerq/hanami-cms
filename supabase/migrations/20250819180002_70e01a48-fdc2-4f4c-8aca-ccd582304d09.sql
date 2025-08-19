-- Create therapist availability schedules table
CREATE TABLE public.therapist_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  therapist_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_by UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure therapist exists
  CONSTRAINT fk_therapist FOREIGN KEY (therapist_id) REFERENCES public.therapists(id) ON DELETE CASCADE,
  -- Ensure end time is after start time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Enable RLS
ALTER TABLE public.therapist_schedules ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Therapists can manage their own schedules" 
ON public.therapist_schedules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.therapists t 
    WHERE t.id = therapist_schedules.therapist_id 
    AND t.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all schedules" 
ON public.therapist_schedules 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view approved schedules" 
ON public.therapist_schedules 
FOR SELECT 
USING (status = 'approved' OR has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_therapist_schedules_updated_at
BEFORE UPDATE ON public.therapist_schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_therapist_schedules_therapist_id ON public.therapist_schedules(therapist_id);
CREATE INDEX idx_therapist_schedules_day_status ON public.therapist_schedules(day_of_week, status);
CREATE INDEX idx_therapist_schedules_status ON public.therapist_schedules(status);

-- Create function to check therapist availability
CREATE OR REPLACE FUNCTION public.check_therapist_availability(
  p_therapist_id UUID,
  p_appointment_date DATE,
  p_appointment_time TIME,
  p_duration INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_day_of_week INTEGER;
  v_end_time TIME;
  v_schedule_count INTEGER;
  v_conflict_count INTEGER;
BEGIN
  -- Calculate day of week (0=Sunday, 6=Saturday)
  v_day_of_week := EXTRACT(DOW FROM p_appointment_date);
  
  -- Calculate end time of appointment
  v_end_time := p_appointment_time + (p_duration || ' minutes')::INTERVAL;
  
  -- Check if therapist has approved schedule for this day
  SELECT COUNT(*) INTO v_schedule_count
  FROM public.therapist_schedules
  WHERE therapist_id = p_therapist_id
    AND day_of_week = v_day_of_week
    AND status = 'approved'
    AND is_active = true
    AND start_time <= p_appointment_time
    AND end_time >= v_end_time;
  
  -- If no approved schedule found, return false
  IF v_schedule_count = 0 THEN
    RETURN false;
  END IF;
  
  -- Check for conflicts with existing appointments
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.appointments
  WHERE therapist_id = p_therapist_id
    AND appointment_date = p_appointment_date
    AND status NOT IN ('cancelled', 'rejected')
    AND (
      -- Appointment starts during our time slot
      (appointment_time >= p_appointment_time AND appointment_time < v_end_time)
      OR
      -- Appointment ends during our time slot
      (appointment_time + (duration || ' minutes')::INTERVAL > p_appointment_time 
       AND appointment_time + (duration || ' minutes')::INTERVAL <= v_end_time)
      OR
      -- Our appointment is completely within existing appointment
      (appointment_time <= p_appointment_time 
       AND appointment_time + (duration || ' minutes')::INTERVAL >= v_end_time)
    );
  
  -- Return true if no conflicts
  RETURN v_conflict_count = 0;
END;
$$;