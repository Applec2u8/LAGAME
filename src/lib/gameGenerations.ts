/**
 * gameGenerations.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * CRUD helpers for the `game_generations` cache table.
 * Used by the Admin AI Auto-Fill feature to avoid redundant API calls.
 */

import { supabase } from './supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GameGenerationRecord {
  id: string
  game_title: string
  genres: string[]
  platforms: string[]
  file_size: string
  description: string
  cover_image: string
  screenshots: string[]
  video_url: string
  minimum_requirements: string
  recommended_requirements: string
  steam_app_id: number | null
  is_featured: boolean
  cached_download_links: { cloud_name: string; url: string; platform: string }[] | null
  created_at: string
  updated_at: string
}

export type GameGenerationInsert = Omit<GameGenerationRecord, 'id' | 'created_at' | 'updated_at'>

// ─── Search (autocomplete) ────────────────────────────────────────────────────

/**
 * Returns up to `limit` cached entries whose title contains `query` (case-insensitive).
 * Uses pg_trgm ILIKE for fast partial matching.
 */
export async function searchGameGenerations(
  query: string,
  limit = 6
): Promise<GameGenerationRecord[]> {
  if (!query || query.trim().length < 2) return []

  const { data, error } = await (supabase as any)
    .from('game_generations')
    .select('*')
    .ilike('game_title', `%${query.trim()}%`)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('gameGenerations.search error:', error)
    return []
  }

  return (data as GameGenerationRecord[]) ?? []
}

// ─── Get by exact title ───────────────────────────────────────────────────────

export async function getGameGenerationByTitle(
  title: string
): Promise<GameGenerationRecord | null> {
  const { data, error } = await (supabase as any)
    .from('game_generations')
    .select('*')
    .ilike('game_title', title.trim())
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('gameGenerations.getByTitle error:', error)
    return null
  }

  return (data as GameGenerationRecord) ?? null
}

// ─── Upsert (save / update) ──────────────────────────────────────────────────

/**
 * Inserts a new record or updates an existing one with the same `game_title`.
 * Call this after a successful AI generation + Apply & Fetch Images.
 */
export async function upsertGameGeneration(
  payload: GameGenerationInsert
): Promise<void> {
  const { error } = await (supabase as any)
    .from('game_generations')
    .upsert(
      { ...payload, game_title: payload.game_title.trim() },
      { onConflict: 'game_title', ignoreDuplicates: false }
    )

  if (error) {
    console.error('gameGenerations.upsert error:', error)
  }
}
