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
import type { CacheFieldSelection } from '../components/AiAutoFill/AiAutoFillCard'

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
 * Builds a strict, minimal prompt that requests ONLY the fields currently
 * selected by the admin filter. Completely omits unselected fields (such as
 * long descriptions, requirements, or image scraping clues) to maximize
 * generation speed and minimize token consumption.
 */
export function buildFilteredGamePrompt(gameTitle: string, filter?: CacheFieldSelection): string {
  const f = filter || {
    title: true, size: true, slug: true, genres: true, description: true,
    platform: true, videoTrailer: true, coverImage: true, screenshots: true, links: true
  }

  const jsonFields: string[] = []

  // 1. Title / Slug
  if (f.title || f.slug) {
    jsonFields.push('"title": "official game title"')
  }

  // 2. File Size (Storage size)
  if (f.size) {
    jsonFields.push('"file_size": "estimated game size e.g. 50 GB, 120 GB, 500 MB (just the number and unit)"')
  }

  // 3. Category / Genres
  if (f.genres) {
    jsonFields.push('"genres": ["genre1", "genre2"] (list of 1-3 primary genres)')
  }

  // 4. Description (omitted if unchecked to avoid generating hundreds of tokens)
  if (f.description) {
    jsonFields.push('"description": "a 2-3 paragraph description of the game (plot, gameplay, features)"')
  }

  // 5. Platforms & System Requirements
  if (f.platform) {
    jsonFields.push('"platforms": ["windows", "macos", "ps2", "ps3", "ps4", "ps5", "switch", "xbox"] (lowercase supported platforms)')
    jsonFields.push('"minimum_requirements": "OS: Windows 10 64-bit\\nCPU: Intel Core i5\\nRAM: 8 GB\\nGPU: GTX 970"')
    jsonFields.push('"recommended_requirements": "OS: Windows 10/11 64-bit\\nCPU: Intel Core i7\\nRAM: 16 GB\\nGPU: RTX 2080"')
  }

  // 6. Video Trailer
  if (f.videoTrailer) {
    jsonFields.push('"video_url": "Accurate YouTube Game Trailer watch URL"')
  }

  // 7. Cover Art & Screenshots & Steam App ID
  const needSteamAssets = Boolean(f.coverImage || f.screenshots)
  if (needSteamAssets) {
    jsonFields.push('"steam_app_id": 12120 // Numeric Steam App ID if game is on Steam')
    if (f.coverImage) {
      jsonFields.push('"cover_image": "URL to the official game cover"')
    }
    if (f.screenshots) {
      jsonFields.push('"screenshots": ["URL1", "URL2", "URL3"] // list of in-game screenshot URLs')
    }
  }

  // Fallback if literally everything was unchecked
  if (jsonFields.length === 0) {
    jsonFields.push('"title": "official game title"')
    jsonFields.push('"file_size": "estimated game size"')
  }

  // Masterpiece / AAA detection
  jsonFields.push('"is_featured": boolean // true if AAA or highly popular masterpiece, otherwise false')

  return `You are a high-speed game database expert. Given the game name "${gameTitle.trim()}", return a JSON object with STRICTLY ONLY the requested fields below:
{
  ${jsonFields.join(',\n  ')}
}
${needSteamAssets ? "IMPORTANT: Provide the accurate 'steam_app_id' if the game exists on Steam.\n" : ''}Return ONLY the raw JSON object. Do not include markdown codeblocks, explanations, or unrequested keys.`
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

