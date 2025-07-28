-- Create table for vouchers and massage packages
CREATE TABLE public.vouchers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  voucher_type TEXT NOT NULL CHECK (voucher_type IN ('single', 'package')),
  service_id UUID,
  user_id UUID,
  purchaser_email TEXT,
  purchaser_phone TEXT,
  purchaser_name TEXT,
  original_value DECIMAL(10,2),
  remaining_value DECIMAL(10,2),
  original_sessions INTEGER DEFAULT 1,
  remaining_sessions INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Create table for voucher redemption history
CREATE TABLE public.voucher_redemptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  voucher_id UUID NOT NULL REFERENCES public.vouchers(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  redeemed_by UUID,
  redeemed_value DECIMAL(10,2),
  redeemed_sessions INTEGER DEFAULT 1,
  redemption_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  created_by UUID
);

-- Enable RLS on vouchers table
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Enable RLS on voucher_redemptions table
ALTER TABLE public.voucher_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for vouchers
CREATE POLICY "Users can view their own vouchers" 
ON public.vouchers 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role)
);

CREATE POLICY "Admins can manage all vouchers" 
ON public.vouchers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can create vouchers" 
ON public.vouchers 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role)
);

-- RLS policies for voucher_redemptions
CREATE POLICY "Users can view their voucher redemptions" 
ON public.voucher_redemptions 
FOR SELECT 
USING (
  auth.uid() = redeemed_by OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.vouchers 
    WHERE vouchers.id = voucher_redemptions.voucher_id 
    AND vouchers.user_id = auth.uid()
  )
);

CREATE POLICY "Admins and therapists can manage redemptions" 
ON public.voucher_redemptions 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'therapist'::app_role)
);

-- Create indexes for better performance
CREATE INDEX idx_vouchers_code ON public.vouchers(code);
CREATE INDEX idx_vouchers_user_id ON public.vouchers(user_id);
CREATE INDEX idx_vouchers_status ON public.vouchers(status);
CREATE INDEX idx_voucher_redemptions_voucher_id ON public.voucher_redemptions(voucher_id);

-- Create function to generate unique voucher codes
CREATE OR REPLACE FUNCTION public.generate_voucher_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    code := 'VOC' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM public.vouchers WHERE vouchers.code = code) INTO exists_check;
    IF NOT exists_check THEN
      EXIT;
    END IF;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates on vouchers
CREATE TRIGGER update_vouchers_updated_at
BEFORE UPDATE ON public.vouchers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add voucher_code column to appointments table for tracking
ALTER TABLE public.appointments ADD COLUMN voucher_code TEXT;
CREATE INDEX idx_appointments_voucher_code ON public.appointments(voucher_code);