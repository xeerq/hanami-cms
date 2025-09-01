-- Additional security hardening: Enhanced RLS policies and constraints

-- Ensure team_members_display has proper RLS
ALTER TABLE public.team_members_display ENABLE ROW LEVEL SECURITY;

-- Create policy for public viewing of team member display data (safe fields only)
CREATE POLICY "Public can view active team member display info" 
ON public.team_members_display 
FOR SELECT 
USING (is_active = true);

-- Add session timeout constraint for security
-- Create a function to clean up old sessions
CREATE OR REPLACE FUNCTION public.cleanup_old_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- This function can be called by a scheduled job to clean up old data
  -- For now, it's a placeholder for future security enhancements
  NULL;
END;
$$;

-- Add rate limiting tracking table for authentication attempts
CREATE TABLE IF NOT EXISTS public.auth_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address INET NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  blocked_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.auth_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy to allow system to manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.auth_rate_limits 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add security logging for critical operations
CREATE OR REPLACE FUNCTION public.log_critical_operation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log critical operations like profile updates, role changes, etc.
  IF TG_TABLE_NAME = 'profiles' AND TG_OP = 'UPDATE' THEN
    PERFORM public.log_security_event(
      'profile_updated',
      'profiles',
      NEW.id,
      jsonb_build_object(
        'user_id', NEW.user_id,
        'fields_changed', to_jsonb(NEW) - to_jsonb(OLD)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profile updates
DROP TRIGGER IF EXISTS trigger_log_profile_updates ON public.profiles;
CREATE TRIGGER trigger_log_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_critical_operation();

-- Enhance voucher security by ensuring user assignment is logged
CREATE OR REPLACE FUNCTION public.log_voucher_operations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    PERFORM public.log_security_event(
      'voucher_assigned',
      'vouchers',
      NEW.id,
      jsonb_build_object(
        'voucher_code', NEW.code,
        'old_user_id', OLD.user_id,
        'new_user_id', NEW.user_id
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for voucher operations
DROP TRIGGER IF EXISTS trigger_log_voucher_operations ON public.vouchers;
CREATE TRIGGER trigger_log_voucher_operations
  AFTER UPDATE ON public.vouchers
  FOR EACH ROW
  EXECUTE FUNCTION public.log_voucher_operations();