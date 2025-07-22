-- Add notification_sent column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN notification_sent boolean DEFAULT false;