/**
 * chatService.ts
 *
 * Public API for chat — routes through aiProvider.ts which handles:
 *  - Feature → provider routing (reads api_key_routing table)
 *  - Multi-key rotation & fallback (429 / quota / transient errors)
 *  - Gemini + Groq support
 */
import { executeAIChat } from './aiProvider'
import type { ChatTurn } from './aiProvider'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  attachments?: {
    type: 'image' | 'audio'
    data: string // Base64 (without data:... prefix)
    mimeType: string
  }[]
}

// ─── System prompt ──────────────────────────────────────────────────────────

function buildSystemPrompt(gameCount: number, totalViews: number, pageTitle?: string): string {
  const base = `You are Labot, a friendly AI assistant for LA-GAME (la-game.pages.dev) - a free PC game download platform from Laos.

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
    return (
      base +
      `\n\nCURRENT CONTEXT: The user is viewing: "${pageTitle}". If they ask about "this game" assume it is the game on this page.`
    )
  }
  return base
}

// ─── Auto-retry for cold-start / transient network blips ────────────────────

async function withRetry<T>(fn: () => Promise<T>, retries = 1, delayMs = 1500): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    if (e.name === 'AbortError' || e.message?.includes('QUOTA_EXCEEDED')) throw e
    const msg = (e.message || '').toLowerCase()
    const isTransient =
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('503') ||
      msg.includes('502') ||
      msg.includes('load failed') ||
      e.name === 'TypeError'
    if (retries > 0 && isTransient) {
      await new Promise(r => setTimeout(r, delayMs))
      return withRetry(fn, retries - 1, delayMs)
    }
    throw e
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function sendChatMessage(
  messages: ChatMessage[],
  opts: {
    gameCount: number
    totalViews: number
    pageTitle?: string
    abortSignal?: AbortSignal
  }
): Promise<string> {
  const systemPrompt = buildSystemPrompt(opts.gameCount, opts.totalViews, opts.pageTitle)

  // Map ChatMessage → ChatTurn (aiProvider format)
  const turns: ChatTurn[] = messages
    .filter(m => m.content?.trim() && !(m as any)._isError)
    .map(m => ({
      role: m.role,
      content: m.content,
      attachments: m.attachments
    }))

  return withRetry(
    () => executeAIChat('chatbot', systemPrompt, turns, opts.abortSignal),
    1,
    1500
  )
}
