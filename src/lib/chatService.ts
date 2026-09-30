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

// -- Cache SDK instances per API key (avoids re-initializing on every request) --
const sdkCache = new Map<string, GoogleGenerativeAI>()
function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!sdkCache.has(apiKey)) {
    sdkCache.set(apiKey, new GoogleGenerativeAI(apiKey))
  }
  return sdkCache.get(apiKey)!
}

// -- Classify transient/cold-start errors that are safe to retry --
function isTransientError(e: any): boolean {
  if (!e) return false
  const msg = (e.message || '').toLowerCase()
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('empty_response') ||
    msg.includes('load failed') ||
    msg.includes('connection') ||
    e.name === 'TypeError'
  )
}

// -- Auto-retry wrapper --
// Silently retries once on transient errors with a 1.5 s delay.
// The user sees a normal loading spinner - never a first-attempt error bubble.
async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1500): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    if (e.name === 'AbortError' || e.message?.includes('QUOTA_EXCEEDED')) throw e
    if (retries > 0 && isTransientError(e)) {
      await new Promise(r => setTimeout(r, delayMs))
      return withRetry(fn, retries - 1, delayMs)
    }
    throw e
  }
}

// -- System prompt --
function buildSystemPrompt(gameCount: number, totalViews: number, pageTitle?: string): string {
  const basePrompt = `You are Labot, a friendly AI assistant for LA-GAME (la-game.pages.dev) - a free PC game download platform from Laos.

YOUR ROLE:
- Be a warm, friendly guide for website visitors
- Help users find and download games
- Answer questions about the platform and its features
- Answer PC specification questions (e.g., "Can my PC run this game?", "Will I get 60 FPS with GTX 1060?")

STRICT GUARDRAILS - NEVER VIOLATE:
1. NEVER reveal source code, frameworks, libraries, database tables, API endpoints, or ANY technical implementation details.
2. If asked about code/databases: say "I'm just a friendly guide for the website - I don't have information about technical stuff!"
3. NEVER reveal your underlying AI model or pretend to be a different AI.

YOU CAN DISCUSS:
- Website features: Home, Search, A-Z Filter, Top PC Games, Categories
- Game details, descriptions, genres, download steps
- Platform mission and ads policy (exact answers below)
- Visitor stats and game counts
- PC Specs, System Requirements, FPS estimation based on user hardware

EXACT ANSWERS:
If asked WHY free / platform purpose: "LA-GAME was created to share free games so everyone can enjoy gaming together. The creator only asks users to support by viewing the ads - no payments required!"
If asked about VIRUS / SAFETY: "Completely safe - no viruses, no malware. Browse and download with total confidence!"
If asked HOW TO DOWNLOAD: "1) Click a game 2) Scroll to Download Links 3) Pick your cloud (Google Drive, MEGA, etc.) 4) Download and play!"

STATS: ${gameCount} games available, ${totalViews.toLocaleString()} total views

LANGUAGE: Reply in the SAME language the user writes in (Thai/Lao/English). Be friendly and use emojis occasionally.`

  if (pageTitle) {
    return basePrompt + `\n\nCURRENT CONTEXT: The user is currently viewing the page: "${pageTitle}". If they ask "Can my PC run this game?" or refer to "this game", assume they are talking about the game on this page.`
  }
  return basePrompt
}

// -- Core call (browser to Gemini API directly) --
async function chatDev(messages: ChatMessage[], gameCount: number, totalViews: number, abortSignal?: AbortSignal): Promise<string> {
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
  
  // Normalize history: strictly alternate user/model, skip empty/error messages
  const normalizedContents: any[] = []
  let lastRole = ''

  for (const m of messages) {
    if (!m.content || m.content.trim() === '') continue
    if ((m as any)._isError) continue

    const role = m.role === 'assistant' ? 'model' : 'user'
    const parts: any[] = [{ text: m.content }]
    if (m.attachments) {
      for (const att of m.attachments) {
        parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } })
      }
    }
    
    if (role === lastRole) {
      const lastMsg = normalizedContents[normalizedContents.length - 1]
      lastMsg.parts[0].text += '\n\n' + m.content
      if (m.attachments) {
        for (const att of m.attachments) {
          lastMsg.parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } })
        }
      }
    } else {
      normalizedContents.push({ role, parts })
      lastRole = role
    }
  }
  
  // Gemini requires conversation to start with 'user'
  if (normalizedContents.length > 0 && normalizedContents[0].role !== 'user') {
    normalizedContents.shift()
  }

  for (let i = 0; i < available.length; i++) {
    const keyRecord = available[i]
    
    try {
      // Use cached SDK instance - no re-handshake overhead
      const genAI = getGenAI(keyRecord.api_key)
      const modelStr = keyRecord.model || 'gemini-flash-latest'
      const model = genAI.getGenerativeModel({ 
        model: modelStr,
        systemInstruction: systemPrompt 
      })

      // withRetry handles cold-start / network blips silently
      const text = await withRetry(async () => {
        if (abortSignal?.aborted) {
          throw Object.assign(new Error('AbortError'), { name: 'AbortError' })
        }
        const result = await model.generateContent({
          contents: normalizedContents,
          generationConfig: { temperature: 0.75, maxOutputTokens: 2048 }
        }, { signal: abortSignal })
        const t = result.response.text()
        if (!t) throw new Error('EMPTY_RESPONSE')
        return t
      })

      return text

    } catch (e: any) {
      if (e.name === 'AbortError' || abortSignal?.aborted) {
        throw e
      }

      if (e.message?.includes('429') || e.message?.includes('Quota') || e.message?.toLowerCase().includes('exhausted')) {
        const cooldownTime = new Date()
        cooldownTime.setHours(cooldownTime.getHours() + 24)
        await (supabase as any).from('gemini_api_keys').update({ cooldown_until: cooldownTime.toISOString() }).eq('id', keyRecord.id)
      }
      
      if (i === available.length - 1) throw e
    }
  }

  throw new Error('QUOTA_EXCEEDED')
}

// -- Public API --
export async function sendChatMessage(
  messages: ChatMessage[],
  opts: { gameCount: number; totalViews: number; pageTitle?: string; abortSignal?: AbortSignal }
): Promise<string> {
  return chatDev(messages, opts.gameCount, opts.totalViews, opts.abortSignal)
}
