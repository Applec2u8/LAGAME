/**
 * SteamGridDB helper — calls our own /api/sgdb serverless function
 * so the API key & CORS stay on the server side (Cloudflare Edge).
 *
 * In local dev (localhost) the Cloudflare function isn't available, so
 * we gracefully return empty results and fall through to Steam CDN fallback.
 */

const SGDB_ENDPOINT = '/api/sgdb'

async function callSgdbProxy(params: Record<string, string>): Promise<{ cover: string | null; screenshots: string[] }> {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${SGDB_ENDPOINT}?${qs}`)
  if (!res.ok) throw new Error(`SGDB proxy ${res.status}`)
  return res.json()
}

/**
 * One-stop function: Given a game name and optional Steam App ID,
 * returns the best cover + hero screenshots from SteamGridDB via server proxy.
 */
export async function fetchSteamGridDbImages(
  gameName: string,
  steamAppId?: number
): Promise<{ cover: string | null; screenshots: string[] }> {
  const params: Record<string, string> = {}
  if (steamAppId) params.steam_id = String(steamAppId)
  else if (gameName) params.name = gameName

  if (!params.steam_id && !params.name) {
    return { cover: null, screenshots: [] }
  }

  try {
    const result = await callSgdbProxy(params)
    return {
      cover: result.cover || null,
      screenshots: result.screenshots || [],
    }
  } catch (e) {
    // In local dev, the /api/sgdb function doesn't exist — fail silently
    console.warn('SteamGridDB proxy unavailable (expected in local dev):', e)
    return { cover: null, screenshots: [] }
  }
}
