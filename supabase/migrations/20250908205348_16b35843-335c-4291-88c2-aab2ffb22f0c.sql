-- Poprawka triggera - bez błędów składni

-- Usuń trigger z poprawkami
DROP TRIGGER IF EXISTS therapist_role_trigger ON public.user_roles CASCADE;

-- Utwórz poprawiony trigger z dwoma osobnymi triggerami
CREATE TRIGGER therapist_role_insert_trigger
    AFTER INSERT ON public.user_roles
    FOR EACH ROW
    WHEN (NEW.role = 'therapist')
    EXECUTE FUNCTION public.handle_therapist_role_changes();

CREATE TRIGGER therapist_role_delete_trigger
    AFTER DELETE ON public.user_roles
    FOR EACH ROW
    WHEN (OLD.role = 'therapist')
    EXECUTE FUNCTION public.handle_therapist_role_changes();