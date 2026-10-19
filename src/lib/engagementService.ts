import { supabase, type Game } from './supabase'

const LIKES_CACHE_KEY = 'la_game_likes_store_v1'
const USER_LIKED_GAMES_KEY = 'la_game_user_liked_v1'

export interface EngagementMetrics {
  views: number
  likes: number
}

export interface AutoBoostConfig {
  mode: 'increment' | 'multiplier'
  viewIncrementMin: number
  viewIncrementMax: number
  likeIncrementMin: number
  likeIncrementMax: number
  multiplier?: number
}

// ── Local / Synced Likes Store (handles seamless fallback if column not yet added to SQL) ──

function getLikesStore(): Record<string, number> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LIKES_CACHE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveCachedLike(gameId: string, likes: number) {
  if (typeof window === 'undefined') return
  try {
    const store = getLikesStore()
    store[gameId] = Math.max(0, likes)
    localStorage.setItem(LIKES_CACHE_KEY, JSON.stringify(store))
    window.dispatchEvent(new CustomEvent('la_game_metrics_updated', {
      detail: { gameId, likes: store[gameId] }
    }))
  } catch {
    // Ignore storage quota errors
  }
}

export function getCachedLikes(gameId: string): number | null {
  const store = getLikesStore()
  return typeof store[gameId] === 'number' ? store[gameId] : null
}

// ── Public Helper Getters ──

export function getEffectiveViews(game?: Partial<Game> | null): number {
  if (!game) return 0
  if (typeof game.views_count === 'number' && !isNaN(game.views_count)) {
    return Math.max(0, game.views_count)
  }
  if (typeof game.view_count === 'number' && !isNaN(game.view_count)) {
    return Math.max(0, game.view_count)
  }
  return 0
}

export function getEffectiveLikes(game?: Partial<Game> | null): number {
  if (!game || !game.id) return 0
  if (typeof game.likes_count === 'number' && !isNaN(game.likes_count)) {
    return Math.max(0, game.likes_count)
  }
  if (typeof (game as any).like_count === 'number' && !isNaN((game as any).like_count)) {
    return Math.max(0, (game as any).like_count)
  }
  const cached = getCachedLikes(game.id)
  if (cached !== null) return cached
  return 0
}

// ── User Like Management for Public Frontend ──

export function isGameLikedByUser(gameId: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = localStorage.getItem(USER_LIKED_GAMES_KEY)
    const set: string[] = raw ? JSON.parse(raw) : []
    return set.includes(gameId)
  } catch {
    return false
  }
}

export async function toggleUserGameLike(gameId: string, currentLikes: number): Promise<{ liked: boolean; newLikes: number }> {
  const currentlyLiked = isGameLikedByUser(gameId)
  const newLikedState = !currentlyLiked
  const newLikes = Math.max(0, currentLikes + (newLikedState ? 1 : -1))

  try {
    const raw = localStorage.getItem(USER_LIKED_GAMES_KEY)
    let list: string[] = raw ? JSON.parse(raw) : []
    if (newLikedState) {
      if (!list.includes(gameId)) list.push(gameId)
    } else {
      list = list.filter(id => id !== gameId)
    }
    localStorage.setItem(USER_LIKED_GAMES_KEY, JSON.stringify(list))
  } catch { }

  saveCachedLike(gameId, newLikes)

  // Try updating Supabase column if it exists
  try {
    await (supabase as any)
      .from('games')
      .update({ likes_count: newLikes })
      .eq('id', gameId)
  } catch {
    // Graceful fallback
  }

  return { liked: newLikedState, newLikes }
}

// ── Admin Update Functions ──

export interface MetricUpdateResult {
  success: boolean
  hasLikesColumn: boolean
  hasViewsColumn: boolean
  error?: string
}

/**
 * Safely update a single game's views and likes in Supabase.
 * Automatically tries full columns (views_count, likes_count, view_count)
 * and falls back gracefully to view_count if schema does not yet have views_count/likes_count.
 */
