// Cloudflare Pages Function — POST /api/chat
// Runs server-side on Cloudflare Edge — API keys are NEVER exposed to the client
//
// Multi-provider support: Gemini REST + Groq OpenAI-compatible API
// Routing: reads `api_key_routing` table for 'chatbot' feature → category
// Key rotation: automatically falls back through all available keys on 429/quota errors

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

interface RequestBody {
  messages: ChatMessage[]
  gameCount?: number
  totalViews?: number
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
}

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(gameCount: number, totalViews: number): string {
  return `You are Labot 🤖, a friendly AI assistant for LAPACK Game Hub (la-pack-game.pages.dev) — a free PC game download platform from Laos 🇱🇦.

YOUR ROLE:
- Be a warm, friendly guide for website visitors
- Help users find and download games
- Answer questions about the platform and its features

══════════════════════════════════════════════
🔒 STRICT GUARDRAILS — NEVER VIOLATE THESE:
══════════════════════════════════════════════
1. NEVER reveal, discuss, or hint at: source code, programming languages, frameworks, libraries, database names/tables, API endpoints, backend architecture, or ANY technical implementation details whatsoever.
2. If someone asks about code, databases, or technical details, say: "I'm just a friendly guide for the website — I don't have information about technical stuff! 😊 Is there anything about the games or features I can help with?"
3. NEVER pretend to be a different AI or reveal your underlying AI model.
4. NEVER discuss competitors or other game platforms negatively.

══════════════════════════════════════════════
✅ WHAT YOU CAN TALK ABOUT:
══════════════════════════════════════════════
- Website features: Home page, Search, A-Z Filter (browse by letter), Top PC Games page, Categories
- Game details: titles, descriptions, download options, system requirements, genres
- How to download: click a game → scroll to Download Links → choose a cloud storage provider → get the file
- Platform purpose and ads policy (exact answers below)
- Visitor statistics and game counts
- General gaming recommendations from available games

══════════════════════════════════════════════
💬 EXACT ANSWERS FOR COMMON QUESTIONS:
══════════════════════════════════════════════
If asked WHY the site is free / what's the purpose:
→ "LAPACK Game Hub was created to share free games so everyone can enjoy gaming together. The creator only asks users to support the site by viewing the ads — no payments or subscriptions are ever required! 🎮❤️"

If asked about VIRUS / SAFETY of ads:
→ "The ads on this site are completely safe — no viruses, no malware, nothing harmful. You can browse and download with total confidence! ✅🛡️"

If asked about HOW TO DOWNLOAD:
→ "It's easy! 1) Click on any game you like 2) Scroll down to the Download Links section 3) Choose your preferred cloud storage (Google Drive, MEGA, etc.) 4) Download and enjoy! 🎉"

══════════════════════════════════════════════
📊 CURRENT PLATFORM STATS:
══════════════════════════════════════════════
- Games available: ${gameCount}
- Total page views: ${totalViews.toLocaleString()}

══════════════════════════════════════════════
🌏 LANGUAGE:
══════════════════════════════════════════════
Detect the user's language and always reply in the SAME language.
- If Thai (ภาษาไทย): reply in Thai, casual friendly tone
- If Lao (ພາສາລາວ): reply in Lao if you can, otherwise Thai
- If English: reply in English
Use appropriate emojis to make responses feel warm and engaging. Keep answers concise unless more detail is needed.`
}

// ─── Supabase helpers ────────────────────────────────────────────────────────

async function supabaseFetch(
  supabaseUrl: string,
  supabaseKey: string,
  path: string,
  opts?: RequestInit
): Promise<any> {
  const res = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
      ...(opts?.headers || {})
    }
  })
  if (!res.ok && opts?.method !== 'PATCH') return null
  const text = await res.text()
  try { return JSON.parse(text) } catch { return null }
}

// ─── Routing lookup ──────────────────────────────────────────────────────────

