-- Fix notification trigger to notify users when therapists create appointments for them
CREATE OR REPLACE FUNCTION public.notify_appointment_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_profile RECORD;
    therapist_info RECORD;
    service_info RECORD;
    admin_users UUID[];
BEGIN
    -- Get user profile info
    SELECT first_name, last_name INTO user_profile
    FROM public.profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
    
    -- Get therapist info
    SELECT name, user_id INTO therapist_info
    FROM public.therapists WHERE id = COALESCE(NEW.therapist_id, OLD.therapist_id);
    
    -- Get service info
    SELECT name INTO service_info
    FROM public.services WHERE id = COALESCE(NEW.service_id, OLD.service_id);
    
    -- Get all admin user IDs
    SELECT ARRAY_AGG(user_id) INTO admin_users
    FROM public.user_roles WHERE role = 'admin';

    IF TG_OP = 'INSERT' THEN
        -- Notify user about new appointment (if it's not a guest appointment)
        IF NEW.user_id IS NOT NULL AND NOT NEW.is_guest THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            VALUES (
                NEW.user_id,
                'Nowa wizyta została zarezerwowana',
                CONCAT(
                    'Wizyta ', service_info.name,
                    ' została zarezerwowana u ', therapist_info.name,
                    ' na ', TO_CHAR(NEW.appointment_date, 'DD.MM.YYYY'),
                    ' o ', TO_CHAR(NEW.appointment_time, 'HH24:MI')
                ),
                'success',
                NEW.id,
                'appointment'
            );
        END IF;
        
        -- Notify therapist about new appointment
        IF therapist_info.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            VALUES (
                therapist_info.user_id,
                'Nowa rezerwacja',
                CONCAT(
                    'Nowa wizyta: ', service_info.name, 
                    ' zarezerwowana przez ', COALESCE(user_profile.first_name || ' ' || user_profile.last_name, NEW.guest_name, 'Klient'),
                    ' na ', TO_CHAR(NEW.appointment_date, 'DD.MM.YYYY'),
                    ' o ', TO_CHAR(NEW.appointment_time, 'HH24:MI')
                ),
                'info',
                NEW.id,
                'appointment'
            );
        END IF;
        
        -- Notify admins about new appointment
        IF admin_users IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Nowa rezerwacja w systemie',
                CONCAT(
                    'Nowa wizyta: ', service_info.name,
                    ' u ', therapist_info.name,
                    ' na ', TO_CHAR(NEW.appointment_date, 'DD.MM.YYYY'),
                    ' o ', TO_CHAR(NEW.appointment_time, 'HH24:MI')
                ),
                'info',
                NEW.id,
                'appointment';
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Check if appointment was updated by therapist
        IF NEW.updated_at > OLD.updated_at AND NEW.user_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            VALUES (
                NEW.user_id,
                'Wizyta została zaktualizowana',
                CONCAT(
                    'Twoja wizyta ', service_info.name,
                    ' na ', TO_CHAR(NEW.appointment_date, 'DD.MM.YYYY'),
                    ' o ', TO_CHAR(NEW.appointment_time, 'HH24:MI'),
                    ' została zaktualizowana przez terapeutę.'
                ),
                'info',
                NEW.id,
                'appointment'
            );
        END IF;
        
        -- Notify admins about appointment changes
        IF admin_users IS NOT NULL AND (
            OLD.appointment_date != NEW.appointment_date OR 
            OLD.appointment_time != NEW.appointment_time OR 
            OLD.status != NEW.status
        ) THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Wizyta została zmieniona',
                CONCAT(
                    'Wizyta ', service_info.name,
                    ' u ', therapist_info.name,
                    ' została zmieniona przez terapeutę'
                ),
                'warning',
                NEW.id,
                'appointment';
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;