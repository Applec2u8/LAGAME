-- ============================================================
-- Translation Cache Table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

create table if not exists translation_cache (
  id           uuid default gen_random_uuid() primary key,
  game_id      uuid references games(id) on delete cascade not null,
  field_name   text not null check (field_name in ('description', 'sysreq_minimum', 'sysreq_recommended')),
  language     text not null check (language in ('th', 'lo')),
  translated   text not null,
  created_at   timestamptz default now()
);

-- Unique: one cache entry per (game, field, language)
create unique index if not exists idx_translation_cache_unique
  on translation_cache (game_id, field_name, language);

-- Index for fast lookups
create index if not exists idx_translation_cache_lookup
  on translation_cache (game_id, language);

-- RLS: Anyone can read cached translations
alter table translation_cache enable row level security;

create policy "public_read_translations"
  on translation_cache for select
  using (true);

create policy "public_insert_translations"
  on translation_cache for insert
  with check (true);