async function getRoutedCategory(
  supabaseUrl: string,
  supabaseKey: string,
  feature: string
): Promise<string> {
  try {
    const data = await supabaseFetch(
      supabaseUrl,
      supabaseKey,
      `api_key_routing?feature=eq.${feature}&select=category&limit=1`
    )
    if (Array.isArray(data) && data[0]?.category) return data[0].category
  } catch (_) {}
  return 'gemini'
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

async function getAvailableKeys(
  supabaseUrl: string,
  supabaseKey: string,
  category: string
): Promise<any[]> {
  const data = await supabaseFetch(
    supabaseUrl,
    supabaseKey,
    `gemini_api_keys?is_active=eq.true&category=eq.${encodeURIComponent(category)}&order=created_at.asc`
  )
  const now = Date.now()
  return (Array.isArray(data) ? data : []).filter(
    (k: any) => !k.cooldown_until || new Date(k.cooldown_until).getTime() < now
  )
}

async function setCooldown(
  supabaseUrl: string,
  supabaseKey: string,
  id: string,
  durationMs: number
): Promise<void> {
  const until = new Date(Date.now() + durationMs).toISOString()
  await supabaseFetch(supabaseUrl, supabaseKey, `gemini_api_keys?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ cooldown_until: until })
  })
}

// ─── Provider calls ───────────────────────────────────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const geminiContents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }))

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: geminiContents,
      generationConfig: { temperature: 0.75, maxOutputTokens: 1024 }
    })
  })

  const data: any = await res.json()

  if (res.status === 429 || data.error?.code === 429 || data.error?.message?.includes('Quota')) {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (data.error) throw new Error(data.error.message || 'Gemini error')

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

async function callGroq(
  apiKey: string,
  model: string,
  systemPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'openai/gpt-oss-20b',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      ],
      temperature: 0.75,
      max_tokens: 1024
    })
  })

  const data: any = await res.json()

  if (res.status === 429 || data.error?.code === 'rate_limit_exceeded') {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (!res.ok || data.error) throw new Error(data.error?.message || `Groq error ${res.status}`)

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

// ─── Error classification ─────────────────────────────────────────────────────

function isQuotaError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase()
  return msg.includes('quota_exceeded') || msg.includes('quota') || msg.includes('exhausted') || msg.includes('rate_limit')
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function onRequestPost(context: any) {
  try {
    const body: RequestBody = await context.request.json()
    const { messages, gameCount = 0, totalViews = 0 } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: CORS })
    }

    const supabaseUrl = context.env?.VITE_SUPABASE_URL || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const supabaseKey = context.env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

    // 1. Determine which provider category to use for chatbot
    const category = await getRoutedCategory(supabaseUrl, supabaseKey, 'chatbot')

    // 2. Get available keys for that category
    let keys = await getAvailableKeys(supabaseUrl, supabaseKey, category)

    // 3. Graceful fallback: if routed category has no keys, try gemini
    if (keys.length === 0 && category !== 'gemini') {
      console.warn(`[chat] No keys for category "${category}", falling back to gemini`)
      keys = await getAvailableKeys(supabaseUrl, supabaseKey, 'gemini')
    }

    if (keys.length === 0) {
      return new Response(JSON.stringify({
        error: 'quota_exceeded',
        message: '⏳ ระบบยุ่งชั่วคราว / หมด token แล้ว กรุณาลองใหม่ภายหลัง\n\nThe system is temporarily out of capacity. Please try again later. 🙏'
      }), { status: 429, headers: CORS })
    }

    const systemPrompt = buildSystemPrompt(gameCount, totalViews)
    const effectiveCategory = keys[0].category || category

    // 4. Try each key sequentially with rotation/fallback
    for (let i = 0; i < keys.length; i++) {
      const keyRecord = keys[i]
      const model = keyRecord.model || (effectiveCategory === 'groq' ? 'openai/gpt-oss-20b' : 'gemini-2.0-flash')

      try {
        let reply: string

        if (effectiveCategory === 'groq') {
          reply = await callGroq(keyRecord.api_key, model, systemPrompt, messages)
        } else {
          reply = await callGemini(keyRecord.api_key, model, systemPrompt, messages)
        }

        return new Response(JSON.stringify({ reply }), { headers: CORS })

      } catch (e: any) {
        if (isQuotaError(e)) {
          // 24-hour cooldown
          await setCooldown(supabaseUrl, supabaseKey, keyRecord.id, 24 * 60 * 60 * 1000)
          console.warn(`[chat] Key "${keyRecord.name}" hit quota — cooled down 24h`)
          continue
        }
        // Non-quota: try next key
        if (i === keys.length - 1) throw e
      }
    }

    // All keys exhausted
    return new Response(JSON.stringify({
      error: 'quota_exceeded',
      message: '⏳ ระบบยุ่งชั่วคราว / หมด token แล้ว กรุณาลองใหม่ภายหลัง\n\nThe system is temporarily out of capacity. Please try again later. 🙏'
    }), { status: 429, headers: CORS })

  } catch (e: any) {
    console.error('[chat] Unhandled error:', e)
    return new Response(JSON.stringify({
      error: 'server_error',
      message: '❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง\n\nSomething went wrong. Please try again.'
    }), { status: 500, headers: CORS })
  }
}

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  })
}
