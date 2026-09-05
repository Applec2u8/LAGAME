import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let supabaseClient: ReturnType<typeof createClient>

try {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} catch (e) {
  console.error('❌ Failed to initialize Supabase client:', e)
  supabaseClient = createClient('https://placeholder.supabase.co', 'placeholder')
}

export const supabase = supabaseClient

// ── Type helpers ──────────────────────────────────────────────────
export type Category = {
  id: string
  name: string
  slug: string
  created_at: string
}

export type SystemRequirements = {
  platforms?: string[]
  minimum: { os?: string; cpu?: string; ram?: string; gpu?: string; storage?: string; about?: string }
  recommended: { os?: string; cpu?: string; ram?: string; gpu?: string; storage?: string; about?: string }
}

export type Game = {
  id: string
  title: string
  slug: string
  description: string | null
  cover_image: string | null
  screenshots: string[]
  system_requirements: SystemRequirements
  category_id: string | null
  category_ids: string[] | null
  is_featured: boolean
  is_coming_soon?: boolean
  view_count: number
  file_size: string | null
  video_url: string | null
  created_at: string
  updated_at: string
  category?: Category
  download_links?: DownloadLink[]
}

export type DownloadLink = {
  id: string
  game_id: string
  cloud_name: string
  url: string
  sort_order: number
}

export type AdFormat = 'Popunder' | 'Smartlink' | 'Native Banner' | 'Social Bar' | 'Banner'

export type AdScriptItem = {
  code: string
  format: AdFormat
}

export type AdSettings = {
  id: string
  ad_url: string
  ad_scripts?: Array<string | AdScriptItem>
  countdown_seconds: number
  is_active: boolean
  updated_at: string
}

export type SiteView = {
  id: string
  platform: string
  visited_at: string
}

export type GameViewPlatform = {
  id: string
  game_id: string
  platform: string
  view_count: number
}

export const uploadImage = async (file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
  const filePath = `${fileName}`

  const { error: uploadError } = await supabase.storage.from('game-images').upload(filePath, file)
  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('game-images').getPublicUrl(filePath)
  return data.publicUrl
}
