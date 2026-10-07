// Cloudflare Pages Function — POST /api/ai-rank
// Routing-aware: reads api_key_routing for 'ai_ranking' feature → provider category
// Supports Gemini + Groq with automatic key rotation & fallback

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// ─── Supabase helper ──────────────────────────────────────────────────────────

async function sbFetch(url: string, key: string, path: string, opts?: RequestInit): Promise<any> {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(opts?.headers || {})
    }
  })
  const text = await res.text()
  try { return JSON.parse(text) } catch { return null }
}

// ─── Routing helpers ──────────────────────────────────────────────────────────

async function getRoutedCategory(sbUrl: string, sbKey: string, feature: string): Promise<string> {
  try {
    const data = await sbFetch(sbUrl, sbKey, `api_key_routing?feature=eq.${feature}&select=category&limit=1`)
    if (Array.isArray(data) && data[0]?.category) return data[0].category
  } catch (_) {}
  return 'gemini'
}

async function getAvailableKeys(sbUrl: string, sbKey: string, category: string): Promise<any[]> {
  const data = await sbFetch(
    sbUrl, sbKey,
    `gemini_api_keys?is_active=eq.true&category=eq.${encodeURIComponent(category)}&order=created_at.asc`
  )
  const now = Date.now()
  return (Array.isArray(data) ? data : []).filter(
    (k: any) => !k.cooldown_until || new Date(k.cooldown_until).getTime() < now
  )
}

async function setCooldown(sbUrl: string, sbKey: string, id: string, durationMs: number) {
  const until = new Date(Date.now() + durationMs).toISOString()
  await sbFetch(sbUrl, sbKey, `gemini_api_keys?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ cooldown_until: until })
  })
}

// ─── Provider calls ────────────────────────────────────────────────────────────

const TOP_GAMES_PROMPT = `List the TOP 10 most popular PC games right now (globally trending).
Return ONLY a JSON array of game title strings, ordered from most popular (#1) to least (#10).
Do NOT add explanations or markdown. Plain JSON array only.
Example: ["Elden Ring","Cyberpunk 2077","GTA V","Minecraft"]`

async function callGeminiForTopNames(key: any): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${key.model || 'gemini-2.0-flash'}:generateContent?key=${key.api_key}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: TOP_GAMES_PROMPT }] }],
      generationConfig: { temperature: 0.3, responseMimeType: 'application/json' }
    })
  })

  const data: any = await res.json()

  if (res.status === 429 || data.error?.code === 429 || data.error?.message?.includes('Quota')) {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (data.error) throw new Error(data.error.message || 'Gemini error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('EMPTY_RESPONSE')

  const parsed = JSON.parse(text)
  if (!Array.isArray(parsed)) throw new Error('Not an array')
  return parsed.slice(0, 10)
}

async function callGroqForTopNames(key: any): Promise<string[]> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.api_key}`
    },
    body: JSON.stringify({
      model: key.model || 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: TOP_GAMES_PROMPT }],
      temperature: 0.3,
      max_tokens: 512
    })
  })

  const data: any = await res.json()

  if (res.status === 429 || data.error?.code === 'rate_limit_exceeded') {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (!res.ok || data.error) throw new Error(data.error?.message || `Groq error ${res.status}`)

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('EMPTY_RESPONSE')

  // Strip any markdown fences
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const parsed = JSON.parse(clean)
  if (!Array.isArray(parsed)) throw new Error('Not an array')
  return parsed.slice(0, 10)
}

// ─── Key rotation wrapper ─────────────────────────────────────────────────────

async function fetchTopNamesWithRotation(
  keys: any[],
  category: string,
  sbUrl: string,
  sbKey: string
): Promise<string[]> {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    try {
      let names: string[]
      if (category === 'groq') {
        names = await callGroqForTopNames(key)
      } else {
        names = await callGeminiForTopNames(key)
      }
      return names
    } catch (e: any) {
      console.warn(`[ai-rank] Key "${key.name}" error: ${e.message}`)
      if (e.message === 'QUOTA_EXCEEDED') {
        await setCooldown(sbUrl, sbKey, key.id, 24 * 60 * 60 * 1000)
      }
      if (i === keys.length - 1) throw e
    }
  }
  throw new Error('All keys failed')
}

// ─── GET handler (preview mode) ───────────────────────────────────────────────

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

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function onRequestPost(context: any) {
  try {
    const sbUrl = context.env?.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const sbKey = context.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

    // 1. Determine provider category for ai_ranking feature
    const category = await getRoutedCategory(sbUrl, sbKey, 'ai_ranking')

    // 2. Fetch available keys for that category
    let keys = await getAvailableKeys(sbUrl, sbKey, category)

    // 3. Graceful fallback to gemini if needed
    if (keys.length === 0 && category !== 'gemini') {
      console.warn(`[ai-rank] No keys for "${category}", falling back to gemini`)
      keys = await getAvailableKeys(sbUrl, sbKey, 'gemini')
    }

    if (keys.length === 0) throw new Error(`No available API keys for category "${category}"`)

    // 4. Ask AI for top game names with key rotation
    const effectiveCategory = keys[0].category || category
    const aiGameNames = await fetchTopNamesWithRotation(keys, effectiveCategory, sbUrl, sbKey)

    // 5. Fetch all game titles from DB for matching
    const allGames: any[] = await sbFetch(sbUrl, sbKey, 'games?select=id,title')
    if (!allGames || allGames.length === 0) throw new Error('No games found in DB')

    // 6. Fuzzy-match AI names to DB games
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
      throw new Error(`AI suggested: [${aiGameNames.slice(0, 3).join(', ')}...] but none matched DB titles`)
    }

    // 7. Reset all ai_rank and apply new ranks
    await sbFetch(sbUrl, sbKey, 'games?ai_rank=not.is.null', {
      method: 'PATCH',
      body: JSON.stringify({ ai_rank: null })
    })

    for (const m of matched) {
      await sbFetch(sbUrl, sbKey, `games?id=eq.${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ai_rank: m.rank })
      })
    }

    // 8. Update system_settings
    const settingsData = await sbFetch(sbUrl, sbKey, 'system_settings?key=eq.ai_ranking')
    const currentVal = settingsData?.[0]?.value || { schedule: 'manual' }
    currentVal.last_run = new Date().toISOString()
    currentVal.ai_suggestions = aiGameNames
    currentVal.matched_count = matched.length
    currentVal.provider_used = effectiveCategory

    await sbFetch(sbUrl, sbKey, 'system_settings?key=eq.ai_ranking', {
      method: 'PATCH',
      body: JSON.stringify({ value: currentVal })
    })

    return new Response(JSON.stringify({
      success: true,
      provider_used: effectiveCategory,
      ai_suggestions: aiGameNames,
      matched: matched.length
    }), { headers: CORS })

  } catch (e: any) {
    console.error('[ai-rank]', e)
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
