-- ===================================================
-- AUTO BOOST SCHEDULER SCHEMA
-- Run in Supabase SQL Editor
-- ===================================================

-- 1. Ensure engagement columns exist on games table
ALTER TABLE games ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

-- Sync views_count from view_count for existing games
UPDATE games 
SET views_count = view_count 
WHERE (views_count IS NULL OR views_count = 0) AND view_count > 0;

-- Indexes for fast sort
CREATE INDEX IF NOT EXISTS idx_games_views_count ON games (views_count DESC);
CREATE INDEX IF NOT EXISTS idx_games_likes_count ON games (likes_count DESC);

-- ===================================================
-- 2. boost_schedules table
-- ===================================================
CREATE TABLE IF NOT EXISTS boost_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  scope TEXT NOT NULL DEFAULT 'selected', -- 'selected' | 'category' | 'all'
  game_ids UUID[] DEFAULT '{}',           -- populated when scope='selected'
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,

  -- Mode
  mode TEXT NOT NULL DEFAULT 'increment', -- 'increment' | 'target'

  -- Increment mode config
  view_min INTEGER DEFAULT 10,
  view_max INTEGER DEFAULT 100,
  like_min INTEGER DEFAULT 2,
  like_max INTEGER DEFAULT 25,

  -- Target mode config (run until reaching these values)
  target_views INTEGER,
  target_likes INTEGER,

  -- Frequency
  interval_unit TEXT NOT NULL DEFAULT 'hour', -- 'minute' | 'hour' | 'day' | 'month'
  interval_value INTEGER NOT NULL DEFAULT 1,  -- e.g. every 5 minutes = unit:'minute' value:5

  -- State
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  total_runs INTEGER DEFAULT 0,
  total_views_added INTEGER DEFAULT 0,
  total_likes_added INTEGER DEFAULT 0,

  -- Meta
  label TEXT,            -- Optional human-readable name for this schedule
  created_by TEXT,       -- admin identifier
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE boost_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access boost_schedules" ON boost_schedules FOR ALL USING (true) WITH CHECK (true);

-- ===================================================
-- 3. boost_run_logs table (for audit / history)
-- ===================================================
CREATE TABLE IF NOT EXISTS boost_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID REFERENCES boost_schedules(id) ON DELETE CASCADE,
  run_at TIMESTAMPTZ DEFAULT NOW(),
  games_updated INTEGER DEFAULT 0,
  views_added INTEGER DEFAULT 0,
  likes_added INTEGER DEFAULT 0,
  error TEXT
);

ALTER TABLE boost_run_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access boost_run_logs" ON boost_run_logs FOR ALL USING (true) WITH CHECK (true);

-- ===================================================
-- 4. Helper function: compute next_run_at from now
-- ===================================================
CREATE OR REPLACE FUNCTION compute_next_run(unit TEXT, val INTEGER)
RETURNS TIMESTAMPTZ LANGUAGE plpgsql AS $$
BEGIN
  CASE unit
    WHEN 'minute' THEN RETURN NOW() + (val || ' minutes')::INTERVAL;
    WHEN 'hour'   THEN RETURN NOW() + (val || ' hours')::INTERVAL;
    WHEN 'day'    THEN RETURN NOW() + (val || ' days')::INTERVAL;
    WHEN 'month'  THEN RETURN NOW() + (val || ' months')::INTERVAL;
    ELSE RETURN NOW() + INTERVAL '1 hour';
  END CASE;
END;
$$;

-- ===================================================
-- 5. Core function: process_due_boost_schedules()
--    Called by Edge Function on a cron-like schedule
-- ===================================================
CREATE OR REPLACE FUNCTION process_due_boost_schedules()
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  sched RECORD;
  game_row RECORD;
  view_delta INTEGER;
  like_delta INTEGER;
  new_views INTEGER;
  new_likes INTEGER;
  total_games_updated INTEGER := 0;
  total_v INTEGER := 0;
  total_l INTEGER := 0;
  game_ids_to_update UUID[];
BEGIN
  -- Loop over all active schedules that are due
  FOR sched IN
    SELECT * FROM boost_schedules
    WHERE is_active = TRUE
      AND (next_run_at IS NULL OR next_run_at <= NOW())
    ORDER BY created_at ASC
  LOOP
    total_games_updated := 0;
    total_v := 0;
    total_l := 0;

    -- Determine which game IDs to update
    IF sched.scope = 'all' THEN
      SELECT ARRAY(SELECT id FROM games) INTO game_ids_to_update;
    ELSIF sched.scope = 'category' AND sched.category_id IS NOT NULL THEN
      SELECT ARRAY(
        SELECT id FROM games
        WHERE category_id = sched.category_id
           OR category_ids @> ARRAY[sched.category_id]
      ) INTO game_ids_to_update;
    ELSE
      game_ids_to_update := sched.game_ids;
    END IF;

    -- Update each game
    FOR game_row IN
      SELECT id, view_count, views_count, likes_count
      FROM games WHERE id = ANY(game_ids_to_update)
    LOOP
      -- Choose increment
      IF sched.mode = 'increment' THEN
        view_delta := sched.view_min + floor(random() * (sched.view_max - sched.view_min + 1))::INTEGER;
        like_delta := sched.like_min + floor(random() * (sched.like_max - sched.like_min + 1))::INTEGER;
        new_views  := COALESCE(game_row.views_count, game_row.view_count, 0) + view_delta;
        new_likes  := COALESCE(game_row.likes_count, 0) + like_delta;
      ELSIF sched.mode = 'target' THEN
        -- Only boost if below target
        new_views := COALESCE(game_row.views_count, game_row.view_count, 0);
        new_likes := COALESCE(game_row.likes_count, 0);
        view_delta := 0;
        like_delta := 0;
        IF sched.target_views IS NOT NULL AND new_views < sched.target_views THEN
          view_delta := LEAST(sched.view_max, sched.target_views - new_views);
          new_views  := new_views + view_delta;
        END IF;
        IF sched.target_likes IS NOT NULL AND new_likes < sched.target_likes THEN
          like_delta := LEAST(sched.like_max, sched.target_likes - new_likes);
          new_likes  := new_likes + like_delta;
        END IF;
        -- If already at target, nothing to do
        IF view_delta = 0 AND like_delta = 0 THEN CONTINUE; END IF;
      ELSE
        CONTINUE;
      END IF;

      UPDATE games
      SET view_count  = new_views,
          views_count = new_views,
          likes_count = new_likes,
          updated_at  = NOW()
      WHERE id = game_row.id;

      total_games_updated := total_games_updated + 1;
      total_v := total_v + view_delta;
      total_l := total_l + like_delta;
    END LOOP;

    -- Update schedule state
    UPDATE boost_schedules SET
      last_run_at          = NOW(),
      next_run_at          = compute_next_run(sched.interval_unit, sched.interval_value),
      total_runs           = sched.total_runs + 1,
      total_views_added    = sched.total_views_added + total_v,
      total_likes_added    = sched.total_likes_added + total_l,
      updated_at           = NOW()
    WHERE id = sched.id;

    -- Log this run
    INSERT INTO boost_run_logs (schedule_id, games_updated, views_added, likes_added)
    VALUES (sched.id, total_games_updated, total_v, total_l);

  END LOOP;

  RETURN json_build_object('status', 'ok', 'processed_at', NOW());
END;
$$;
