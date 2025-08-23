-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  related_id UUID NULL,
  related_type TEXT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE TRIGGER update_notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to send notifications for appointment cancellations
CREATE OR REPLACE FUNCTION public.notify_therapist_appointment_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    therapist_user_id UUID;
    appointment_info RECORD;
BEGIN
    -- Check if appointment was cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        -- Get therapist user_id and appointment details
        SELECT 
            t.user_id,
            s.name as service_name,
            NEW.appointment_date,
            NEW.appointment_time
        INTO therapist_user_id, appointment_info
        FROM public.therapists t
        JOIN public.services s ON s.id = NEW.service_id
        WHERE t.id = NEW.therapist_id;
        
        -- Only notify if therapist has a user account
        IF therapist_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                title,
                message,
                type,
                related_id,
                related_type
            ) VALUES (
                therapist_user_id,
                'Wizyta została odwołana',
                CONCAT(
                    'Wizyta ',
                    appointment_info.service_name,
                    ' na dzień ',
                    TO_CHAR(appointment_info.appointment_date, 'DD.MM.YYYY'),
                    ' o godzinie ',
                    TO_CHAR(appointment_info.appointment_time, 'HH24:MI'),
                    ' została odwołana przez klienta.'
                ),
                'warning',
                NEW.id,
                'appointment'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for appointment cancellations
CREATE TRIGGER notify_appointment_cancelled
    AFTER UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_therapist_appointment_cancelled();