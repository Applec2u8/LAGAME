import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Plus, Minus, Save, ArrowLeft, Loader2, CheckCircle, AlertCircle, Image, Bot, Gamepad2, Search } from 'lucide-react'
import AiAutoFillCard from '../../../components/AiAutoFill/AiAutoFillCard'
import type { CacheFieldSelection } from '../../../components/AiAutoFill/AiAutoFillCard'
import CoverImagePicker from '../../../components/CoverImagePicker/CoverImagePicker'
import type { CoverOrientation } from '../../../components/CoverImagePicker/CoverImagePicker'
import ScreenshotSorter from '../../../components/ScreenshotSorter/ScreenshotSorter'
import { supabase } from '../../../lib/supabase'
import type { Category } from '../../../lib/supabase'
import MultiSelectCategory from '../../../components/MultiSelectCategory'
import { uploadImage } from '../../../lib/supabase'
import { generateGameData } from '../../../lib/gemini'
import { fetchSteamGridDbImages } from '../../../lib/steamgriddb'
import { upsertGameGeneration } from '../../../lib/gameGenerations'
import type { GameGenerationRecord } from '../../../lib/gameGenerations'
import { useFormDraft } from '../../../hooks/useFormDraft'
import {
  AdminPage, PageHeader, PageTitle, BackBtn,
  Card, SectionLabel,
  Field, Label, Input, TextArea, Select,
  PrimaryBtn, IconBtn,
  Alert
} from '../adminStyles'

const CLOUD_OPTIONS = ['1fichier', 'Buzzheavier', 'DataNodes', 'Dropbox', 'Gofile', 'Google Drive', 'Hitfile', 'MEGA', 'MediaFire', 'Multiup', 'OneDrive', 'Pixeldrain', 'Turbobit', 'Zippyshare', 'Other']

const FetchRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
  align-items: center;
`
const FetchBtn = styled.button`
  flex-shrink: 0; display: flex; align-items: center; gap: 5px;
  padding: 7px 11px; background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: opacity 0.2s;
  &:hover { opacity: 0.9; } &:disabled { opacity: 0.5; cursor: not-allowed; }
`


const UploadBtn = styled.label`
  display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px 11px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3);
  border-radius: 8px; color: #e2e8f0; font-size: 12px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.3); }
  &.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
`


const LinkRow = styled.div`
  display: grid;
  grid-template-columns: 130px 150px 1fr auto;
  gap: 8px; margin-bottom: 12px; align-items: center;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 8px;
  @media (max-width: 640px) { 
    grid-template-columns: 1fr 1fr;
    padding: 12px;
    & > :nth-child(3) { grid-column: 1 / -1; }
    & > :nth-child(4) { grid-column: 1 / -1; justify-self: stretch; }
  }
`
const AddLinkBtn = styled.button`
  display: flex; align-items: center; gap: 6px; padding: 8px 14px;
  background: rgba(124,58,237,0.1); border: 1px dashed rgba(124,58,237,0.3);
  border-radius: 8px; color: rgba(148,163,184,0.7); font-size: 13px; cursor: pointer; transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

const SpecGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media(max-width:600px){grid-template-columns:1fr;}`
const TwoColGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media(max-width:600px){grid-template-columns:1fr; gap: 0;}`



type LinkItem = { cloud_name: string; url: string; platform?: string }

interface AddGameDraft {
  title: string
  description: string
  fileSize: string
  videoUrl: string
  coverImage: string
  screenshots: string[]
  categoryIds: string[]
  isFeatured: boolean
  isComingSoon: boolean
  platforms: string[]
  minAbout: string
  recAbout: string
  links: LinkItem[]
}

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getYouTubeId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return match ? match[1] : null;
}

