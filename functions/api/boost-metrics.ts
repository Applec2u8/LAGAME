// Cloudflare Pages Function — POST /api/boost-metrics
// Safely updates views_count, view_count, and likes_count on games table

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-pin',
  'Content-Type': 'application/json',
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS })
}

export async function onRequestPost({ request, env }: { request: Request; env: Record<string, string> }): Promise<Response> {
  try {
    const sbUrl = env.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const sbKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

    const body = await request.json() as {
      gameId?: string
      updates?: Array<{ id: string; views: number; likes: number }>
      views?: number
      likes?: number
    }

    const itemsToUpdate = body.updates && Array.isArray(body.updates)
      ? body.updates
      : body.gameId && (body.views !== undefined || body.likes !== undefined)
      ? [{ id: body.gameId, views: Number(body.views ?? 0), likes: Number(body.likes ?? 0) }]
      : []

    if (itemsToUpdate.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing gameId or updates list' }), {
        status: 400,
        headers: CORS
      })
    }

    const results = []

    for (const item of itemsToUpdate) {
      const views = Math.max(0, Math.round(Number(item.views || 0)))
      const likes = Math.max(0, Math.round(Number(item.likes || 0)))

      // Attempt 1: Update with full columns
      let updateRes = await fetch(`${sbUrl}/rest/v1/games?id=eq.${item.id}`, {
        method: 'PATCH',
        headers: {
          apikey: sbKey,
          Authorization: `Bearer ${sbKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          view_count: views,
          views_count: views,
          likes_count: likes,
          updated_at: new Date().toISOString()
        })
      })

      // If schema error (e.g. likes_count or views_count missing in table), fallback to view_count
      if (!updateRes.ok) {
        updateRes = await fetch(`${sbUrl}/rest/v1/games?id=eq.${item.id}`, {
          method: 'PATCH',
          headers: {
            apikey: sbKey,
            Authorization: `Bearer ${sbKey}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation'
          },
          body: JSON.stringify({
            view_count: views,
            updated_at: new Date().toISOString()
          })
        })
      }

      results.push({
        id: item.id,
        success: updateRes.ok,
        status: updateRes.status
      })
    }

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), {
      status: 200,
      headers: CORS
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || 'Internal server error' }), {
      status: 500,
      headers: CORS
    })
  }
}
