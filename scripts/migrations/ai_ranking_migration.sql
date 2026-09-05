-- 1. Add ai_rank column to games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS ai_rank INTEGER;

-- 2. Create system_settings table to store automated schedule info
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default setting for AI ranking
INSERT INTO system_settings (key, value)
VALUES ('ai_ranking', '{"schedule": "manual", "last_run": null}')
ON CONFLICT (key) DO NOTHING;

-- 3. (Optional but recommended) Set up pg_cron for automated execution in Supabase
-- Example for daily run (Uncomment if you want to set it up via pg_cron here)
/*
SELECT cron.schedule(
  'invoke_ai_ranking_daily',
  '0 0 * * *', -- Everyday at midnight
  $$
    SELECT net.http_post(
        url:='https://la-pack-game.pages.dev/api/ai-rank',
        headers:='{"Content-Type": "application/json"}',
        body:='{}'
    );
  $$
);
*/
