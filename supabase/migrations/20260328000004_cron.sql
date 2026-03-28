-- HomeHub v2 — pg_cron Jobs Migration 004
-- Registers the daily bill-scanner job.
-- Requires pg_cron and pg_net extensions (built into Supabase Pro).
--
-- NOTE: app.settings.supabase_functions_url and app.settings.service_role_key
-- must be configured in the Supabase Dashboard under
-- Project Settings → Database → Configuration before this job will fire.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily bill-scanner job — runs at 06:00 UTC every day.
SELECT cron.schedule(
  'daily-bill-scan',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url     := current_setting('app.settings.supabase_functions_url') || '/bill-scanner',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body    := jsonb_build_object('mode', 'incremental')
  ) AS request_id;
  $$
);
