// Cloudflare Pages Function — POST /api/chat
// Runs server-side on Cloudflare Edge — API keys are NEVER exposed to the client

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

// Try calling Gemini REST API with a given key
async function callGemini(apiKey: string, model: string, systemPrompt: string, messages: ChatMessage[]): Promise<string> {
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

  if (res.status === 429 || data.error?.code === 429) {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (data.error) {
    throw new Error(data.error.message || 'Gemini error')
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

export async function onRequestPost(context: any) {
  try {
    const body: RequestBody = await context.request.json()
    const { messages, gameCount = 0, totalViews = 0 } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'invalid_request' }), { status: 400, headers: CORS })
    }

    // Read Supabase credentials from Cloudflare env vars
    // (Set these in Cloudflare Pages → Settings → Environment Variables)
    const supabaseUrl = context.env?.VITE_SUPABASE_URL
      || 'https://srwttqkjygzraqqnqesl.supabase.co'
    const supabaseKey = context.env?.VITE_SUPABASE_ANON_KEY
      || 'sb_publishable_NLXFd5_OjpsSXzG7McF3Vg_Li9XKwKS'

    // Fetch active Gemini API keys from Supabase
    let keys: any[] = []
    try {
      const keysRes = await fetch(
        `${supabaseUrl}/rest/v1/gemini_api_keys?is_active=eq.true&order=created_at.asc`,
        { headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` } }
      )
      keys = await keysRes.json()
    } catch (e) {
      console.error('Supabase fetch failed:', e)
    }

    // Filter out keys that are on cooldown
    const now = Date.now()
    const available = (Array.isArray(keys) ? keys : []).filter((k: any) =>
      !k.cooldown_until || new Date(k.cooldown_until).getTime() < now
    )

    if (available.length === 0) {
      return new Response(JSON.stringify({
        error: 'quota_exceeded',
        message: '⏳ ระบบยุ่งชั่วคราว / หมด token แล้ว กรุณาลองใหม่ภายหลัง\n\nThe system is temporarily out of capacity. Please try again later. 🙏'
      }), { status: 429, headers: CORS })
    }

    const systemPrompt = buildSystemPrompt(gameCount, totalViews)

    // Try each key sequentially
    for (let i = 0; i < available.length; i++) {
      const keyRecord = available[i]
      const model = keyRecord.model || 'gemini-2.0-flash'

      try {
        const reply = await callGemini(keyRecord.api_key, model, systemPrompt, messages)
        return new Response(JSON.stringify({ reply }), { headers: CORS })

      } catch (e: any) {
        if (e.message === 'QUOTA_EXCEEDED') {
          // Put this key on cooldown (24h)
          const cooldownTime = new Date()
          cooldownTime.setHours(cooldownTime.getHours() + 24)
          try {
            await fetch(`${supabaseUrl}/rest/v1/gemini_api_keys?id=eq.${keyRecord.id}`, {
              method: 'PATCH',
              headers: {
                apikey: supabaseKey,
                Authorization: `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal'
              },
              body: JSON.stringify({ cooldown_until: cooldownTime.toISOString() })
            })
          } catch (_) {}
          // Continue to next key
          continue
        }
        // Non-quota error: try next key if available
        if (i === available.length - 1) throw e
      }
    }

    // All keys exhausted
    return new Response(JSON.stringify({
      error: 'quota_exceeded',
      message: '⏳ ระบบยุ่งชั่วคราว / หมด token แล้ว กรุณาลองใหม่ภายหลัง\n\nThe system is temporarily out of capacity. Please try again later. 🙏'
    }), { status: 429, headers: CORS })

  } catch (e: any) {
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
