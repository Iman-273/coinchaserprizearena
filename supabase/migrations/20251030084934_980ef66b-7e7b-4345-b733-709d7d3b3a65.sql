-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the finalize-weekly-tournament function to run every Sunday at midnight UTC
SELECT cron.schedule(
  'finalize-weekly-tournaments',
  '0 0 * * 0', -- Every Sunday at midnight
  $$
  SELECT
    net.http_post(
        url:='https://aeadkssyfynsryusefbr.supabase.co/functions/v1/finalize-weekly-tournament',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFlYWRrc3N5Znluc3J5dXNlZmJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIyNTI2OTIsImV4cCI6MjA2NzgyODY5Mn0.XO0d1iF1amiyHPvniy94l1Z8iMSSgOiqh2ab7YeZ1Qg"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);