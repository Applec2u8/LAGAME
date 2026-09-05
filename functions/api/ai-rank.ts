// Cloudflare Pages Function — POST /api/ai-rank
// New lightweight strategy: Ask AI for top game names → fuzzy-match in DB → update ranks

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// GET /api/ai-rank?mode=preview — fetch top games from SteamSpy server-side
export async function onRequestGet(context: any) {
  try {
    const res = await fetch('https://steamspy.com/api.php?request=top100in2weeks', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (!res.ok) throw new Error('SteamSpy fetch failed')
    const data: any = await res.json()
    const names = Object.values(data)
      .sort((a: any, b: any) => (b.players_2weeks || 0) - (a.players_2weeks || 0))
      .slice(0, 25)
      .map((g: any) => g.name)
    return new Response(JSON.stringify({ games: names }), { headers: CORS })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: CORS })
  }
}

async function callGeminiForTopNames(apiKeys: any[]): Promise<string[]> {
  const prompt = `List the TOP 10 most popular PC games right now (globally trending).
Return ONLY a JSON array of game title strings, ordered from most popular (#1) to least (#10).
Do NOT add explanations or markdown. Plain JSON array only.
Example: ["Elden Ring","Cyberpunk 2077","GTA V","Minecraft"]`

  for (let i = 0; i < apiKeys.length; i++) {
    const keyRecord = apiKeys[i]
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${keyRecord.api_key}`
    
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
        })
      })

      const data: any = await res.json()

      if (res.status === 429 || data.error?.code === 429 || data.error?.message?.includes('Quota exceeded')) {
        // Mark key on cooldown in Supabase (best effort, no await to speed things up)
        console.warn(`Key ${keyRecord.id} quota exceeded`)
        if (i === apiKeys.length - 1) throw new Error('Quota Exceeded on all keys')
        continue
      }

      if (data.error) throw new Error(data.error.message || 'Gemini error')

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) throw new Error('EMPTY_RESPONSE')

      const parsed = JSON.parse(text)
      if (!Array.isArray(parsed)) throw new Error('Not an array')
      return parsed.slice(0, 10)

    } catch (e: any) {
      if (i === apiKeys.length - 1) throw e
    }
  }

  throw new Error('All keys failed')
}

export async function onRequestPost(context: any) {
  try {
    const supabaseUrl = context.env?.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const supabaseKey = context.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

    // 1. Fetch active API keys
    const keysRes = await fetch(
      `${supabaseUrl}/rest/v1/gemini_api_keys?is_active=eq.true&order=created_at.asc`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const allKeys: any[] = await keysRes.json()
    if (!allKeys || allKeys.length === 0) throw new Error('No Gemini API key found')

    const now = Date.now()
    const availableKeys = allKeys.filter((k: any) => !k.cooldown_until || new Date(k.cooldown_until).getTime() < now)
    if (availableKeys.length === 0) throw new Error('Quota Exceeded')

    // 2. Ask Gemini for top game names (tiny prompt — very few tokens!)
    const aiGameNames = await callGeminiForTopNames(availableKeys)

    // 3. Fetch all game titles from DB for matching
    const gamesRes = await fetch(
      `${supabaseUrl}/rest/v1/games?select=id,title`,
      { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
    )
    const allGames: any[] = await gamesRes.json()
    if (!allGames || allGames.length === 0) throw new Error('No games found in DB')

    // 4. Fuzzy-match AI names to DB games
    const matched: { id: string; rank: number }[] = []
    for (let rank = 0; rank < aiGameNames.length && matched.length < 10; rank++) {
      const aiName = aiGameNames[rank].toLowerCase()
      const found = allGames.find((g: any) =>
        g.title.toLowerCase() === aiName ||
        g.title.toLowerCase().includes(aiName) ||
        aiName.includes(g.title.toLowerCase())
      )
      if (found && !matched.find(m => m.id === found.id)) {
        matched.push({ id: found.id, rank: matched.length + 1 })
      }
    }

    if (matched.length === 0) {
      throw new Error(`AI suggested: [${aiGameNames.slice(0,3).join(', ')}...] but none matched DB titles`)
    }

    // 5. Reset all ai_rank and set new ranks
    await fetch(`${supabaseUrl}/rest/v1/games?ai_rank=not.is.null`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ ai_rank: null })
    })

    for (const m of matched) {
      await fetch(`${supabaseUrl}/rest/v1/games?id=eq.${m.id}`, {
        method: 'PATCH',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal'
        },
        body: JSON.stringify({ ai_rank: m.rank })
      })
    }

    // 6. Update system_settings
    const settingsRes = await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.ai_ranking`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    })
    const settingsData = await settingsRes.json()
    const currentVal = settingsData?.[0]?.value || { schedule: 'manual' }
    currentVal.last_run = new Date().toISOString()
    currentVal.ai_suggestions = aiGameNames
    currentVal.matched_count = matched.length

    await fetch(`${supabaseUrl}/rest/v1/system_settings?key=eq.ai_ranking`, {
      method: 'PATCH',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({ value: currentVal })
    })

    return new Response(JSON.stringify({
      success: true,
      ai_suggestions: aiGameNames,
      matched: matched.length
    }), { headers: CORS })

  } catch (e: any) {
    console.error(e)
    return new Response(JSON.stringify({
      error: 'server_error',
      message: e.message
    }), { status: 500, headers: CORS })
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
