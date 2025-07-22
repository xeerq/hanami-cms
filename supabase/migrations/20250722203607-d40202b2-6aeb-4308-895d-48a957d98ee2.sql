-- Create cron job to send appointment reminders every hour
SELECT cron.schedule(
  'send-appointment-reminders',
  '0 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://mfjfhnwgrbwjovvnlxto.supabase.co/functions/v1/send-appointment-reminder',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mamZobndncmJ3am92dm5seHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyMTIwMTQsImV4cCI6MjA2ODc4ODAxNH0.J6hOEg8PYNhdxsUmhwl0UcJXEveun4o7Wzq0jnGtrd8"}'::jsonb,
        body:='{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);