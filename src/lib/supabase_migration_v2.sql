-- ===================================================
-- LA-GAME Database Migration v2
-- Multi-Provider API Key Routing System
-- Run this in Supabase SQL Editor
-- ===================================================

-- 1. Ensure gemini_api_keys table exists (may have been created earlier via admin UI seed)
--    Add any missing columns gracefully.
ALTER TABLE IF EXISTS gemini_api_keys
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'gemini',
  ADD COLUMN IF NOT EXISTS model    TEXT NOT NULL DEFAULT 'gemini-flash-latest';

-- If the table doesn't exist yet, create it from scratch:
CREATE TABLE IF NOT EXISTS gemini_api_keys (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  api_key        TEXT NOT NULL,
  is_active      BOOLEAN DEFAULT TRUE,
  model          TEXT NOT NULL DEFAULT 'gemini-flash-latest',
  category       TEXT NOT NULL DEFAULT 'gemini',   -- 'gemini' | 'groq' | 'steamgriddb' | 'other'
  cooldown_until TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE gemini_api_keys ENABLE ROW LEVEL SECURITY;

-- Policies (wrapped in DO block to avoid duplicate errors)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gemini_api_keys' AND policyname = 'Public can read gemini_api_keys'
  ) THEN
    CREATE POLICY "Public can read gemini_api_keys"
      ON gemini_api_keys FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'gemini_api_keys' AND policyname = 'Anon full access gemini_api_keys'
  ) THEN
    CREATE POLICY "Anon full access gemini_api_keys"
      ON gemini_api_keys FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ===================================================
-- 2. API Key Routing Configuration Table
--    Stores which provider category each feature uses
-- ===================================================
CREATE TABLE IF NOT EXISTS api_key_routing (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature     TEXT NOT NULL UNIQUE,  -- 'chatbot' | 'game_details' | 'game_edit' | 'ai_ranking'
  category    TEXT NOT NULL DEFAULT 'gemini',  -- which provider category to use
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE api_key_routing ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_key_routing' AND policyname = 'Public can read api_key_routing'
  ) THEN
    CREATE POLICY "Public can read api_key_routing"
      ON api_key_routing FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'api_key_routing' AND policyname = 'Anon full access api_key_routing'
  ) THEN
    CREATE POLICY "Anon full access api_key_routing"
      ON api_key_routing FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Seed default routing (all features default to 'gemini')
INSERT INTO api_key_routing (feature, category) VALUES
  ('chatbot',      'gemini'),
  ('game_details', 'gemini'),
  ('game_edit',    'gemini'),
  ('ai_ranking',   'gemini')
ON CONFLICT (feature) DO NOTHING;

-- ===================================================
-- Done! Run this once to set up multi-provider routing.
-- ===================================================
