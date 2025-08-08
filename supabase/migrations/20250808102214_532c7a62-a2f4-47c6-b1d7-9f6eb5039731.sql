-- Enable required extension for exclusion constraints on non-range columns
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 1) Ensure appointments have a stored duration in minutes
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS duration integer NOT NULL DEFAULT 30;

-- Backfill duration from related service where possible
UPDATE public.appointments a
SET duration = COALESCE(s.duration, a.duration)
FROM public.services s
WHERE s.id = a.service_id;

-- 2) Generated timestamps for range calculations (local time, no TZ)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS start_ts timestamp WITHOUT time zone
    GENERATED ALWAYS AS (appointment_date + appointment_time) STORED;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS end_ts timestamp WITHOUT time zone
    GENERATED ALWAYS AS (start_ts + make_interval(mins => duration)) STORED;

-- 3) Exclusion constraint to prevent overlapping appointments per therapist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_per_therapist'
  ) THEN
    ALTER TABLE public.appointments
      ADD CONSTRAINT appointments_no_overlap_per_therapist
      EXCLUDE USING gist (
        therapist_id WITH =,
        tsrange(start_ts, end_ts, '[)') WITH &&
      )
      WHERE (status IN ('pending','confirmed'));
  END IF;
END$$;