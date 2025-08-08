-- Move btree_gist extension into the recommended 'extensions' schema to satisfy security linter
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  -- Only move if extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'btree_gist'
  ) THEN
    ALTER EXTENSION btree_gist SET SCHEMA extensions;
  END IF;
END$$;