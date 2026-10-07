/**
 * gemini.ts
 *
 * Backward-compatible wrapper that routes game-data generation
 * through the new unified aiProvider (supports Gemini + Groq).
 *
 * Callers (AiAutoFill, game editing) continue to use `generateGameData(prompt)`
 * — routing and fallback are handled transparently.
 */
import { generateText } from './aiProvider'

export interface GeminiKey {
  id: string
  name: string
  api_key: string
  is_active: boolean
  model: string
  cooldown_until: string | null
  created_at: string
  category?: string
}

/**
 * Generate content using the assigned provider for 'game_edit' feature.
 * Falls back through all available keys automatically.
 */
export async function generateGameData(prompt: string, modelOverride?: string, categoryOverride?: 'gemini' | 'groq'): Promise<any> {
  const text = await generateText('game_edit', prompt, modelOverride, categoryOverride as any)
  return parseAIResponse(text)
}

/**
 * Generate content for the game detail page AI feature.
 */
export async function generateGameDetails(prompt: string, modelOverride?: string, categoryOverride?: 'gemini' | 'groq'): Promise<any> {
  const text = await generateText('game_details', prompt, modelOverride, categoryOverride as any)
  return parseAIResponse(text)
}

function parseAIResponse(text: string): any {
  const clean = text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim()
  return JSON.parse(clean)
}
