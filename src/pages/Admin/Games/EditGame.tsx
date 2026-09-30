import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled from 'styled-components'
import { ArrowLeft, Save, Loader2, Plus, Minus, CheckCircle, AlertCircle, Image, Edit2, Search, Bot } from 'lucide-react'
import { supabase, uploadImage } from '../../../lib/supabase'
import ScreenshotSorter from '../../../components/ScreenshotSorter/ScreenshotSorter'
import type { Category } from '../../../lib/supabase'
import MultiSelectCategory from '../../../components/MultiSelectCategory'
import { generateGameData } from '../../../lib/gemini'
import { fetchSteamGridDbImages } from '../../../lib/steamgriddb'
import AiAutoFillCard from '../../../components/AiAutoFill/AiAutoFillCard'
import {
  AdminPage, PageHeader, PageTitle, BackBtn,
  Card, SectionLabel,
  Field, Label, Input, TextArea, Select,
  PrimaryBtn, IconBtn,
  Alert
} from '../adminStyles'

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getYouTubeId(url: string) {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&]{11})/);
  return match ? match[1] : null;
}

const CLOUD_OPTIONS = ['1fichier', 'Buzzheavier', 'DataNodes', 'Dropbox', 'Gofile', 'Google Drive', 'Hitfile', 'MEGA', 'MediaFire', 'Multiup', 'OneDrive', 'Pixeldrain', 'Turbobit', 'Zippyshare', 'Other']

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
const AddLinkBtn = styled.button`display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(124,58,237,0.1); border: 1px dashed rgba(124,58,237,0.3); border-radius: 8px; color: rgba(148,163,184,0.7); font-size: 13px; cursor: pointer; transition: all 0.15s; &:hover { background: rgba(124,58,237,0.15); color: #fff; }`
const SpecGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media(max-width:600px){grid-template-columns:1fr;}`
const TwoColGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media(max-width:600px){grid-template-columns:1fr; gap: 0;}`

const UploadBtn = styled.label`
  display: flex; align-items: center; justify-content: center; gap: 5px;
  padding: 7px 11px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3);
  border-radius: 8px; color: #e2e8f0; font-size: 12px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.3); }
  &.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
`
const FetchRow = styled.div`
  display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; align-items: center;
`
const FetchBtn = styled.button`
  flex-shrink: 0; display: flex; align-items: center; gap: 5px;
  padding: 7px 11px; background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; border-radius: 8px; color: #fff; font-size: 12px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: opacity 0.2s;
  &:hover { opacity: 0.9; } &:disabled { opacity: 0.5; cursor: not-allowed; }
`
const CoverPreview = styled.div`
  margin-top: 10px; width: 140px; height: 196px; border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(124,58,237,0.3); background: rgba(8,8,16,0.8);
`
const CoverImg = styled.img`width: 100%; height: 100%; object-fit: cover;`


type LinkItem = { id?: string; cloud_name: string; url: string; platform?: string }

