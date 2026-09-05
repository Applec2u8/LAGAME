// Cloudflare Pages Function — server-side proxy for Epic Games free games API
// Runs at /api/epic on both dev (via Vite proxy) and production (Cloudflare Pages)

export const onRequest: PagesFunction = async () => {
  const EPIC_URL =
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=th&country=TH&allowCountries=TH'

  try {
    const res = await fetch(EPIC_URL, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'th,en;q=0.9',
        Origin: 'https://store.epicgames.com',
        Referer: 'https://store.epicgames.com/',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Epic API returned ${res.status}` }), {
        status: res.status,
        headers: corsHeaders(),
      })
    }

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders(),
        'Cache-Control': 'public, max-age=3600', // cache 1h at edge
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: corsHeaders(),
    })
  }
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }
}
