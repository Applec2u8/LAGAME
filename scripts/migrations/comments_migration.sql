-- Comments system migration
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('game', 'website')),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_approved BOOLEAN DEFAULT TRUE,
  author_token UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by game
CREATE INDEX IF NOT EXISTS idx_comments_game_id ON comments(game_id);
CREATE INDEX IF NOT EXISTS idx_comments_type ON comments(type);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read all comments (frontend handles filtering unapproved)
CREATE POLICY "Read all comments" ON comments
  FOR SELECT USING (TRUE);

-- Allow anyone to insert comments
CREATE POLICY "Insert comments" ON comments
  FOR INSERT WITH CHECK (TRUE);

-- Allow anon to update comments
CREATE POLICY "Update comments" ON comments
  FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- Allow anon to delete comments
CREATE POLICY "Delete comments" ON comments
  FOR DELETE USING (TRUE);

ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS author_token UUID;
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Create storage bucket for comment images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comment-images', 'comment-images', true) 
ON CONFLICT (id) DO NOTHING;

-- Storage policies for public access and uploads
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'comment-images');
CREATE POLICY "Public Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'comment-images');

