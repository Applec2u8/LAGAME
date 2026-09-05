-- Migration: Add device_model tracking for site visits and per-game platform models
-- Run this in Supabase SQL editor

-- 1) Add device_model column to site_views
ALTER TABLE site_views
ADD COLUMN IF NOT EXISTS device_model TEXT DEFAULT '';

-- 2) New table: per-game platform + device model aggregates
CREATE TABLE IF NOT EXISTS game_view_platform_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'other',
  device_model TEXT NOT NULL DEFAULT '',
  view_count INTEGER DEFAULT 1,
  UNIQUE(game_id, platform, device_model)
);

-- Enable RLS and public read for the new table
ALTER TABLE game_view_platform_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read game_view_platform_models" ON game_view_platform_models FOR SELECT USING (true);
CREATE POLICY "Anon full access game_view_platform_models" ON game_view_platform_models FOR ALL USING (true) WITH CHECK (true);

-- 3) Stored procedure to increment per-game platform+model view
CREATE OR REPLACE FUNCTION increment_game_platform_model_view(p_game_id UUID, p_platform TEXT, p_device_model TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO game_view_platform_models (game_id, platform, device_model, view_count)
  VALUES (p_game_id, p_platform, p_device_model, 1)
  ON CONFLICT (game_id, platform, device_model)
  DO UPDATE SET view_count = game_view_platform_models.view_count + 1;
END;
$$;

-- Note: After running this migration, update any RPC calls from the client to also call `increment_game_platform_model_view`
