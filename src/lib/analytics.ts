import { supabase } from './supabase'

// ── Platform Detection ────────────────────────────────────────────
export type Platform = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'other'

export function detectPlatform(): Platform {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const uaLower = ua.toLowerCase()

  // iOS — must check before macOS because iPad reports macOS in some UA
  if (/ipad|iphone|ipod/.test(uaLower) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }

  // Android
  if (/android/.test(uaLower)) {
    return 'android'
  }

  // macOS
  if (/macintosh|mac os x/.test(uaLower) && !/iphone|ipad/.test(uaLower)) {
    return 'macos'
  }

  // Windows
  if (/windows nt|win32|win64/.test(uaLower)) {
    return 'windows'
  }

  // Linux
  if (/linux/.test(uaLower)) {
    return 'linux'
  }

  return 'other'
}

// ── Device Model Detection (best-effort parsing from UA) ────────────
export function detectDeviceModel(): string {
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || ''
  const navAny = navigator as any

  // 1) Try client-hints (some Android/Chromium browsers expose `userAgentData.model`)
  try {
    const uaData = navAny.userAgentData
    if (uaData) {
      if (uaData.model && typeof uaData.model === 'string' && uaData.model.trim()) return uaData.model.trim()
      // Some browsers expose a brands/mobi info; fall back to platform string
      if (uaData.platform && typeof uaData.platform === 'string' && uaData.platform.trim()) {
        // example: "Android" or "iOS"
        // don't return platform only unless we have no other info
      }
    }
  } catch (err) {
    // ignore
  }

  // 2) iOS devices: best-effort label (model is rarely exposed in UA)
  if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && (navAny.maxTouchPoints || 0) > 1)) return 'iPad'
  if (/iPhone/.test(ua)) {
    // try to include iOS version if available
    const v = ua.match(/OS\s(\d+[_\d]*)/) || ua.match(/OS\s(\d+_\d+)/)
    return v && v[1] ? `iPhone iOS ${v[1].replace(/_/g, '.').trim()}` : 'iPhone'
  }

  // 3) Android — common UAs include model between the OS/version and 'Build/' token
  const androidMatch = ua.match(/Android[^;]*;\s*([^;\)]+)\s*(?:Build|AppleWebKit|\))/i)
  if (androidMatch && androidMatch[1]) {
    // Cleanup common noise
    const raw = androidMatch[1].replace(/;|Build|AppleWebKit/gi, '').trim()
    // Some UA pieces include manufacturer + model like 'SM-G991B' or 'Pixel 4a'
    return raw
  }

  // 4) Samsung device tokens (SM-XXXX)
  const sm = ua.match(/\b(SM-[A-Z0-9-]+)\b/i)
  if (sm && sm[1]) return sm[1]

  // 5) Pixel / Nexus explicit mentions
  const px = ua.match(/\b(Pixel [^;\)]+)\b/i)
  if (px && px[1]) return px[1].trim()

  // 6) Desktop fallbacks
  if (/Macintosh|Mac OS X/.test(ua)) return 'Mac'
  if (/Windows NT|Win32|Win64/.test(ua)) return 'Windows PC'
  if (/Linux/.test(ua)) return 'Linux'

  // 7) Last resort: short UA snippet
  const short = ua.split(')').shift() || ua
  return short.substring(0, 64)
}

// ── Site Visit Tracking ───────────────────────────────────────────
const SITE_VISIT_KEY = 'lap_site_visited'

/**
 * Track a site-wide page visit (once per browser session).
 * Stores in `site_views` table.
 */
export async function trackSiteVisit(): Promise<void> {
  try {
    // Prevent double-tracking in same browser session
    if (sessionStorage.getItem(SITE_VISIT_KEY)) return
    sessionStorage.setItem(SITE_VISIT_KEY, '1')

    const platform = detectPlatform()
    const device_model = detectDeviceModel()
    // Cast as any: Supabase client doesn't have types for analytics tables
    await (supabase as any).from('site_views').insert({ platform, device_model })
  } catch (err) {
    // Analytics should never break the app
    console.warn('Analytics: trackSiteVisit failed', err)
  }
}

// ── Game View Tracking ────────────────────────────────────────────
/**
 * Track a game page view by platform.
 * Uses upsert to increment platform-specific counter in `game_view_platforms`.
 * Also increments the legacy `view_count` on the games table.
 */
