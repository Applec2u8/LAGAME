-- ===================================================
-- LAPACK-Game Supabase Database Schema
-- Run this in Supabase SQL Editor
-- ===================================================

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  cover_image TEXT,
  screenshots JSONB DEFAULT '[]',
  video_url TEXT,
  file_size TEXT,
  system_requirements JSONB DEFAULT '{
    "minimum": {"os":"","cpu":"","ram":"","gpu":"","storage":""},
    "recommended": {"os":"","cpu":"","ram":"","gpu":"","storage":""}
  }',
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  category_ids UUID[] DEFAULT '{}',
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Download links table
CREATE TABLE IF NOT EXISTS download_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  cloud_name TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad settings table
CREATE TABLE IF NOT EXISTS ad_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_url TEXT NOT NULL DEFAULT '',
  countdown_seconds INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default ad settings row
INSERT INTO ad_settings (ad_url, countdown_seconds, is_active)
VALUES ('', 10, false)
ON CONFLICT DO NOTHING;

-- Seed some default categories
INSERT INTO categories (name, slug) VALUES
  ('Action', 'action'),
  ('Adventure', 'adventure'),
  ('RPG', 'rpg'),
  ('Strategy', 'strategy'),
  ('Sports', 'sports'),
  ('Racing', 'racing'),
  ('Simulation', 'simulation'),
  ('Horror', 'horror'),
  ('Shooter', 'shooter'),
  ('Fighting', 'fighting'),
  ('Puzzle', 'puzzle'),
  ('Arcade', 'arcade')
ON CONFLICT DO NOTHING;

-- Enable Row Level Security (for public read access)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE download_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_settings ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can read games" ON games FOR SELECT USING (true);
CREATE POLICY "Public can read download_links" ON download_links FOR SELECT USING (true);
CREATE POLICY "Public can read ad_settings" ON ad_settings FOR SELECT USING (true);

-- Allow all operations via anon key (admin uses same key — replace with proper auth in production)
CREATE POLICY "Anon full access categories" ON categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access download_links" ON download_links FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access ad_settings" ON ad_settings FOR ALL USING (true) WITH CHECK (true);

-- ===================================================
-- ANALYTICS TABLES (run these separately if schema already exists)
-- ===================================================

-- Site-wide page visits (1 row per visit session)
CREATE TABLE IF NOT EXISTS site_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'other',   -- 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'other'
  visited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Game views aggregated by platform (upsert increments counter)
CREATE TABLE IF NOT EXISTS game_view_platforms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform TEXT NOT NULL DEFAULT 'other',
  view_count INTEGER DEFAULT 1,
  UNIQUE(game_id, platform)
);

-- Enable RLS on analytics tables
ALTER TABLE site_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_view_platforms ENABLE ROW LEVEL SECURITY;

-- Public read (for admin dashboard)
CREATE POLICY "Public can read site_views" ON site_views FOR SELECT USING (true);
CREATE POLICY "Public can read game_view_platforms" ON game_view_platforms FOR SELECT USING (true);

-- Anon insert (visitors write their own rows)
CREATE POLICY "Anon can insert site_views" ON site_views FOR INSERT WITH CHECK (true);

-- Anon full access for game_view_platforms (needed for upsert)
CREATE POLICY "Anon full access game_view_platforms" ON game_view_platforms FOR ALL USING (true) WITH CHECK (true);

-- ───────────────────────────────────────────────────────────────────
-- Stored procedure: increment game platform view count (atomic upsert)
-- ───────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_game_platform_view(p_game_id UUID, p_platform TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO game_view_platforms (game_id, platform, view_count)
  VALUES (p_game_id, p_platform, 1)
  ON CONFLICT (game_id, platform)
  DO UPDATE SET view_count = game_view_platforms.view_count + 1;
END;
$$;

-- ===================================================
-- SUPPORT CHAT TABLES
-- ===================================================

-- One row per user support session (identified by localStorage token)
CREATE TABLE IF NOT EXISTS support_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_label TEXT NOT NULL DEFAULT 'ผู้ใช้ไม่ระบุตัวตน',
  platform TEXT NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  is_read_by_admin BOOLEAN DEFAULT FALSE,
  message_count INTEGER DEFAULT 0
);

-- Every message in a session (role: 'user' | 'admin')
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES support_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'admin')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin notification settings (email to notify when user contacts)
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notify_email TEXT NOT NULL DEFAULT 'peun955@gmail.com',
  notify_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
INSERT INTO notification_settings (notify_email, notify_enabled)
VALUES ('peun955@gmail.com', true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Public read/write for support (users need to create sessions and messages)
CREATE POLICY "Anon full access support_sessions" ON support_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Anon full access support_messages" ON support_messages FOR ALL USING (true) WITH CHECK (true);
-- Only admin (anon key) reads notification settings
CREATE POLICY "Anon can read notification_settings" ON notification_settings FOR SELECT USING (true);
CREATE POLICY "Anon can update notification_settings" ON notification_settings FOR UPDATE USING (true) WITH CHECK (true);

-- Enable Realtime on support tables (run in Supabase dashboard if needed)
ALTER PUBLICATION supabase_realtime ADD TABLE support_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;

-- Add attachment columns to support_messages
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE support_messages ADD COLUMN IF NOT EXISTS attachment_type TEXT; -- 'image' or 'file'

-- ===================================================
-- STORAGE BUCKET FOR CHAT ATTACHMENTS
-- ===================================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_attachments', 'chat_attachments', true) 
ON CONFLICT (id) DO NOTHING;

-- Public access to chat attachments
CREATE POLICY "Anon can view chat attachments" ON storage.objects FOR SELECT USING (bucket_id = 'chat_attachments');
CREATE POLICY "Anon can upload chat attachments" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'chat_attachments');

-- ===================================================
-- CHATBOT SETTINGS
-- ===================================================
CREATE TABLE IF NOT EXISTS chatbot_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enable_text BOOLEAN DEFAULT TRUE,
  enable_voice BOOLEAN DEFAULT FALSE,
  enable_image BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default row
INSERT INTO chatbot_settings (enable_text, enable_voice, enable_image)
VALUES (true, false, false)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE chatbot_settings ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read chatbot_settings" ON chatbot_settings FOR SELECT USING (true);
CREATE POLICY "Anon full access chatbot_settings" ON chatbot_settings FOR ALL USING (true) WITH CHECK (true);
