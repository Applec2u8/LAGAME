export const onRequest: PagesFunction = async ({ request, params }) => {
  const path = params.path
  let pathStr = ''
  if (Array.isArray(path)) {
    pathStr = path.join('/')
  } else if (path) {
    pathStr = path
  }

  const url = new URL(request.url)
  const targetUrl = `https://store.steampowered.com/${pathStr}${url.search}`

  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'th,en;q=0.9',
      },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Steam API returned ${res.status}` }), {
        status: res.status,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      })
    }

    // Pass through Content-Type, e.g. application/json
    const contentType = res.headers.get('Content-Type') || 'application/json'
    const body = await res.arrayBuffer()

    return new Response(body, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    })
  }
}
