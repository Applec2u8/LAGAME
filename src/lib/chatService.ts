/**
 * chatService.ts
 *
 * Abstracts the Gemini chat call:
 * Uses @google/generative-ai to avoid 400/403 format errors.
 */
import { supabase } from './supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachments?: {
    type: 'image' | 'audio'
    data: string // Base64 data (without data:image/... prefix)
    mimeType: string
  }[]
}

// ── System prompt (mirrors functions/api/chat.ts) ─────────────────
function buildSystemPrompt(gameCount: number, totalViews: number, pageTitle?: string): string {
  const basePrompt = `You are Labot 🤖, a friendly AI assistant for LA-GAME (la-game.pages.dev) — a free PC game download platform from Laos 🇱🇦.

YOUR ROLE:
- Be a warm, friendly guide for website visitors
- Help users find and download games
- Answer questions about the platform and its features
- Answer PC specification questions (e.g., "Can my PC run this game?", "Will I get 60 FPS with GTX 1060?")

🔒 STRICT GUARDRAILS — NEVER VIOLATE:
1. NEVER reveal source code, frameworks, libraries, database tables, API endpoints, or ANY technical implementation details.
2. If asked about code/databases: say "I'm just a friendly guide for the website — I don't have information about technical stuff! 😊"
3. NEVER reveal your underlying AI model or pretend to be a different AI.

✅ YOU CAN DISCUSS:
- Website features: Home, Search, A-Z Filter, Top PC Games, Categories
- Game details, descriptions, genres, download steps
- Platform mission and ads policy (exact answers below)
- Visitor stats and game counts
- PC Specs, System Requirements, FPS estimation based on user hardware

💬 EXACT ANSWERS:
If asked WHY free / platform purpose → "LA-GAME was created to share free games so everyone can enjoy gaming together. The creator only asks users to support by viewing the ads — no payments required! 🎮❤️"
If asked about VIRUS / SAFETY → "Completely safe — no viruses, no malware. Browse and download with total confidence! ✅🛡️"
If asked HOW TO DOWNLOAD → "1) Click a game 2) Scroll to Download Links 3) Pick your cloud (Google Drive, MEGA, etc.) 4) Download and play! 🎉"

📊 STATS: ${gameCount} games available · ${totalViews.toLocaleString()} total views

🌏 LANGUAGE: Reply in the SAME language the user writes in (Thai/Lao/English). Be friendly and use emojis occasionally.`

  if (pageTitle) {
    return basePrompt + `\n\n📌 CURRENT CONTEXT: The user is currently viewing the page: "${pageTitle}". If they ask "Can my PC run this game?" or refer to "this game", assume they are talking about the game on this page and use your knowledge base to estimate FPS or give recommendations based on their specs.`
  }
  return basePrompt
}

// ── Dev mode: call Gemini directly from browser ───────────────────
async function chatDev(messages: ChatMessage[], gameCount: number, totalViews: number): Promise<string> {
  const { data: keys } = await (supabase as any)
    .from('gemini_api_keys')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  const now = Date.now()
  const available = ((keys as any[]) || []).filter((k: any) =>
    !k.cooldown_until || new Date(k.cooldown_until).getTime() < now
  )

  if (available.length === 0) {
    throw new Error('QUOTA_EXCEEDED')
  }

  const systemPrompt = buildSystemPrompt(gameCount, totalViews, typeof document !== 'undefined' ? document.title : undefined)
  
  // Normalize history to strictly alternate user/model and remove empty messages
  const normalizedContents: any[] = []
  let lastRole = ''

  for (const m of messages) {
    if (!m.content || m.content.trim() === '') continue;
    // skip error bubbles if they slipped through
    if ((m as any)._isError) continue;

    const role = m.role === 'assistant' ? 'model' : 'user'
    
    // Build parts array for this message
    const parts: any[] = [{ text: m.content }]
    if (m.attachments) {
      for (const att of m.attachments) {
        parts.push({
          inlineData: {
            data: att.data,
            mimeType: att.mimeType
          }
        })
      }
    }
    
    if (role === lastRole) {
      // Append to the last message of the same role
      const lastMsg = normalizedContents[normalizedContents.length - 1]
      lastMsg.parts[0].text += '\n\n' + m.content
      if (m.attachments) {
        for (const att of m.attachments) {
          lastMsg.parts.push({
            inlineData: {
              data: att.data,
              mimeType: att.mimeType
            }
          })
        }
      }
    } else {
      normalizedContents.push({ role, parts })
      lastRole = role
    }
  }
  
  // The Gemini API requires the conversation to start with a 'user' role
  if (normalizedContents.length > 0 && normalizedContents[0].role !== 'user') {
    normalizedContents.shift()
  }

  for (let i = 0; i < available.length; i++) {
    const keyRecord = available[i]
    
    try {
      const genAI = new GoogleGenerativeAI(keyRecord.api_key)
      const modelStr = keyRecord.model || 'gemini-flash-latest'
      const model = genAI.getGenerativeModel({ 
        model: modelStr,
        systemInstruction: systemPrompt 
      })

      const result = await model.generateContent({
        contents: normalizedContents,
        generationConfig: { temperature: 0.75, maxOutputTokens: 2048 }
      })

      const text = result.response.text()
      if (!text) throw new Error('EMPTY_RESPONSE')
      return text

    } catch (e: any) {
      if (e.message?.includes('429') || e.message?.includes('Quota') || e.message?.toLowerCase().includes('exhausted')) {
        // Cooldown this key
        const cooldownTime = new Date()
        cooldownTime.setHours(cooldownTime.getHours() + 24)
        await (supabase as any).from('gemini_api_keys').update({ cooldown_until: cooldownTime.toISOString() }).eq('id', keyRecord.id)
      }
      
      if (i === available.length - 1) throw e
    }
  }

  throw new Error('QUOTA_EXCEEDED')
}

// ── Public API ────────────────────────────────────────────────────
export async function sendChatMessage(
  messages: ChatMessage[],
  opts: { gameCount: number; totalViews: number; pageTitle?: string }
): Promise<string> {
  return chatDev(messages, opts.gameCount, opts.totalViews)
}