export default function AddGame() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  // Gemini AI search
  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiPreview, setAiPreview] = useState<any | null>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('la_game_last_ai_model') || 'gemini:gemini-flash-latest')
  // Form fields
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [newScreenshot, setNewScreenshot] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [isFeatured, setIsFeatured] = useState(false)
  const [isComingSoon, setIsComingSoon] = useState(false)
  // System requirements
  const [platforms, setPlatforms] = useState<string[]>(['windows'])
  const [minAbout, setMinAbout] = useState('')
  const [recAbout, setRecAbout] = useState('')
  // Download links
  const [links, setLinks] = useState<LinkItem[]>([{ cloud_name: 'Google Drive', url: '', platform: 'windows' }])
  // Save state
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [steamAutoLoading, setSteamAutoLoading] = useState(false)
  const [draftToast, setDraftToast] = useState(false)
  const draftToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Upload state  — files are staged locally, uploaded only on Save
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)
  const [pendingScreenshotFiles, setPendingScreenshotFiles] = useState<Map<string, File>>(new Map())
  const [coverOrientation, setCoverOrientation] = useState<CoverOrientation>('portrait')

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  // Auto-generate slug from title
  useEffect(() => { setSlug(slugify(title)) }, [title])


  // ── Draft persistence ──────────────────────────────────────────────────
  const { clearDraft } = useFormDraft<AddGameDraft>({
    storageKey: 'la_game_draft_addgame',
    state: { title, description, fileSize, videoUrl, coverImage, screenshots, categoryIds, isFeatured, isComingSoon, platforms, minAbout, recAbout, links },
    onRestore: (draft) => {
      if (draft.title) setTitle(draft.title)
      if (draft.description) setDescription(draft.description)
      if (draft.fileSize) setFileSize(draft.fileSize)
      if (draft.videoUrl) setVideoUrl(draft.videoUrl)
      if (draft.coverImage) setCoverImage(draft.coverImage)
      if (draft.screenshots?.length) setScreenshots(draft.screenshots)
      if (draft.categoryIds?.length) setCategoryIds(draft.categoryIds)
      if (typeof draft.isFeatured === 'boolean') setIsFeatured(draft.isFeatured)
      if (typeof draft.isComingSoon === 'boolean') setIsComingSoon(draft.isComingSoon)
      if (draft.platforms?.length) setPlatforms(draft.platforms)
      if (draft.minAbout) setMinAbout(draft.minAbout)
      if (draft.recAbout) setRecAbout(draft.recAbout)
      if (draft.links?.length) setLinks(draft.links)
      // Show toast after a short delay (state needs to settle first)
      draftToastTimer.current = setTimeout(() => {
        setDraftToast(true)
        draftToastTimer.current = setTimeout(() => setDraftToast(false), 4000)
      }, 400)
    },
  })

  // ── Fetch categories ───────────────────────────────────────────────────
  const handleAiGenerate = async () => {
    if (!aiQuery.trim()) return
    setAiLoading(true); setAiError(''); setAiPreview(null)
    try {
      const prompt = `You are a game database expert. Given the game name "${aiQuery.trim()}", return a JSON object with the following fields:
{
  "title": "official game title",
  "description": "a 2-3 paragraph description of the game (plot, gameplay, features)",
  "genres": ["genre1", "genre2"] (list of genres e.g. Action, RPG, Strategy, Sports, Racing, Shooter, Adventure, Simulation, Horror, Puzzle, Fighting, Platform),
  "file_size": "estimated game size e.g. 50 GB, 120 GB, 500 MB (just the number and unit)",
  "platforms": ["windows", "macos", "ps2", "ps3", "ps4", "ps5", "switch", "xbox"] (list of platforms the game supports, must use exactly these lowercase IDs if applicable),
  "video_url": "Accurate YouTube Game Trailer URL. MUST be a real, working watch URL. Priority: PS4 Trailer, then PS3 or PC Trailer.",
  "minimum_requirements": "OS: Windows 10 64-bit\nCPU: Intel Core i5-8400\nRAM: 8 GB\nGPU: NVIDIA GTX 970",
  "recommended_requirements": "OS: Windows 10/11 64-bit\nCPU: Intel Core i7-8700K\nRAM: 16 GB\nGPU: NVIDIA RTX 2080",
  "steam_app_id": 12120, // The numeric Steam App ID for the game (crucial for fetching real images, provide it if the game is on Steam)
  "cover_image": "URL to the official game cover",
  "screenshots": ["URL1", "URL2", "URL3"], // list of in-game screenshot URLs
  "is_featured": boolean // true if this is a AAA game, highly popular, or highly recommended masterpiece, otherwise false
}
IMPORTANT: Please try your best to provide the accurate 'steam_app_id' if the game exists on Steam.
Return ONLY the raw JSON object. No markdown, no code blocks, no explanation.`

      let provider: any = undefined;
      let modelOverride = selectedModel;
      if (selectedModel.includes(':')) {
        const parts = selectedModel.split(':');
        provider = parts[0] as 'gemini' | 'groq';
        modelOverride = parts.slice(1).join(':');
      }

      const data = await generateGameData(prompt, modelOverride, provider)
      setAiPreview(data)
    } catch (e: any) {
      console.error(e)
      setAiError(e.message || 'Failed to generate with AI')
    }
    setAiLoading(false)
  }

  const handleAiApply = async () => {
    if (!aiPreview) return
    setIsApplying(true)

    setTitle(aiPreview.title || title)
    if (aiPreview.title) setSlug(slugify(aiPreview.title))
    if (aiPreview.description) setDescription(aiPreview.description)
    if (aiPreview.file_size) setFileSize(aiPreview.file_size)
    if (aiPreview.video_url) setVideoUrl(aiPreview.video_url)
    if (aiPreview.minimum_requirements) setMinAbout(aiPreview.minimum_requirements)
    if (aiPreview.recommended_requirements) setRecAbout(aiPreview.recommended_requirements)
    if (aiPreview.platforms && Array.isArray(aiPreview.platforms) && aiPreview.platforms.length > 0) {
      setPlatforms(aiPreview.platforms)
      // Auto-set download link platform: if game is NOT on windows, pick emulator type
      const hasWindows = aiPreview.platforms.includes('windows')
      if (!hasWindows) {
        const consolePriority = ['ps4', 'ps5', 'ps3', 'ps2', 'switch', 'xbox']
        const mainConsole = consolePriority.find((c: string) => aiPreview.platforms.includes(c))
        if (mainConsole) {
          setLinks([{ cloud_name: 'Google Drive', url: '', platform: `emul-${mainConsole}` }])
        }
      }
    }

    if (aiPreview.is_featured === true) {
      setIsFeatured(true)
    }

    // Fetch real images from SteamGridDB (primary) then fallback to Steam CDN
    let steamCover = ''
    let steamScreenshots: string[] = []

    const gameName = aiPreview.title || aiQuery.trim()
    const steamAppId = aiPreview.steam_app_id ? Number(aiPreview.steam_app_id) : undefined

    try {
      const sgdbImages = await fetchSteamGridDbImages(gameName, steamAppId)
      if (sgdbImages.cover) steamCover = sgdbImages.cover
      if (sgdbImages.screenshots.length > 0) steamScreenshots = sgdbImages.screenshots
    } catch (err) {
      console.error('SteamGridDB fetch error:', err)
    }

    // Fallback to Steam CDN if SteamGridDB has no result
    if (!steamCover && steamAppId) {
      steamCover = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`
    }
    if (steamScreenshots.length === 0 && steamAppId) {
      try {
        const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&filters=screenshots`
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(steamUrl)}`)
        const steamData = await res.json()
        const appData = steamData[steamAppId]?.data
        if (appData?.screenshots?.length > 0) {
          steamScreenshots = appData.screenshots.slice(0, 8).map((s: any) => s.path_full)
        }
      } catch { /* silent */ }
    }

    if (steamCover) {
      setCoverImage(steamCover)
    } else if (aiPreview.cover_image) {
      setCoverImage(aiPreview.cover_image)
    }

    // Fetch real YouTube trailer instead of relying on AI hallucination
    let realTrailer = aiPreview.video_url || ''
    try {
      const searchQ = encodeURIComponent(`${gameName} Trailer PS4 PC PS5`)
      const ytUrl = `https://www.youtube.com/results?search_query=${searchQ}`
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(ytUrl)}`)
      const data = await res.json()
      const match = data.contents?.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (match && match[1]) {
        realTrailer = `https://www.youtube.com/watch?v=${match[1]}`
      }
    } catch (err) { console.error('YT Fetch Error', err) }

    if (realTrailer) setVideoUrl(realTrailer)

    if (steamScreenshots.length > 0) {
      setScreenshots(steamScreenshots)
    } else if (aiPreview.screenshots && Array.isArray(aiPreview.screenshots) && aiPreview.screenshots.length > 0) {
      setScreenshots(aiPreview.screenshots)
    }

    // Auto-match or create categories from genres
    if (aiPreview.genres && aiPreview.genres.length > 0) {
      const newCatIds: string[] = []
      const updatedCats = [...categories]
      for (const genreName of aiPreview.genres) {
        const name = genreName.trim()
        const slug = slugify(name)
        let existing = updatedCats.find(c => c.slug === slug || c.name.toLowerCase() === name.toLowerCase())
        if (!existing) {
          try {
            const { data } = await supabase.from('categories').insert({ name, slug } as any).select().single()
            if (data) { updatedCats.push(data as Category); existing = data as Category }
          } catch { /* skip dup */ }
        }
        if (existing && !newCatIds.includes(existing.id)) newCatIds.push(existing.id)
      }
      setCategories(updatedCats.sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryIds(newCatIds)
    }

    // Save to game_generations cache
    try {
      await upsertGameGeneration({
        game_title: aiPreview.title || aiQuery.trim(),
        genres: aiPreview.genres || [],
        platforms: aiPreview.platforms || [],
        file_size: aiPreview.file_size || '',
        description: aiPreview.description || '',
        cover_image: steamCover || aiPreview.cover_image || '',
        screenshots: steamScreenshots.length > 0 ? steamScreenshots : (aiPreview.screenshots || []),
        video_url: realTrailer,
        minimum_requirements: aiPreview.minimum_requirements || '',
        recommended_requirements: aiPreview.recommended_requirements || '',
        steam_app_id: steamAppId || null,
        is_featured: aiPreview.is_featured === true,
        cached_download_links: links.filter(l => l.url.trim()).length > 0
          ? links.map(l => ({ cloud_name: l.cloud_name, url: l.url.trim(), platform: l.platform || 'windows' }))
          : null
      })
    } catch (err) {
      console.error('Failed to cache generation:', err)
    }

    setIsApplying(false)
    setAiPreview(null)
  }

  const handleApplyCache = async (record: GameGenerationRecord, fields: CacheFieldSelection) => {
    if (fields.title) { setTitle(record.game_title); setSlug(slugify(record.game_title)) }
    if (fields.description && record.description) setDescription(record.description)
    if (fields.size && record.file_size) setFileSize(record.file_size)
    if (fields.images) {
      if (record.cover_image) setCoverImage(record.cover_image)
      if (record.screenshots?.length) setScreenshots(record.screenshots)
    }
    if (fields.platform && record.platforms?.length) setPlatforms(record.platforms)
    if (fields.size && record.minimum_requirements) setMinAbout(record.minimum_requirements)
    if (fields.size && record.recommended_requirements) setRecAbout(record.recommended_requirements)
    if (record.video_url) setVideoUrl(record.video_url)
    if (record.is_featured) setIsFeatured(true)

    // Restore cached download links if present
    if (fields.links) {
      if (record.cached_download_links?.length) {
        setLinks(record.cached_download_links)
      } else if (record.platforms?.length) {
        const hasWindows = record.platforms.includes('windows')
        if (!hasWindows) {
          const consolePriority = ['ps4', 'ps5', 'ps3', 'ps2', 'switch', 'xbox']
          const mainConsole = consolePriority.find((c: string) => record.platforms.includes(c))
          if (mainConsole) setLinks([{ cloud_name: 'Google Drive', url: '', platform: `emul-${mainConsole}` }])
        }
      }
    }

    // Auto-match categories (genres)
    if (fields.genres && record.genres?.length) {
      const newCatIds: string[] = []
      const updatedCats = [...categories]
      for (const genreName of record.genres) {
        const name = genreName.trim()
        const slugVal = slugify(name)
        let existing = updatedCats.find(c => c.slug === slugVal || c.name.toLowerCase() === name.toLowerCase())
        if (!existing) {
          try {
            const { data } = await supabase.from('categories').insert({ name, slug: slugVal } as any).select().single()
            if (data) { updatedCats.push(data as Category); existing = data as Category }
          } catch { /* skip dup */ }
        }
        if (existing && !newCatIds.includes(existing.id)) newCatIds.push(existing.id)
      }
      setCategories(updatedCats.sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryIds(newCatIds)
    }

    setAiPreview(null)
  }

  const addLink = () => setLinks(l => [...l, { cloud_name: 'Google Drive', url: '', platform: 'windows' }])
  const removeLink = (i: number) => setLinks(l => l.filter((_, idx) => idx !== i))
  const detectCloudName = (url: string): string => {
    const u = url.toLowerCase()
    if (u.includes('mega.nz') || u.includes('mega.co.nz')) return 'MEGA'
    if (u.includes('1fichier.')) return '1Fichier'
    if (u.includes('pixeldrain.')) return 'Pixeldrain'
    if (u.includes('mediafire.')) return 'MediaFire'
    if (u.includes('gofile.io')) return 'Gofile'
    if (u.includes('ranoz.')) return 'Ranoz'
    if (u.includes('dropbox.')) return 'Dropbox'
    if (u.includes('bowfile.')) return 'Bowfile'
    if (u.includes('frdl.')) return 'FRDL'
    if (u.includes('wdfiles.')) return 'WDFiles'
    if (u.includes('mxdrop.')) return 'MXDrop'
    if (u.includes('chomikuj.')) return 'Chomikuj'
    if (u.includes('vikingfile.')) return 'VikingFile'
    if (u.includes('hexload.')) return 'Hexload'
    if (u.includes('1cloudfile.')) return '1CloudFile'
    if (u.includes('usersdrive.')) return 'UsersDrive'
    if (u.includes('megaup.')) return 'MegaUp'
    if (u.includes('dailyuploads.')) return 'DailyUploads'
    if (u.includes('ddownload.')) return 'DDownload'
    if (u.includes('turbobit.')) return 'Turbobit'
    if (u.includes('nitroflare.')) return 'Nitroflare'
    if (u.includes('hitfile.')) return 'Hitfile'
    if (u.includes('multiup.')) return 'Multiup'
    if (u.includes('qiwi.')) return 'QIWI'
    if (u.includes('datanodes.')) return 'DataNodes'
    if (u.includes('drive.google.com')) return 'Google Drive'
    if (u.includes('1drv.ms') || u.includes('onedrive.live.')) return 'OneDrive'
    if (u.includes('buzzheavier.')) return 'Buzzheavier'
    if (u.includes('zippyshare.')) return 'Zippyshare'
    if (u.includes('down.')) return 'Down'
    // Fallback: extract readable domain name
    try {
      const hostname = new URL(url).hostname.replace('www.', '')
      const parts = hostname.split('.')
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1)
    } catch { return '' }
  }

  const updateLink = (i: number, field: keyof LinkItem, val: string) => {
    setLinks(l => l.map((item, idx) => {
      if (idx !== i) return item
      const updatedItem = { ...item, [field]: val }
      if (field === 'url' && val.trim()) {
        const detected = detectCloudName(val.trim())
        if (detected) updatedItem.cloud_name = detected
      }
      return updatedItem
    }))
  }


  const addScreenshot = () => {
    if (newScreenshot.trim()) { setScreenshots(s => [...s, newScreenshot.trim()]); setNewScreenshot('') }
  }

  const handleSteamAutoFetch = async () => {
    if (!title.trim()) {
      alert('กรุณากรอกชื่อเกมก่อน (Title) เพื่อใช้การค้นหาอัตโนมัติ')
      return
    }
    setSteamAutoLoading(true)
    try {
      // 1. Search Steam to get App ID
      const searchUrl = `https://store.steampowered.com/search/suggest?term=${encodeURIComponent(title)}&f=games&cc=US&realm=1&l=english`
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`
      const searchRes = await fetch(proxyUrl)
      const htmlText = await searchRes.text()

      const match = htmlText.match(/data-ds-appid="(\d+)"/)
      if (!match || !match[1]) {
        alert('ไม่พบเกมในระบบ Steam จากชื่อเกมนี้ (กรุณาลองแบบกรอก URL เอง)')
        setSteamAutoLoading(false)
        return
      }

      const appId = match[1]
      await processSteamAppId(appId)
    } catch (err) {
      console.error(err)
      alert('ระบบดึงข้อมูลมีปัญหา กรุณาลองกรอก URL เอง')
    }
    setSteamAutoLoading(false)
  }

  const handleSteamSearchTab = () => {
    if (title.trim()) {
      window.open(`https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`, '_blank')
    } else {
      window.open(`https://store.steampowered.com/`, '_blank')
    }
  }

  const handleSteamManualFetch = async () => {
    const input = window.prompt('ใส่ Steam Store URL หรือ Steam App ID\\n(เช่น 313690 หรือ https://store.steampowered.com/app/313690/...)')
    if (!input) return
    let appId = ''
    if (/^\d+$/.test(input.trim())) {
      appId = input.trim()
    } else {
      const match = input.match(/\/app\/(\d+)/)
      if (match) appId = match[1]
    }

    if (!appId) {
      alert('ไม่พบ App ID กรุณาตรวจสอบ URL หรือ ID อีกครั้ง')
      return
    }
    await processSteamAppId(appId)
  }

  const processSteamAppId = async (appId: string) => {
    setSteamAutoLoading(true)
    try {
      // 1. Try SteamGridDB proxy (works on production/Cloudflare)
      let cover = ''
      let screenshots: string[] = []

      try {
        const sgdbImages = await fetchSteamGridDbImages('', Number(appId))
        if (sgdbImages.cover) cover = sgdbImages.cover
        if (sgdbImages.screenshots.length > 0) screenshots = sgdbImages.screenshots
      } catch { /* SGDB unavailable in local dev - fall through */ }

      const libraryAssetUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
      let hasLibraryAsset = false
      if (!cover) {
        hasLibraryAsset = await new Promise((resolve) => {
          const img = new window.Image()
          img.onload = () => resolve(true)
          img.onerror = () => resolve(false)
          img.src = libraryAssetUrl
        })
      }

      // 2. Fetch from Steam API via our own proxy (works in Vite dev & Cloudflare Pages)
      try {
        const res = await fetch(`/steam-proxy/api/appdetails?appids=${appId}`)
        if (res.ok) {
          const steamData = await res.json()
          const appData = steamData[appId]?.data
          
          if (appData) {
            if (screenshots.length === 0 && appData.screenshots?.length > 0) {
              screenshots = appData.screenshots.map((s: any) => s.path_full)
            }
            if (!cover && appData.header_image) {
              cover = hasLibraryAsset ? libraryAssetUrl : appData.header_image
            }
          }
        }
      } catch (err) {
        console.error('Steam proxy failed:', err)
      }

      // 3. Cover fallback
      if (!cover) {
        cover = hasLibraryAsset ? libraryAssetUrl : `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`
      }
      setCoverImage(cover)

      // 4. Last-resort: use Steam Store page header + capsule images as screenshots
      if (screenshots.length === 0) {
        screenshots = [
          `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`,
          `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/capsule_616x353.jpg`,
          `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/hero_capsule.jpg`,
        ]
      }

      if (screenshots.length > 0) {
        setScreenshots(prev => Array.from(new Set([...prev, ...screenshots])))
      }
    } catch (err) {
      console.error('Failed to fetch Steam media:', err)
      setCoverImage(`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/header.jpg`)
    } finally {
      setSteamAutoLoading(false)
    }
  }

  const handlePasteScreenshot = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const url = text.trim()
      if (url && (url.startsWith('http') || url.startsWith('/'))) {
        setScreenshots(s => [...s, url])
      } else {
        alert('ไม่พบ URL รูปภาพใน Clipboard')
      }
    } catch { alert('ไม่สามารถอ่าน Clipboard ได้ รบกวนอนุญาตการเข้าถึง Clipboard ในเบราว์เซอร์') }
  }

  const handlePasteCover = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const url = text.trim()
      if (url && (url.startsWith('http') || url.startsWith('/'))) {
        setCoverImage(url)
        setPendingCoverFile(null)
      } else {
        alert('ไม่พบ URL รูปภาพใน Clipboard')
      }
    } catch { alert('ไม่สามารถอ่าน Clipboard ได้') }
  }

  // Cover — stage locally only
  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setCoverImage(localUrl)
    setPendingCoverFile(file)
    e.target.value = ''
  }

  // Screenshots — stage locally, support multi-select
  const handleUploadScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    const newMap = new Map(pendingScreenshotFiles)
    const newUrls: string[] = []
    files.forEach(file => {
      const localUrl = URL.createObjectURL(file)
      newMap.set(localUrl, file)
      newUrls.push(localUrl)
    })
    setPendingScreenshotFiles(newMap)
    setScreenshots(s => [...s, ...newUrls])
    e.target.value = ''
  }

  const handleSave = async () => {
    if (!title.trim()) return
    setSaving(true); setSaveMsg(null)
    try {
      // Upload staged cover file first if any
      let finalCover = coverImage
      if (pendingCoverFile) {
        finalCover = await uploadImage(pendingCoverFile)
        URL.revokeObjectURL(coverImage)
      }
      if (finalCover) {
        finalCover = finalCover.split('#')[0] + `#${coverOrientation}`
      }

      // Upload staged screenshot files
      const finalScreenshots = await Promise.all(
        screenshots.map(async url => {
          const file = pendingScreenshotFiles.get(url)
          if (file) {
            const uploaded = await uploadImage(file)
            URL.revokeObjectURL(url)
            return uploaded
          }
          return url
        })
      )

      const { data: gameData, error: gameErr } = await supabase.from('games').insert({
        title: title.trim(),
        slug: slug || slugify(title),
        description,
        file_size: fileSize || null,
        video_url: videoUrl || null,
        cover_image: finalCover || null,
        screenshots: finalScreenshots,
        category_id: categoryIds[0] || null,
        category_ids: categoryIds.length > 0 ? categoryIds : null,
        is_featured: isFeatured,
        is_coming_soon: isComingSoon,
        system_requirements: {
          platforms,
          minimum: { about: minAbout },
          recommended: { about: recAbout },
        },
      } as any).select().single()

      if (gameErr) throw gameErr

      const validLinks = links.filter(l => l.url.trim())
      if (validLinks.length > 0) {
        await supabase.from('download_links').insert(
          validLinks.map((l, i) => ({ game_id: (gameData as any).id, cloud_name: `[${l.platform || 'windows'}] ${l.cloud_name}`, url: l.url.trim(), sort_order: i })) as any
        )
      }

      // ── Sync final data back to game_generations cache ──────────────
      if (title.trim()) {
        try {
          await upsertGameGeneration({
            game_title: title.trim(),
            genres: categories.filter(c => categoryIds.includes(c.id)).map(c => c.name),
            platforms,
            file_size: fileSize || '',
            description: description || '',
            cover_image: finalCover || '',
            screenshots: finalScreenshots,
            video_url: videoUrl || '',
            minimum_requirements: minAbout || '',
            recommended_requirements: recAbout || '',
            steam_app_id: null,
            is_featured: isFeatured,
            cached_download_links: validLinks.length > 0
              ? validLinks.map(l => ({ cloud_name: l.cloud_name, url: l.url.trim(), platform: l.platform || 'windows' }))
              : null
          })
        } catch (cacheErr) {
          console.warn('Cache sync failed (non-critical):', cacheErr)
        }
      }

      clearDraft()
      setSaveMsg({ type: 'success', text: 'Game saved successfully!' })
      setTimeout(() => navigate('/ap-admin/games'), 1200)
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.message || 'Failed to save game' })
    }
    setSaving(false)
  }

  return (
    <AdminPage>
      <BackBtn onClick={() => navigate(-1)}><ArrowLeft size={14} /> กลับไปหน้าจัดการเกม</BackBtn>

      <PageHeader>
        <PageTitle>
          <Gamepad2 size={26} style={{ color: '#06b6d4' }} /> Add New Game
        </PageTitle>
      </PageHeader>

      <Card>
        {saveMsg && <Alert $type={saveMsg.type}>{saveMsg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}{saveMsg.text}</Alert>}

        {/* ── Gemini AI Auto-Fill ──────────────────────────────── */}
        <AiAutoFillCard
          aiQuery={aiQuery} setAiQuery={setAiQuery}
          selectedModel={selectedModel} setSelectedModel={setSelectedModel}
          aiLoading={aiLoading} isApplying={isApplying} aiError={aiError} aiPreview={aiPreview}
          onGenerate={handleAiGenerate} onApply={handleAiApply} onCancel={() => setAiPreview(null)}
          onApplyCache={handleApplyCache}
        />

        {/* ── Basic Info ─────────────────────────────── */}
        <SectionLabel>📋 Basic Info</SectionLabel>
        <TwoColGrid>
          <Field><Label>Title *</Label><Input placeholder="e.g. Elden Ring" value={title} onChange={e => setTitle(e.target.value)} /></Field>
          <Field><Label>File Size (Storage)</Label><Input placeholder="e.g. 50 GB" value={fileSize} onChange={e => setFileSize(e.target.value)} /></Field>
        </TwoColGrid>
        <Field>
          <Label>Slug (URL)</Label>
          <Input value={slug} onChange={e => setSlug(e.target.value)} />
        </Field>
        <Field>
          <Label>Category</Label>
          <MultiSelectCategory
            categories={categories}
            selectedIds={categoryIds}
            onChange={setCategoryIds}
            onAddCategory={async (name) => {
              try {
                const { data } = await supabase.from('categories').insert({ name, slug: slugify(name) } as any).select().single()
                if (data) {
                  setCategories(prev => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)))
                  setCategoryIds(prev => [...prev, (data as Category).id])
                }
              } catch (e) { console.error('Failed to add category', e) }
            }}
          />
        </Field>
        <Field><Label>Description</Label><TextArea placeholder="Game description..." value={description} onChange={e => setDescription(e.target.value)} /></Field>
        <Field>
          <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} />
            Featured Game
          </Label>
        </Field>
        <Field>
          <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="checkbox" checked={isComingSoon} onChange={e => setIsComingSoon(e.target.checked)} />
            <span>🚀 Coming Soon <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.5)', fontWeight: 400 }}>(ซ่อนปุ่มดาวน์โหลด, แสดง Coming Soon badge)</span></span>
          </Label>
        </Field>

        {/* ── Media (Cover, Screenshots & Video) ────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <SectionLabel style={{ marginBottom: 0 }}><Image size={13} /> Media (Cover, Screenshots & Video)</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <FetchBtn type="button" onClick={handleSteamAutoFetch} disabled={steamAutoLoading} style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', opacity: steamAutoLoading ? 0.6 : 1, flex: '1 1 auto', justifyContent: 'center' }}>
              {steamAutoLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Bot size={14} />} ดึงรูปจาก Steam (Auto)
            </FetchBtn>
            <FetchBtn type="button" onClick={handleSteamSearchTab} style={{ padding: '6px 12px', background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)', color: '#f472b6', flex: '1 1 auto', justifyContent: 'center' }}>
              <Search size={14} /> ค้นหา (Manual)
            </FetchBtn>
            <FetchBtn type="button" onClick={handleSteamManualFetch} disabled={steamAutoLoading} style={{ padding: '6px 12px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4', flex: '1 1 auto', justifyContent: 'center' }}>
              {steamAutoLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '📋'} กรอก URL เอง
            </FetchBtn>
          </div>
        </div>
        <Field>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <Label style={{ marginBottom: 0 }}>Video Trailer (YouTube URL)</Label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
              <FetchBtn type="button" onClick={() => {
                if (!title) return alert('กรุณาใส่ชื่อเกมที่ช่อง Title ก่อน');
                window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(title + ' Trailer PS3 PS4 PC Game')}`, '_blank');
              }} style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(220, 38, 38, 0.15)', border: '1px solid rgba(220, 38, 38, 0.4)', color: '#ef4444', flex: '1 1 auto', justifyContent: 'center' }}>
                <Search size={14} /> ค้นหา Trailer บน YouTube
              </FetchBtn>
              <FetchBtn type="button" onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text) setVideoUrl(text);
                } catch (err) {
                  alert('ไม่สามารถอ่าน Clipboard ได้ กรุณากดวางเอง (Ctrl+V)');
                }
              }} style={{ padding: '6px 10px', fontSize: 12, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4', flex: '1 1 auto', justifyContent: 'center' }}>
                📋 วาง URL
              </FetchBtn>
            </div>
          </div>
          <Input placeholder="e.g. https://www.youtube.com/watch?v=..." value={videoUrl} onChange={e => setVideoUrl(e.target.value)} />
          {getYouTubeId(videoUrl) && (
            <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.3)', background: '#000' }}>
              <iframe
                width="100%"
                height="280"
                src={`https://www.youtube.com/embed/${getYouTubeId(videoUrl)}`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ display: 'block' }}
              ></iframe>
            </div>
          )}
        </Field>
        <Field>
          <Label>Cover Image URL (or Upload)</Label>
          <FetchRow>
            <Input placeholder="https://..." value={coverImage} onChange={e => { setCoverImage(e.target.value); setPendingCoverFile(null) }} style={{ flex: 1 }} />
            <FetchBtn onClick={handlePasteCover} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)' }} title="วาง URL จาก Clipboard">
              📋 วาง
            </FetchBtn>
            <UploadBtn>
              <Image size={14} /> เลือกไฟล์
              {pendingCoverFile && <span style={{ fontSize: 10, background: '#f59e0b', color: '#000', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>Staged</span>}
              <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
            </UploadBtn>
          </FetchRow>
          <CoverImagePicker
            src={coverImage}
            orientation={coverOrientation}
            onOrientationChange={setCoverOrientation}
          />
        </Field>
        <Field>
          <Label>Screenshots (URL or Upload)</Label>
          <FetchRow>
            <Input placeholder="Screenshot URL... (กด Enter เพื่อเพิ่ม)" value={newScreenshot} onChange={e => setNewScreenshot(e.target.value)} onKeyDown={e => e.key === 'Enter' && addScreenshot()} style={{ flex: 1 }} />
            <FetchBtn onClick={handlePasteScreenshot} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4' }} title="วาง URL จาก Clipboard">
              📋 วาง
            </FetchBtn>
          </FetchRow>
          <ScreenshotSorter
            screenshots={screenshots}
            onChange={setScreenshots}
            onUpload={handleUploadScreenshot}
          />
        </Field>

        {/* ── System Requirements ────────────────────── */}
        <SectionLabel>💻 System Requirements</SectionLabel>
        <Field>
          <Label>Supported Platforms</Label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {['windows', 'macos', 'ps2', 'ps3', 'ps4', 'ps5', 'switch', 'xbox'].map(plat => (
              <Label key={plat} style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: '#e2e8f0', textTransform: plat === 'macos' ? 'none' : 'capitalize' }}>
                <input type="checkbox" checked={platforms.includes(plat)} onChange={e => {
                  if (e.target.checked) setPlatforms(p => [...p, plat])
                  else setPlatforms(p => p.filter(x => x !== plat))
                }} />
                {plat === 'macos' ? 'macOS' : plat === 'ps2' ? 'PS2' : plat === 'ps3' ? 'PS3' : plat === 'ps4' ? 'PS4' : plat === 'ps5' ? 'PS5' : plat === 'switch' ? 'Switch' : plat === 'xbox' ? 'Xbox' : 'Windows'}
              </Label>
            ))}
          </div>
        </Field>
        <SpecGrid>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Minimum</p>
            <Field><Label>About Minimum</Label><TextArea placeholder="Minimum requirements..." value={minAbout} onChange={e => setMinAbout(e.target.value)} /></Field>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Recommended</p>
            <Field><Label>About Recommended</Label><TextArea placeholder="Recommended requirements..." value={recAbout} onChange={e => setRecAbout(e.target.value)} /></Field>
          </div>
        </SpecGrid>

        {/* ── Download Links ─────────────────────────── */}
        <SectionLabel>☁️ Download Links</SectionLabel>
        {links.map((link, i) => (
          <LinkRow key={i}>
            <Select value={link.platform || 'windows'} onChange={e => updateLink(i, 'platform', e.target.value)} style={{ padding: '9px 10px', fontSize: 12 }}>
              <optgroup label="🖥️ PC">
                <option value="windows">Windows</option>
                <option value="macos">macOS</option>
              </optgroup>
              <optgroup label="🕹️ Emulator">
                <option value="emul-ps2">Emul: PS2</option>
                <option value="emul-ps3">Emul: PS3</option>
                <option value="emul-ps4">Emul: PS4</option>
                <option value="emul-ps5">Emul: PS5</option>
                <option value="emul-switch">Emul: Switch</option>
                <option value="emul-xbox">Emul: Xbox</option>
              </optgroup>
            </Select>
            <Input
              list="cloud-options"
              value={link.cloud_name}
              onChange={e => updateLink(i, 'cloud_name', e.target.value)}
              placeholder="Select or type..."
            />
            <Input placeholder="https://..." value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} />
            <IconBtn $danger onClick={() => removeLink(i)} style={{ opacity: links.length <= 1 ? 0.2 : 1 }} disabled={links.length <= 1}><Minus size={14} /></IconBtn>
          </LinkRow>
        ))}
        <datalist id="cloud-options">
          {CLOUD_OPTIONS.map(o => <option key={o} value={o} />)}
        </datalist>
        <AddLinkBtn onClick={addLink}><Plus size={14} /> Add Another Link</AddLinkBtn>

        {/* ── Save Actions ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <PrimaryBtn onClick={handleSave} disabled={saving} style={{ flex: 1, minWidth: 180, justifyContent: 'center' }}>
            {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={16} />}
            {saving ? 'Saving...' : 'Save Game'}
          </PrimaryBtn>
          <button
            onClick={() => {
              clearDraft()
              setTitle(''); setSlug(''); setDescription(''); setFileSize(''); setVideoUrl('')
              setCoverImage(''); setScreenshots([]); setCategoryIds([]); setIsFeatured(false)
              setIsComingSoon(false); setPlatforms(['windows']); setMinAbout(''); setRecAbout('')
              setLinks([{ cloud_name: 'Google Drive', url: '', platform: 'windows' }])
              setDraftToast(false)
            }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', background: 'rgba(248,113,113,0.1)',
              border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10,
              color: '#f87171', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            title="Clear all form data and remove saved draft"
          >
            🗑️ Clear Draft
          </button>
        </div>
      </Card>

      {/* ── Draft-Restored Toast ─────────────────────────────── */}
      {draftToast && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          background: 'linear-gradient(135deg, rgba(124,58,237,0.95), rgba(6,182,212,0.95))',
          backdropFilter: 'blur(12px)', borderRadius: 14,
          padding: '14px 20px', color: '#fff', fontSize: 13, fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          animation: 'slideInRight 0.3s ease',
          maxWidth: 340,
        }}>
          <span style={{ fontSize: 18 }}>💾</span>
          <div>
            <div>Draft Restored</div>
            <div style={{ fontWeight: 400, fontSize: 11, opacity: 0.85, marginTop: 2 }}>Previous session data has been recovered.</div>
          </div>
          <button onClick={() => setDraftToast(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, opacity: 0.7, padding: 4 }}>✕</button>
        </div>
      )}
    </AdminPage>
  )
}
