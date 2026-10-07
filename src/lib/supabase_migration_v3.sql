-- ===================================================
-- LA-GAME Database Migration v3
-- AI Generation Cache (game_generations)
-- Run this in Supabase SQL Editor
-- ===================================================

-- Create game_generations cache table
CREATE TABLE IF NOT EXISTS game_generations (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_title               TEXT NOT NULL,
  genres                   TEXT[] DEFAULT '{}',
  platforms                TEXT[] DEFAULT '{}',
  file_size                TEXT DEFAULT '',
  description              TEXT DEFAULT '',
  cover_image              TEXT DEFAULT '',
  screenshots              TEXT[] DEFAULT '{}',
  video_url                TEXT DEFAULT '',
  minimum_requirements     TEXT DEFAULT '',
  recommended_requirements TEXT DEFAULT '',
  steam_app_id             INTEGER,
  is_featured              BOOLEAN DEFAULT FALSE,
  cached_download_links    JSONB DEFAULT '[]'::jsonb,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),

  -- Enforce a single canonical record per lowercase title
  CONSTRAINT game_generations_title_unique UNIQUE (game_title)
);

-- Index for fast prefix-search (autocomplete)
CREATE INDEX IF NOT EXISTS idx_game_generations_title
  ON game_generations USING gin(to_tsvector('simple', game_title));

-- Trigram index for partial-match (ILIKE) autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_game_generations_title_trgm
  ON game_generations USING gin(game_title gin_trgm_ops);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_game_generations_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_game_generations_updated_at ON game_generations;
CREATE TRIGGER trg_game_generations_updated_at
  BEFORE UPDATE ON game_generations
  FOR EACH ROW EXECUTE FUNCTION update_game_generations_updated_at();

-- Enable RLS
ALTER TABLE game_generations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated admins full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_generations' AND policyname = 'admin_all'
  ) THEN
    CREATE POLICY admin_all ON game_generations
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END;
$$;

-- Allow anonymous read (so autocomplete works even without auth if needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'game_generations' AND policyname = 'public_read'
  ) THEN
    CREATE POLICY public_read ON game_generations
      FOR SELECT USING (TRUE);
  END IF;
END;
$$;

-- ===================================================
-- Patch v3.1: Add cached_download_links column
-- Run this on existing databases (safe: IF NOT EXISTS)
-- ===================================================
ALTER TABLE game_generations
  ADD COLUMN IF NOT EXISTS cached_download_links JSONB DEFAULT '[]'::jsonb;
