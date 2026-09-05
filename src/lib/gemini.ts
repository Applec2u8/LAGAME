import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabase } from './supabase'

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
 * Generate content using the best available Gemini API key from the database.
 * If a key returns a 429 quota error, it automatically falls back to the next key.
 */
export async function generateGameData(prompt: string, modelOverride?: string): Promise<any> {
  // 1. Fetch all active keys
  const { data: keys, error } = await supabase
    .from('gemini_api_keys')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch API keys from database:', error.message)
    // We don't throw immediately, we'll try to fallback to .env
  }

  const now = new Date().getTime()
  
  // Filter keys where cooldown is null OR cooldown is in the past
  const availableKeys = (keys as GeminiKey[] || []).filter(k => {
    if (!k.cooldown_until) return true
    return new Date(k.cooldown_until).getTime() < now
  })

  // Fallback to ENV key if no active keys in DB
  const envKey = import.meta.env.VITE_GEMINI_API_KEY
  if (availableKeys.length === 0) {
    if (!envKey) {
      throw new Error('No active API keys found in the database, and no fallback in .env')
    }
    const genAI = new GoogleGenerativeAI(envKey)
    const modelStr = modelOverride || 'gemini-flash-latest'
    const model = genAI.getGenerativeModel({ model: modelStr })
    const result = await model.generateContent(prompt)
    return parseGeminiResponse(result.response.text())
  }

  // Loop through available DB keys sequentially
  for (let i = 0; i < availableKeys.length; i++) {
    const keyRecord = availableKeys[i]
    try {
      const genAI = new GoogleGenerativeAI(keyRecord.api_key)
      const modelStr = modelOverride || keyRecord.model || 'gemini-flash-latest'
      const model = genAI.getGenerativeModel({ model: modelStr })
      
      const result = await model.generateContent(prompt)
      return parseGeminiResponse(result.response.text())
      
    } catch (e: any) {
      console.error(`Gemini API Error for key ${keyRecord.name}:`, e)
      
      // If quota exceeded (429) or exhausted, set cooldown
      if (e.message?.includes('429') || e.message?.includes('Quota') || e.message?.toLowerCase().includes('exhausted')) {
        // Set cooldown to +24 hours
        const cooldownTime = new Date()
        cooldownTime.setHours(cooldownTime.getHours() + 24)
        
        await (supabase as any)
          .from('gemini_api_keys')
          .update({ cooldown_until: cooldownTime.toISOString() })
          .eq('id', keyRecord.id)
          
        console.warn(`Key ${keyRecord.name} is on cooldown until ${cooldownTime.toISOString()}`)
        
        if (i === availableKeys.length - 1) {
          throw new Error(`All available API keys have exhausted their quota. Last error: ${e.message}`)
        }
      } else {
        // Unrelated error (e.g. Invalid model, connection issue) -> try next key just in case, or throw?
        // It's safer to try next key if one key is completely broken.
        if (i === availableKeys.length - 1) {
          throw new Error(`Gemini API Error: ${e.message || 'Unknown error'}`)
        }
      }
    }
  }
}

function parseGeminiResponse(text: string) {
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(clean)
}