export async function updateGameMetrics(
  gameId: string,
  metrics: { views: number; likes: number }
): Promise<MetricUpdateResult> {
  const safeViews = Math.max(0, Math.round(metrics.views))
  const safeLikes = Math.max(0, Math.round(metrics.likes))

  // Always cache like count locally for instantaneous frontend reflection
  saveCachedLike(gameId, safeLikes)

  let hasLikesColumn = true
  let hasViewsColumn = true

  // Attempt 1: Update all 3 column representations for maximum compatibility
  const { error: fullError } = await (supabase as any)
    .from('games')
    .update({
      view_count: safeViews,
      views_count: safeViews,
      likes_count: safeLikes,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId)

  if (!fullError) {
    window.dispatchEvent(new CustomEvent('la_game_metrics_updated', {
      detail: { gameId, views: safeViews, likes: safeLikes }
    }))
    return { success: true, hasLikesColumn: true, hasViewsColumn: true }
  }

  // If full update failed due to missing columns, inspect error and adapt
  const errMsg = fullError.message || ''
  if (errMsg.includes('likes_count')) hasLikesColumn = false
  if (errMsg.includes('views_count')) hasViewsColumn = false

  // Fallback 1: Try view_count and likes_count if views_count is the only missing one
  if (!hasViewsColumn && hasLikesColumn) {
    const { error: subErr1 } = await (supabase as any)
      .from('games')
      .update({
        view_count: safeViews,
        likes_count: safeLikes,
        updated_at: new Date().toISOString()
      })
      .eq('id', gameId)

    if (!subErr1) {
      window.dispatchEvent(new CustomEvent('la_game_metrics_updated', {
        detail: { gameId, views: safeViews, likes: safeLikes }
      }))
      return { success: true, hasLikesColumn: true, hasViewsColumn: false }
    }
  }

  // Fallback 2: Legacy fallback to standard view_count (always succeeds on default games schema)
  const { error: fallbackErr } = await (supabase as any)
    .from('games')
    .update({
      view_count: safeViews,
      updated_at: new Date().toISOString()
    })
    .eq('id', gameId)

  if (fallbackErr) {
    return {
      success: false,
      hasLikesColumn: false,
      hasViewsColumn: false,
      error: fallbackErr.message
    }
  }

  window.dispatchEvent(new CustomEvent('la_game_metrics_updated', {
    detail: { gameId, views: safeViews, likes: safeLikes }
  }))

  return {
    success: true,
    hasLikesColumn: false,
    hasViewsColumn: false
  }
}

/**
 * Batch update multiple games at once
 */
export async function batchUpdateGameMetrics(
  gameUpdates: Array<{ id: string; views: number; likes: number }>
): Promise<{ successCount: number; failureCount: number }> {
  let successCount = 0
  let failureCount = 0

  for (const item of gameUpdates) {
    try {
      const res = await updateGameMetrics(item.id, { views: item.views, likes: item.likes })
      if (res.success) successCount++
      else failureCount++
    } catch {
      failureCount++
    }
  }

  return { successCount, failureCount }
}

/**
 * Calculate automated boost metrics based on configuration
 */
export function calculateAutoBoost(
  currentViews: number,
  currentLikes: number,
  config: AutoBoostConfig
): EngagementMetrics {
  if (config.mode === 'multiplier' && config.multiplier) {
    return {
      views: Math.round(currentViews * config.multiplier),
      likes: Math.round(currentLikes * config.multiplier)
    }
  }

  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (Math.max(min, max) - Math.min(min, max) + 1)) + Math.min(min, max)

  const viewBoost = randInt(config.viewIncrementMin, config.viewIncrementMax)
  const likeBoost = randInt(config.likeIncrementMin, config.likeIncrementMax)

  return {
    views: currentViews + Math.max(0, viewBoost),
    likes: currentLikes + Math.max(0, likeBoost)
  }
}