export async function trackGameView(gameId: string, currentViewCount: number): Promise<void> {
  try {
    const platform = detectPlatform()
    const device_model = detectDeviceModel()

    // Upsert into game_view_platforms (increment counter per platform)
    // keep legacy platform-level RPC
    await (supabase as any).rpc('increment_game_platform_view', {
      p_game_id: gameId,
      p_platform: platform,
    })

    // increment platform+device_model breakdown (new)
    try {
      await (supabase as any).rpc('increment_game_platform_model_view', {
        p_game_id: gameId,
        p_platform: platform,
        p_device_model: device_model,
      })
    } catch (err) {
      // If RPC not present, ignore to preserve backward compatibility
      // console.warn('Analytics: increment_game_platform_model_view missing', err)
    }

    // Also update legacy view_count on games table
    await (supabase as any)
      .from('games')
      .update({ view_count: currentViewCount + 1 })
      .eq('id', gameId)
  } catch (err) {
    console.warn('Analytics: trackGameView failed', err)
  }
}

// ── Analytics Queries ────────────────────────────────────────────
export interface PlatformStat {
  platform: Platform | string
  count: number
}

/** Get site-wide visits grouped by platform */
export async function getSitePlatformStats(): Promise<PlatformStat[]> {
  const { data, error } = await (supabase as any)
    .from('site_views')
    .select('platform')

  if (error || !data) return []

  const map: Record<string, number> = {}
  for (const row of (data as any[])) {
    map[row.platform] = (map[row.platform] || 0) + 1
  }

  return Object.entries(map)
    .map(([platform, count]) => ({ platform, count }))
    .sort((a, b) => b.count - a.count)
}

/** Get total site visits */
export async function getTotalSiteVisits(): Promise<number> {
  const { count } = await (supabase as any)
    .from('site_views')
    .select('id', { count: 'exact', head: true })
  return count || 0
}

/** Get platform breakdown for a specific game */
export async function getGamePlatformStats(gameId: string): Promise<PlatformStat[]> {
  const { data, error } = await (supabase as any)
    .from('game_view_platforms')
    .select('platform, view_count')
    .eq('game_id', gameId)

  if (error || !data) return []
  return (data as any[]).map(r => ({ platform: r.platform, count: r.view_count }))
    .sort((a, b) => b.count - a.count)
}

/** Get all games with their platform breakdown (for top games chart) */
export async function getAllGamesPlatformStats(): Promise<{ game_id: string; platform: string; view_count: number }[]> {
  const { data, error } = await (supabase as any)
    .from('game_view_platforms')
    .select('game_id, platform, view_count')

  if (error || !data) return []
  return data as any[]
}

/** Get site-wide visits grouped by platform + device_model */
export async function getSitePlatformModelStats(): Promise<{ platform: string; device_model: string; count: number }[]> {
  const { data, error } = await (supabase as any)
    .from('site_views')
    .select('platform, device_model')

  if (error || !data) return []

  const map: Record<string, number> = {}
  for (const row of (data as any[])) {
    const key = `${row.platform}||${row.device_model || ''}`
    map[key] = (map[key] || 0) + 1
  }

  return Object.entries(map).map(([k, count]) => {
    const [platform, device_model] = k.split('||')
    return { platform, device_model, count }
  }).sort((a, b) => b.count - a.count)
}

/** Get platform+device_model breakdown for a specific game */
export async function getGamePlatformModelStats(gameId: string): Promise<{ platform: string; device_model: string; count: number }[]> {
  const { data, error } = await (supabase as any)
    .from('game_view_platform_models')
    .select('platform, device_model, view_count')
    .eq('game_id', gameId)

  if (error || !data) return []
  return (data as any[]).map(r => ({ platform: r.platform, device_model: r.device_model, count: r.view_count }))
    .sort((a, b) => b.count - a.count)
}

/** Get all games with their platform+device_model breakdown (for top games chart) */
export async function getAllGamesPlatformModelStats(): Promise<{ game_id: string; platform: string; device_model: string; view_count: number }[]> {
  const { data, error } = await (supabase as any)
    .from('game_view_platform_models')
    .select('game_id, platform, device_model, view_count')

  if (error || !data) return []
  return data as any[]
}
