-- Create notification functions for service changes

-- Function to notify when appointments are created/updated
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

-- Function to notify about therapist schedule changes
CREATE OR REPLACE FUNCTION public.notify_schedule_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    therapist_info RECORD;
    admin_users UUID[];
    day_names TEXT[] := ARRAY['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
BEGIN
    -- Get therapist info
    SELECT name INTO therapist_info
    FROM public.therapists WHERE id = COALESCE(NEW.therapist_id, OLD.therapist_id);
    
    -- Get all admin user IDs
    SELECT ARRAY_AGG(user_id) INTO admin_users
    FROM public.user_roles WHERE role = 'admin';

    IF TG_OP = 'INSERT' THEN
        -- Notify admins about new schedule
        IF admin_users IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Nowy grafik do zatwierdzenia',
                CONCAT(
                    'Terapeuta ', therapist_info.name,
                    ' dodał nowy grafik na ', day_names[NEW.day_of_week + 1],
                    ' (', TO_CHAR(NEW.start_time, 'HH24:MI'), ' - ', TO_CHAR(NEW.end_time, 'HH24:MI'), ')'
                ),
                'info',
                NEW.id,
                'schedule';
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Notify admins about schedule updates
        IF admin_users IS NOT NULL AND (
            OLD.start_time != NEW.start_time OR 
            OLD.end_time != NEW.end_time OR 
            OLD.status != NEW.status
        ) THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Grafik został zmieniony',
                CONCAT(
                    'Terapeuta ', therapist_info.name,
                    ' zmienił grafik na ', day_names[NEW.day_of_week + 1]
                ),
                'warning',
                NEW.id,
                'schedule';
        END IF;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Function to notify about product inventory changes
CREATE OR REPLACE FUNCTION public.notify_product_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    admin_users UUID[];
BEGIN
    -- Get all admin user IDs
    SELECT ARRAY_AGG(user_id) INTO admin_users
    FROM public.user_roles WHERE role = 'admin';

    IF TG_OP = 'UPDATE' AND admin_users IS NOT NULL THEN
        -- Notify about low stock
        IF NEW.stock_quantity <= 5 AND OLD.stock_quantity > 5 THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Niski stan magazynowy',
                CONCAT('Produkt "', NEW.name, '" ma niski stan magazynowy (', NEW.stock_quantity, ' szt.)'),
                'warning',
                NEW.id,
                'product';
        END IF;
        
        -- Notify about out of stock
        IF NEW.stock_quantity = 0 AND OLD.stock_quantity > 0 THEN
            INSERT INTO public.notifications (user_id, title, message, type, related_id, related_type)
            SELECT 
                unnest(admin_users),
                'Produkt wyprzedany',
                CONCAT('Produkt "', NEW.name, '" został wyprzedany'),
                'error',
                NEW.id,
                'product';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_appointment_changes ON public.appointments;
CREATE TRIGGER trigger_appointment_changes
    AFTER INSERT OR UPDATE ON public.appointments
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_appointment_changes();

DROP TRIGGER IF EXISTS trigger_schedule_changes ON public.therapist_schedules;
CREATE TRIGGER trigger_schedule_changes
    AFTER INSERT OR UPDATE ON public.therapist_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_schedule_changes();

DROP TRIGGER IF EXISTS trigger_product_changes ON public.products;
CREATE TRIGGER trigger_product_changes
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_product_changes();