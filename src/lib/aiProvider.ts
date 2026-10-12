/**
 * aiProvider.ts
 *
 * Unified multi-provider AI execution layer with:
 * - Categorized key lookup (gemini | groq | other)
 * - Feature → provider routing via `api_key_routing` Supabase table
 * - Intelligent key rotation & fallback on 429 / quota errors
 * - Automatic cooldown marking (24 h for quota, 5 min for transient)
 * - Permanent disable on invalid-key errors (400 / 403)
 */

import { supabase } from './supabase'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProviderCategory = 'gemini' | 'groq' | 'steamgriddb' | 'other'

export type FeatureKey =
  | 'chatbot'
  | 'game_details'
  | 'game_edit'
  | 'ai_ranking'

export interface ApiKeyRecord {
  id: string
  name: string
  api_key: string
  is_active: boolean
  model: string
  category: ProviderCategory
  cooldown_until: string | null
  created_at: string
}

export interface RoutingRecord {
  feature: FeatureKey
  category: ProviderCategory
}

export interface ChatTurn {
  role: 'user' | 'assistant'
  content: string
  attachments?: { type: 'image' | 'audio'; data: string; mimeType: string }[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const COOLDOWN_QUOTA_MS     = 24 * 60 * 60 * 1000  // 24 h
const COOLDOWN_TRANSIENT_MS = 5 * 60 * 1000        // 5 min
// Stable alias used as automatic fallback when a model name returns 404
const GEMINI_FALLBACK_MODEL = 'gemini-flash-latest'

// ─── SDK cache (Gemini) ──────────────────────────────────────────────────────

const genAICache = new Map<string, GoogleGenerativeAI>()
function getGenAI(apiKey: string): GoogleGenerativeAI {
  if (!genAICache.has(apiKey)) genAICache.set(apiKey, new GoogleGenerativeAI(apiKey))
  return genAICache.get(apiKey)!
}

// ─── Routing helpers ─────────────────────────────────────────────────────────

/**
 * Look up which provider category is assigned to the given feature.
 * Falls back to 'gemini' if the table is missing or the feature has no row.
 */
export async function getRoutedCategory(feature: FeatureKey): Promise<ProviderCategory> {
  try {
    const { data, error } = await (supabase as any)
      .from('api_key_routing')
      .select('category')
      .eq('feature', feature)
      .single()
    if (!error && data?.category) return data.category as ProviderCategory
  } catch (_) {}
  return 'gemini'
}

/**
 * Fetch all routing rows.
 */
export async function getAllRoutings(): Promise<RoutingRecord[]> {
  const { data } = await (supabase as any).from('api_key_routing').select('*')
  return (data as RoutingRecord[]) || []
}

/**
 * Save a feature → category mapping.
 */
export async function saveRouting(feature: FeatureKey, category: ProviderCategory): Promise<void> {
  await (supabase as any)
    .from('api_key_routing')
    .upsert({ feature, category, updated_at: new Date().toISOString() }, { onConflict: 'feature' })
}

/**
 * Returns { category, model } for the active provider used by a given feature.
 * Used by the UI to display which AI is currently powering a feature.
 */
export async function getActiveModelInfo(feature: FeatureKey): Promise<{ category: ProviderCategory; model: string }> {
  const category = await getRoutedCategory(feature)
  const keys = await getAvailableKeys(category)
  const key = keys[0]
  const defaultModel = category === 'groq' ? 'openai/gpt-oss-20b' : 'gemini-flash-latest'
  return { category, model: key?.model || defaultModel }
}

// ─── Key helpers ─────────────────────────────────────────────────────────────

/**
 * Get all active, non-cooled-down keys for a given category.
 *
 * Cooldown filtering is done at the database level (lte current timestamp)
 * to avoid JS-side race conditions where a stale in-memory snapshot could
 * return a key that has already been cooled-down by another request.
 */
export async function getAvailableKeys(category: ProviderCategory): Promise<ApiKeyRecord[]> {
  const nowIso = new Date().toISOString()
  const { data, error } = await (supabase as any)
    .from('gemini_api_keys')
    .select('*')
    .eq('is_active', true)
    .eq('category', category)
    // Only rows where cooldown_until is NULL  OR  cooldown_until <= now
    .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`)
    .order('created_at', { ascending: true })

  if (error || !data) return []
  return data as ApiKeyRecord[]
}

async function setCooldown(id: string, durationMs: number) {
  const until = new Date(Date.now() + durationMs).toISOString()
  await (supabase as any)
    .from('gemini_api_keys')
    .update({ cooldown_until: until })
    .eq('id', id)
}

async function disableKey(id: string) {
  await (supabase as any)
    .from('gemini_api_keys')
    .update({ is_active: false })
    .eq('id', id)
}

// ─── Provider call implementations ───────────────────────────────────────────

/**
 * Call Gemini using the Google Generative AI SDK.
 *
 * If the stored model name is deprecated/invalid (HTTP 404) the call is
 * automatically retried once with GEMINI_FALLBACK_MODEL so that the key
 * itself is not wrongly penalised for a bad model name.
 */
async function callGemini(
  key: ApiKeyRecord,
  systemPrompt: string,
  messages: ChatTurn[],
  abortSignal?: AbortSignal,
  /** Internal flag — set to true on the fallback retry to prevent infinite recursion */
  _isFallback = false
): Promise<string> {
  const genAI = getGenAI(key.api_key)
  const modelStr = _isFallback ? GEMINI_FALLBACK_MODEL : (key.model || GEMINI_FALLBACK_MODEL)
  const model = genAI.getGenerativeModel({
    model: modelStr,
    systemInstruction: systemPrompt
  })

  // Normalise to strict user/model alternation
  const contents: any[] = []
  let lastRole = ''
  for (const m of messages) {
    if (!m.content?.trim()) continue
    const role = m.role === 'assistant' ? 'model' : 'user'
    const parts: any[] = [{ text: m.content }]
    if (m.attachments) {
      for (const att of m.attachments) {
        parts.push({ inlineData: { data: att.data, mimeType: att.mimeType } })
      }
    }
    if (role === lastRole) {
      contents[contents.length - 1].parts[0].text += '\n\n' + m.content
    } else {
      contents.push({ role, parts })
      lastRole = role
    }
  }
  if (contents.length > 0 && contents[0].role !== 'user') contents.shift()

  try {
    const result = await model.generateContent(
      { contents, generationConfig: { temperature: 0.75, maxOutputTokens: 2048 } },
      { signal: abortSignal }
    )
    const text = result.response.text()
    if (!text) throw new Error('EMPTY_RESPONSE')
    return text
  } catch (e: any) {
    // If the model name itself is invalid, retry once with the stable fallback alias.
    // Do NOT do this on the fallback retry itself to avoid infinite loops.
    if (!_isFallback && isModelNotFoundError(e)) {
      console.warn(
        `[aiProvider] Model "${modelStr}" returned 404 for key "${key.name}" — retrying with ${GEMINI_FALLBACK_MODEL}`
      )
      return callGemini(key, systemPrompt, messages, abortSignal, true)
    }
    throw e
  }
}

/**
 * Call Groq via its OpenAI-compatible REST endpoint (no extra SDK needed).
 */
async function callGroq(
  key: ApiKeyRecord,
  systemPrompt: string,
  messages: ChatTurn[],
  abortSignal?: AbortSignal
): Promise<string> {
  const model = key.model || 'openai/gpt-oss-20b'

  const openAiMessages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    ...messages
      .filter(m => m.content?.trim())
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content
      }))
  ]

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    signal: abortSignal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key.api_key}`
    },
    body: JSON.stringify({
      model,
      messages: openAiMessages,
      temperature: 0.75,
      max_tokens: 2048
    })
  })

  const data: any = await res.json()

  if (res.status === 429 || data.error?.code === 'rate_limit_exceeded') {
    throw new Error('QUOTA_EXCEEDED')
  }
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Groq error ${res.status}`)
  }

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('EMPTY_RESPONSE')
  return text
}

// ─── Error classification ─────────────────────────────────────────────────────

function isQuotaError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase()
  return (
    msg.includes('quota_exceeded') ||
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('exhausted') ||
    msg.includes('rate_limit')
  )
}

function isTransientError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase()
  return (
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('empty_response') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network error') ||
    msg.includes('load failed') ||
    msg.includes('connection') ||
    e?.name === 'TypeError'
  )
}

function isInvalidKeyError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase()
  return (
    msg.includes('400') ||
    msg.includes('403') ||
    msg.includes('api_key_invalid') ||
    msg.includes('invalid_api_key') ||
    msg.includes('forbidden') ||
    msg.includes('unauthorized')
  )
}

/**
 * True when the error indicates the MODEL name is invalid/deprecated (HTTP 404).
 * In this case the API key itself is fine — we should retry with the fallback model
 * rather than disabling or cooling-down the key.
 */
function isModelNotFoundError(e: any): boolean {
  const msg = (e?.message || '').toLowerCase()
  return (
    msg.includes('404') ||
    msg.includes('not found') ||
    msg.includes('model not found') ||
    msg.includes('is not found') ||
    msg.includes('does not exist')
  )
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

/**
 * Execute an AI chat call for the given feature.
 * Automatically looks up the assigned provider category, fetches available keys,
 * and rotates/falls back on errors.
 */
export async function executeAIChat(
  feature: FeatureKey,
  systemPrompt: string,
  messages: ChatTurn[],
  abortSignal?: AbortSignal
): Promise<string> {
  const category = await getRoutedCategory(feature)
  return executeAIChatForCategory(category, systemPrompt, messages, abortSignal)
}

/**
 * Execute an AI chat call using a specific provider category directly
 * (bypasses routing lookup — useful when category is already known).
 */
export async function executeAIChatForCategory(
  category: ProviderCategory,
  systemPrompt: string,
  messages: ChatTurn[],
  abortSignal?: AbortSignal
): Promise<string> {
  const keys = await getAvailableKeys(category)

  if (keys.length === 0) {
    // Graceful fallback: if the routed category has no keys, try 'gemini'
    if (category !== 'gemini') {
      console.warn(`[aiProvider] No keys for category "${category}", falling back to gemini`)
      const fallbackKeys = await getAvailableKeys('gemini')
      if (fallbackKeys.length > 0) {
        return runWithKeys(fallbackKeys, 'gemini', systemPrompt, messages, abortSignal)
      }
    }
    throw new Error('QUOTA_EXCEEDED')
  }

  return runWithKeys(keys, category, systemPrompt, messages, abortSignal)
}

async function runWithKeys(
  keys: ApiKeyRecord[],
  category: ProviderCategory,
  systemPrompt: string,
  messages: ChatTurn[],
  abortSignal?: AbortSignal
): Promise<string> {
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]

    try {
      let text: string

      if (category === 'groq') {
        text = await callGroq(key, systemPrompt, messages, abortSignal)
      } else {
        // 'gemini' | 'other' (try Gemini SDK for other — admin responsibility)
        // callGemini internally retries with GEMINI_FALLBACK_MODEL on 404
        text = await callGemini(key, systemPrompt, messages, abortSignal)
      }

      return text

    } catch (e: any) {
      if (e.name === 'AbortError' || abortSignal?.aborted) throw e

      console.warn(`[aiProvider] Key "${key.name}" error:`, e.message)

      if (isQuotaError(e)) {
        await setCooldown(key.id, COOLDOWN_QUOTA_MS)
        // Continue to next key
      } else if (isModelNotFoundError(e)) {
        // Model is invalid even after fallback retry — treat as transient,
        // not a key fault. Short cooldown so the key remains usable.
        await setCooldown(key.id, COOLDOWN_TRANSIENT_MS)
        // Continue to next key
      } else if (isTransientError(e)) {
        await setCooldown(key.id, COOLDOWN_TRANSIENT_MS)
        // Continue to next key
      } else if (isInvalidKeyError(e)) {
        await disableKey(key.id)
        // Continue to next key
      }
      // On last key, re-throw
      if (i === keys.length - 1) throw e
    }
  }

  throw new Error('QUOTA_EXCEEDED')
}

// ─── Simple text generation (for gemini.ts / AiAutoFill) ────────────────────

/**
 * Generate a single-turn text completion (no chat history).
 * Used by game auto-fill and AI ranking features.
 */
export async function generateText(
  feature: FeatureKey,
  prompt: string,
  modelOverride?: string,
  categoryOverride?: ProviderCategory
): Promise<string> {
  const category = categoryOverride ?? await getRoutedCategory(feature)
  const keys = await getAvailableKeys(category)

  if (keys.length === 0) {
    // Fallback: try gemini env key
    const envKey = typeof import.meta !== 'undefined'
      ? (import.meta as any).env?.VITE_GEMINI_API_KEY
      : undefined
    if (envKey) {
      const genAI = getGenAI(envKey)
      const model = genAI.getGenerativeModel({ model: modelOverride || 'gemini-flash-latest' })
      const result = await model.generateContent(prompt)
      return result.response.text()
    }
    throw new Error('No active API keys found')
  }

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    try {
      if (category === 'groq') {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 20000) // 20s timeout

        let res;
        try {
          res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key.api_key}`
            },
            body: JSON.stringify({
              model: modelOverride || key.model || 'openai/gpt-oss-20b',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.3,
              max_tokens: 2048
            }),
            signal: controller.signal
          })
        } finally {
          clearTimeout(timeoutId)
        }
        const data: any = await res.json()
        if (res.status === 429 || data.error?.code === 'rate_limit_exceeded') {
          await setCooldown(key.id, COOLDOWN_QUOTA_MS)
          if (i === keys.length - 1) throw new Error('QUOTA_EXCEEDED')
          continue
        }
        if (!res.ok || data.error) throw new Error(data.error?.message || 'Groq error')
        const text = data.choices?.[0]?.message?.content
        if (!text) throw new Error('EMPTY_RESPONSE')
        return text
      } else {
        const genAI = getGenAI(key.api_key)
        const modelStr = modelOverride || key.model || GEMINI_FALLBACK_MODEL
        const model = genAI.getGenerativeModel({ model: modelStr })
        try {
          const result = await model.generateContent(prompt)
          const text = result.response.text()
          if (!text) throw new Error('EMPTY_RESPONSE')
          return text
        } catch (geminiErr: any) {
          // Retry with stable fallback alias if the model name was rejected (404)
          if (isModelNotFoundError(geminiErr) && modelStr !== GEMINI_FALLBACK_MODEL) {
            console.warn(
              `[aiProvider] generateText: model "${modelStr}" 404 for key "${key.name}" — retrying with ${GEMINI_FALLBACK_MODEL}`
            )
            const fallbackModel = genAI.getGenerativeModel({ model: GEMINI_FALLBACK_MODEL })
            const result = await fallbackModel.generateContent(prompt)
            const text = result.response.text()
            if (!text) throw new Error('EMPTY_RESPONSE')
            return text
          }
          throw geminiErr
        }
      }
    } catch (e: any) {
      console.warn(`[aiProvider] generateText key "${key.name}" error:`, e.message)
      if (isQuotaError(e)) await setCooldown(key.id, COOLDOWN_QUOTA_MS)
      else if (isModelNotFoundError(e)) await setCooldown(key.id, COOLDOWN_TRANSIENT_MS)
      else if (isTransientError(e)) await setCooldown(key.id, COOLDOWN_TRANSIENT_MS)
      else if (isInvalidKeyError(e)) await disableKey(key.id)
      if (i === keys.length - 1) throw e
    }
  }

  throw new Error('QUOTA_EXCEEDED')
}
