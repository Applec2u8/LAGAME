-- ===================================================
-- Migration: Add Chatbot Settings Table
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

-- Admin (Anon) full access
CREATE POLICY "Anon full access chatbot_settings" ON chatbot_settings FOR ALL USING (true) WITH CHECK (true);
