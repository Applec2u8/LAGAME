// Cloudflare Pages Function — GET /api/sgdb
// Runs server-side on Cloudflare Edge — SteamGridDB API key NEVER exposed to client
// Usage: GET /api/sgdb?name=Tomb+Raider  OR  GET /api/sgdb?steam_id=391220

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

const SGDB_BASE = 'https://www.steamgriddb.com/api/v2'

export async function onRequestGet(context: any) {
  // Handle CORS preflight
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const url = new URL(context.request.url)
  const gameName = url.searchParams.get('name') || ''
  const steamId = url.searchParams.get('steam_id') || ''

  if (!gameName && !steamId) {
    return new Response(
      JSON.stringify({ error: 'Provide ?name= or ?steam_id= param' }),
      { status: 400, headers: CORS }
    )
  }

  // 1. Get SteamGridDB API key from Supabase
  const supabaseUrl = context.env?.VITE_SUPABASE_URL
    || 'https://srwttqkjygzraqqnqesl.supabase.co'
  const supabaseKey = context.env?.VITE_SUPABASE_ANON_KEY
    || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

  let apiKey: string | null = null
  try {
    const keyRes = await fetch(
      `${supabaseUrl}/rest/v1/gemini_api_keys?is_active=eq.true&category=eq.steamgriddb&limit=1`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const keys = await keyRes.json()
    if (Array.isArray(keys) && keys.length > 0) {
      apiKey = keys[0].api_key
    }
  } catch (e) {
    console.error('Supabase key fetch failed:', e)
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'No SteamGridDB API key configured', cover: null, screenshots: [] }),
      { status: 200, headers: CORS }
    )
  }

  const sgdbHeaders = { Authorization: `Bearer ${apiKey}` }

  try {
    let gameId: number | null = null

    // 2a. Look up by Steam App ID (most accurate)
    if (steamId) {
      const res = await fetch(`${SGDB_BASE}/games/steam/${steamId}`, { headers: sgdbHeaders })
      if (res.ok) {
        const json: any = await res.json()
        if (json.success && json.data?.id) gameId = json.data.id
      }
    }

    // 2b. Fallback: search by name
    if (!gameId && gameName) {
      const res = await fetch(
        `${SGDB_BASE}/search/autocomplete/${encodeURIComponent(gameName)}`,
        { headers: sgdbHeaders }
      )
      if (res.ok) {
        const json: any = await res.json()
        if (json.success && json.data?.length > 0) gameId = json.data[0].id
      }
    }

    if (!gameId && !steamId) {
      return new Response(
        JSON.stringify({ cover: null, screenshots: [], error: `Game not found: ${gameName || steamId}` }),
        { status: 200, headers: CORS }
      )
    }

    // 3. Cover: prefer official Steam CDN (colorful box art) over SteamGridDB fan art
    let cover: string | null = null
    if (steamId) {
      // Steam CDN always has the official library art
      cover = `https://cdn.akamai.steamstatic.com/steam/apps/${steamId}/library_600x900.jpg`
    } else if (gameId) {
      // No steam_id: fallback to SteamGridDB portrait grid
      const coverRes = await fetch(`${SGDB_BASE}/grids/game/${gameId}?dimensions=600x900&limit=1`, { headers: sgdbHeaders })
      if (coverRes.ok) {
        const coverJson: any = await coverRes.json()
        if (coverJson.success && coverJson.data?.length > 0) cover = coverJson.data[0].url
      }
    }

    // 4. Screenshots: real gameplay shots from Steam Store API (server-side, no CORS)
    let screenshots: string[] = []
    const steamAppId = steamId || null

    if (steamAppId) {
      try {
        const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&filters=screenshots`
        const steamRes = await fetch(steamUrl)
        if (steamRes.ok) {
          const steamData: any = await steamRes.json()
          const appData = steamData[steamAppId]?.data
          if (appData?.screenshots?.length > 0) {
            screenshots = appData.screenshots.slice(0, 10).map((s: any) => s.path_full)
          }
        }
      } catch (e) {
        console.error('Steam Store API error:', e)
      }
    }

    // Fallback: SteamGridDB heroes if Steam gave no screenshots
    if (screenshots.length === 0 && gameId) {
      const heroRes = await fetch(`${SGDB_BASE}/heroes/game/${gameId}?limit=8`, { headers: sgdbHeaders })
      if (heroRes.ok) {
        const heroJson: any = await heroRes.json()
        if (heroJson.success && heroJson.data?.length > 0) {
          screenshots = heroJson.data.map((item: any) => item.url)
        }
      }
    }

    return new Response(
      JSON.stringify({ cover, screenshots, gameId }),
      { status: 200, headers: CORS }
    )
  } catch (e: any) {
    console.error('SteamGridDB error:', e)
    return new Response(
      JSON.stringify({ error: e.message, cover: null, screenshots: [] }),
      { status: 500, headers: CORS }
    )
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS })
}
