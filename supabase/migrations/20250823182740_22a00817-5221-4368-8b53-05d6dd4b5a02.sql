-- Fix security issues by updating the function with proper search path
CREATE OR REPLACE FUNCTION public.notify_therapist_appointment_cancelled()
RETURNS TRIGGER AS $$
DECLARE
    therapist_user_id UUID;
    service_name TEXT;
BEGIN
    -- Check if appointment was cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        -- Get therapist user_id and service name
        SELECT 
            t.user_id,
            s.name
        INTO therapist_user_id, service_name
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
                    service_name,
                    ' na dzień ',
                    TO_CHAR(NEW.appointment_date, 'DD.MM.YYYY'),
                    ' o godzinie ',
                    TO_CHAR(NEW.appointment_time, 'HH24:MI'),
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
$$ LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public;