export default function EditGame() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<Category[]>([])
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [fileSize, setFileSize] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [isFeatured, setIsFeatured] = useState(false)
  const [isComingSoon, setIsComingSoon] = useState(false)
  const [platforms, setPlatforms] = useState<string[]>(['windows'])
  const [minAbout, setMinAbout] = useState('')
  const [recAbout, setRecAbout] = useState('')
  const [screenshots, setScreenshots] = useState<string[]>([])
  const [newScreenshot, setNewScreenshot] = useState('')
  const [links, setLinks] = useState<LinkItem[]>([{ cloud_name: 'Google Drive', url: '', platform: 'windows' }])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [steamAutoLoading, setSteamAutoLoading] = useState(false)
  // Upload state — files are staged locally, uploaded only on Save
  const [pendingCoverFile, setPendingCoverFile] = useState<File | null>(null)
  const [pendingScreenshotFiles, setPendingScreenshotFiles] = useState<Map<string, File>>(new Map())
  const [coverImgError, setCoverImgError] = useState(false)
  const [coverImgSrc, setCoverImgSrc] = useState('')

  const [aiQuery, setAiQuery] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState('')
  const [aiPreview, setAiPreview] = useState<any>(null)
  const [isApplying, setIsApplying] = useState(false)
  const [selectedModel, setSelectedModel] = useState('gemini-flash-latest')

  const handlePasteCover = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const url = text.trim()
      if (url && (url.startsWith('http') || url.startsWith('/'))) {
        setCoverImage(url); setPendingCoverFile(null); setCoverImgError(false)
      } else { alert('ไม่พบ URL รูปภาพใน Clipboard') }
    } catch { alert('ไม่สามารถอ่าน Clipboard ได้') }
  }

  // Sync cover preview src + reset error when URL changes
  useEffect(() => {
    setCoverImgSrc(coverImage)
    setCoverImgError(false)
  }, [coverImage])

  const handlePasteScreenshot = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const url = text.trim()
      if (url && (url.startsWith('http') || url.startsWith('/'))) {
        setScreenshots(s => [...s, url])
      } else { alert('ไม่พบ URL รูปภาพใน Clipboard') }
    } catch { alert('ไม่สามารถอ่าน Clipboard ได้') }
  }

  // Cover — stage locally only
  const handleUploadCover = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const localUrl = URL.createObjectURL(file)
    setCoverImage(localUrl)
    setPendingCoverFile(file)
    setCoverImgError(false)
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

  const addScreenshot = () => {
    if (newScreenshot.trim()) {
      setScreenshots(prev => [...prev, newScreenshot.trim()])
      setNewScreenshot('')
    }
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

      // 2. Cover fallback: Steam CDN (try portrait first, then header)
      if (!cover) {
        cover = `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`
      }
      setCoverImage(cover)
      setCoverImgError(false)

      // 3. Screenshots: try CORS proxy to get real screenshot list from Steam API
      if (screenshots.length === 0) {
        const steamApiUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=screenshots`
        const proxies = [
          `https://corsproxy.io/?url=${encodeURIComponent(steamApiUrl)}`,
          `https://api.allorigins.win/get?url=${encodeURIComponent(steamApiUrl)}`,
          `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(steamApiUrl)}`,
        ]
        for (const proxyUrl of proxies) {
          try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(6000) })
            if (!res.ok) continue
            const raw = await res.json()
            // allorigins wraps in { contents: "..." }
            const steamData = typeof raw?.contents === 'string' ? JSON.parse(raw.contents) : raw
            const appData = steamData[appId]?.data
            if (appData?.screenshots?.length > 0) {
              screenshots = appData.screenshots.map((s: any) =>
                (s.path_full as string).replace(/\\/g, '')
              )
              break
            }
          } catch { /* try next proxy */ }
        }
      }

      // 4. Last-resort: use Steam Store page header + capsule images as screenshots
      // These are guaranteed to exist if the appId is valid
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
      setCoverImgError(false)
    } finally {
      setSteamAutoLoading(false)
    }
  }

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
  "minimum_requirements": "OS: Windows 10 64-bit\\nCPU: Intel Core i5-8400\\nRAM: 8 GB\\nGPU: NVIDIA GTX 970",
  "recommended_requirements": "OS: Windows 10/11 64-bit\\nCPU: Intel Core i7-8700K\\nRAM: 16 GB\\nGPU: NVIDIA RTX 2080",
  "steam_app_id": 12120, // The numeric Steam App ID for the game (crucial for fetching real images, provide it if the game is on Steam)
  "cover_image": "URL to the official game cover",
  "screenshots": ["URL1", "URL2", "URL3"], // list of in-game screenshot URLs
  "is_featured": boolean // true if this is a AAA game, highly popular, or highly recommended masterpiece, otherwise false
}
IMPORTANT: Please try your best to provide the accurate 'steam_app_id' if the game exists on Steam.
Return ONLY the raw JSON object. No markdown, no code blocks, no explanation.`

      const data = await generateGameData(prompt, selectedModel)
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
          setLinks(prev => prev.map(l => ({ ...l, platform: `emul-${mainConsole}` })))
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

    if (aiPreview.genres && Array.isArray(aiPreview.genres)) {
      const newCategoryIds: string[] = []
      for (const gName of aiPreview.genres) {
        const existing = categories.find(c => c.name.toLowerCase() === gName.toLowerCase())
        if (existing) {
          newCategoryIds.push(existing.id)
        } else {
          try {
            const { data } = await supabase.from('categories').insert({ name: gName, slug: slugify(gName) } as any).select().single()
            if (data) {
              setCategories(prev => [...prev, data as Category].sort((a, b) => a.name.localeCompare(b.name)))
              newCategoryIds.push((data as Category).id)
            }
          } catch (e) { console.error('Failed to create category', e) }
        }
      }
      if (newCategoryIds.length > 0) setCategoryIds(prev => [...new Set([...prev, ...newCategoryIds])])
    }

    setIsApplying(false)
    setAiPreview(null)
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const [{ data: cats }, { data: game }, { data: dl }] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('games').select('*').eq('id', id!).single(),
        supabase.from('download_links').select('*').eq('game_id', id!).order('sort_order'),
      ])
      setCategories((cats as any) || [])
      if (game) {
        const g = game as any
        setTitle(g.title); setSlug(g.slug); setDescription(g.description || ''); setCoverImage(g.cover_image || ''); setIsFeatured(g.is_featured); setIsComingSoon(g.is_coming_soon || false)
        setFileSize(g.file_size || '')
        setVideoUrl(g.video_url || '')
        setCategoryIds(g.category_ids || (g.category_id ? [g.category_id] : []))
        setScreenshots(g.screenshots || [])
        const sr = g.system_requirements || {}
        setPlatforms(sr.platforms || ['windows'])
        setMinAbout(sr.minimum?.about || '')
        setRecAbout(sr.recommended?.about || '')
      }
      const parsedLinks = (dl as any)?.length ? (dl as any).map((link: any) => {
        let platform = link.platform || 'windows';
        let cloud_name = link.cloud_name;

        // Extract legacy platform tags like "[windows] Google Drive" or "[emul-ps2] Localhost"
        const match = cloud_name.match(/^\[(.*?)\]\s*(.*)$/)
        if (match) {
          platform = match[1]
          cloud_name = match[2]
        }

        return { ...link, platform, cloud_name };
      }) : [{ cloud_name: 'Google Drive', url: '', platform: 'windows' }];
      setLinks(parsedLinks)
      setLoading(false)
    }
    if (id) load()
  }, [id])

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


  const handleSave = async () => {
    if (!title.trim() || !id) return
    setSaving(true); setSaveMsg(null)
    try {
      // Upload staged cover file if any
      let finalCover = coverImage
      if (pendingCoverFile) {
        finalCover = await uploadImage(pendingCoverFile)
        URL.revokeObjectURL(coverImage)
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

      await (supabase.from('games') as any).update({
        title, slug, description, cover_image: finalCover || null,
        category_id: categoryIds[0] || null, category_ids: categoryIds.length > 0 ? categoryIds : null,
        is_featured: isFeatured, screenshots: finalScreenshots,
        is_coming_soon: isComingSoon,
        file_size: fileSize || null,
        video_url: videoUrl || null,
        system_requirements: {
          platforms,
          minimum: { about: minAbout },
          recommended: { about: recAbout },
        },
        updated_at: new Date().toISOString(),
      }).eq('id', id!)

      await supabase.from('download_links').delete().eq('game_id', id)
      const validLinks = links.filter(l => l.url.trim())
      if (validLinks.length > 0) {
        await supabase.from('download_links').insert(validLinks.map((l, i) => ({ game_id: id, cloud_name: `[${l.platform || 'windows'}] ${l.cloud_name}`, url: l.url.trim(), sort_order: i })) as any)
      }

      setSaveMsg({ type: 'success', text: 'Game updated successfully!' })
      setTimeout(() => navigate('/ap-admin/games'), 1200)
    } catch (e: any) {
      setSaveMsg({ type: 'error', text: e.message || 'Failed to update' })
    }
    setSaving(false)
  }

  if (loading) return <Loader2 />

  return (
    <AdminPage>
      <BackBtn onClick={() => navigate(-1)}><ArrowLeft size={14} /> กลับไปหน้าจัดการเกม</BackBtn>

      <PageHeader>
        <PageTitle>
          <Edit2 size={24} style={{ color: '#06b6d4' }} /> Edit Game
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
        />

        <SectionLabel>📋 Basic Info</SectionLabel>
        <TwoColGrid>
          <Field><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} /></Field>
          <Field><Label>File Size (Storage)</Label><Input placeholder="e.g. 50 GB" value={fileSize} onChange={e => setFileSize(e.target.value)} /></Field>
        </TwoColGrid>
        <Field><Label>Slug</Label><Input value={slug} onChange={e => setSlug(e.target.value)} /></Field>
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
        <Field><Label>Description</Label><TextArea value={description} onChange={e => setDescription(e.target.value)} /></Field>
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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: '12px' }}>
          <SectionLabel style={{ marginBottom: 0 }}><Image size={13} /> Media (Cover, Screenshots & Video)</SectionLabel>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', justifyContent: 'flex-start', '@media (minWidth: 480px)': { width: 'auto', justifyContent: 'flex-end' } } as any}>
            <FetchBtn type="button" onClick={handleSteamAutoFetch} disabled={steamAutoLoading} style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa', opacity: steamAutoLoading ? 0.6 : 1, flex: '1 1 auto', justifyContent: 'center' }}>
              {steamAutoLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Bot size={14} />} ดึงรูปจาก Steam (Auto)
            </FetchBtn>
            <FetchBtn type="button" onClick={handleSteamSearchTab} style={{ padding: '6px 12px', background: 'rgba(236,72,153,0.2)', border: '1px solid rgba(236,72,153,0.4)', color: '#f472b6', flex: '1 1 auto', justifyContent: 'center' }}>
              <Search size={14} /> ค้นหา (Manual)
            </FetchBtn>
            <FetchBtn type="button" onClick={handleSteamManualFetch} style={{ padding: '6px 12px', background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4', flex: '1 1 auto', justifyContent: 'center' }}>
              📋 กรอก URL เอง
            </FetchBtn>
          </div>
        </div>
        <Field>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: '8px' }}>
            <Label style={{ marginBottom: 0 }}>Video Trailer (YouTube URL)</Label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', width: '100%', '@media (minWidth: 480px)': { width: 'auto' } } as any}>
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
            <Input value={coverImage} onChange={e => { setCoverImage(e.target.value); setPendingCoverFile(null); setCoverImgError(false) }} style={{ flex: 1 }} />
            <FetchBtn onClick={handlePasteCover} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)' }} title="วาง URL จาก Clipboard">
              📋 วาง
            </FetchBtn>
            <UploadBtn>
              <Image size={14} /> เลือกไฟล์
              {pendingCoverFile && <span style={{ fontSize: 10, background: '#f59e0b', color: '#000', borderRadius: 4, padding: '1px 5px', marginLeft: 4 }}>Staged</span>}
              <input type="file" accept="image/*" hidden onChange={handleUploadCover} />
            </UploadBtn>
          </FetchRow>
          {coverImage && !coverImgError && (
            <CoverPreview>
              <CoverImg
                src={coverImgSrc}
                alt="cover"
                onLoad={() => setCoverImgError(false)}
                onError={() => {
                  const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(coverImage)}`
                  if (coverImgSrc !== proxy) {
                    setCoverImgSrc(proxy)
                  } else {
                    setCoverImgError(true)
                  }
                }}
              />
            </CoverPreview>
          )}
          {coverImage && coverImgError && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 12, color: '#f87171' }}>
              ⚠️ ไม่สามารถโหลดรูปได้ — ลองใช้ปุ่ม "เลือกไฟล์" หรือวาง URL อื่นแทนครับ
            </div>
          )}
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

        <Field><Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} /> Featured</Label></Field>

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
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Minimum</p>
            <Field><Label>About Minimum</Label><TextArea placeholder="Minimum requirements..." value={minAbout} onChange={e => setMinAbout(e.target.value)} /></Field>
          </div>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', marginBottom: 10 }}>Recommended</p>
            <Field><Label>About Recommended</Label><TextArea placeholder="Recommended requirements..." value={recAbout} onChange={e => setRecAbout(e.target.value)} /></Field>
          </div>
        </SpecGrid>

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
        <AddLinkBtn onClick={addLink}><Plus size={14} /> Add Link</AddLinkBtn>

        <PrimaryBtn onClick={handleSave} disabled={saving} style={{ width: '100%', justifyContent: 'center', marginTop: 24 }}>
          {saving ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={16} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </PrimaryBtn>
      </Card>
    </AdminPage>
  )
}
