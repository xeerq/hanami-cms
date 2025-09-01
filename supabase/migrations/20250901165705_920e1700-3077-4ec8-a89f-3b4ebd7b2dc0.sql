-- Function to ban a user
CREATE OR REPLACE FUNCTION public.ban_user(
    user_id UUID,
    ban_duration_hours INTEGER DEFAULT 8760 -- Default 1 year
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    ban_until TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Only admins can ban users
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can ban users';
    END IF;
    
    -- Calculate ban expiration
    ban_until := now() + (ban_duration_hours || ' hours')::INTERVAL;
    
    -- Insert ban record in auth.users metadata
    UPDATE auth.users 
    SET banned_until = ban_until,
        updated_at = now()
    WHERE id = user_id;
    
    -- Log the ban action
    PERFORM log_security_event(
        'user_banned',
        'auth.users',
        user_id,
        jsonb_build_object(
            'banned_until', ban_until,
            'banned_by', auth.uid(),
            'ban_duration_hours', ban_duration_hours
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Function to unban a user
CREATE OR REPLACE FUNCTION public.unban_user(
    user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only admins can unban users
    IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
        RAISE EXCEPTION 'Only administrators can unban users';
    END IF;
    
    -- Remove ban from auth.users
    UPDATE auth.users 
    SET banned_until = NULL,
        updated_at = now()
    WHERE id = user_id;
    
    -- Log the unban action
    PERFORM log_security_event(
        'user_unbanned',
        'auth.users',
        user_id,
        jsonb_build_object(
            'unbanned_by', auth.uid()
        )
    );
    
    RETURN TRUE;
END;
$$;

-- Function to check if user is currently banned
CREATE OR REPLACE FUNCTION public.is_user_banned(
    user_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    banned_until TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT u.banned_until INTO banned_until
    FROM auth.users u
    WHERE u.id = user_id;
    
    RETURN banned_until IS NOT NULL AND banned_until > now();
END;
$$;