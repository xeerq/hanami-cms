-- Fix overlap prevention without using a generated column that depends on another generated column
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Ensure duration column exists and is populated
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 30;

UPDATE public.appointments a
SET duration = COALESCE(s.duration, a.duration)
FROM public.services s
WHERE s.id = a.service_id;

-- Ensure start_ts exists (timestamp without time zone)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS start_ts timestamp WITHOUT time zone
    GENERATED ALWAYS AS (appointment_date + appointment_time) STORED;

-- Remove end_ts if partially created
ALTER TABLE public.appointments
  DROP COLUMN IF EXISTS end_ts;

-- Create exclusion constraint using inline end timestamp expression
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_per_therapist'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap_per_therapist
      EXCLUDE USING gist (
        therapist_id WITH =,
        tsrange(start_ts, (start_ts + make_interval(mins => duration)), '[)') WITH &&
      )
      WHERE (status IN ('pending','confirmed'));
  END IF;
END$$;