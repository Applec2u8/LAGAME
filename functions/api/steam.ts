export const onRequest: PagesFunction = async () => {
  const STEAM_URL = 'https://store.steampowered.com/search/results?filter=popularwishlist&os=win&infinite=1'

  try {
    const res = await fetch(STEAM_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'th,en;q=0.9',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Steam API returned ${res.status}` }), {
        status: res.status,
        headers: corsHeaders(),
      })
    }

    const html = await res.text()

    return new Response(JSON.stringify({ contents: html }), {
      headers: {
        ...corsHeaders(),
        'Cache-Control': 'public, max-age=3600',
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
