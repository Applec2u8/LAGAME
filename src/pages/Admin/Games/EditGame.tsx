import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { ArrowLeft, Save, Loader2, Plus, Minus, CheckCircle, AlertCircle, Image, X, Wand2, Sparkles, Bot, Edit2 } from 'lucide-react'
import { supabase, uploadImage } from '../../../lib/supabase'
import ScreenshotSorter from '../../../components/ScreenshotSorter/ScreenshotSorter'
import type { Category } from '../../../lib/supabase'
import MultiSelectCategory from '../../../components/MultiSelectCategory'
import { generateGameData } from '../../../lib/gemini'
import { fetchSteamGridDbImages } from '../../../lib/steamgriddb'
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
  display: flex; gap: 8px; margin-bottom: 8px; align-items: center;
  @media (max-width: 480px) { flex-wrap: wrap; }
`
const AddLinkBtn = styled.button`display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(124,58,237,0.1); border: 1px dashed rgba(124,58,237,0.3); border-radius: 8px; color: rgba(148,163,184,0.7); font-size: 13px; cursor: pointer; transition: all 0.15s; &:hover { background: rgba(124,58,237,0.15); color: #fff; }`
const SpecGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 12px; @media(max-width:600px){grid-template-columns:1fr;}`
const TwoColGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media(max-width:600px){grid-template-columns:1fr; gap: 0;}`

const UploadBtn = styled.label`
  display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 14px; background: rgba(124,58,237,0.15); border: 1px solid rgba(124,58,237,0.3);
  border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer;
  white-space: nowrap; transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.3); }
  &.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
  @media (max-width: 480px) { padding: 10px 12px; font-size: 12px; }
`
const FetchRow = styled.div`
  display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;
  @media (max-width: 480px) { gap: 6px; }
`
const FetchBtn = styled.button`
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  padding: 10px 14px; background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; white-space: nowrap; transition: opacity 0.2s;
  &:hover { opacity: 0.9; } &:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (max-width: 480px) { padding: 10px 12px; font-size: 12px; }
`
const CoverPreview = styled.div`
  margin-top: 10px; width: 140px; height: 196px; border-radius: 8px; overflow: hidden;
  border: 1px solid rgba(124,58,237,0.3); background: rgba(8,8,16,0.8);
`
const CoverImg = styled.img`width: 100%; height: 100%; object-fit: cover;`

const AiBadge = styled.div`
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 10px; background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15));
  border: 1px solid rgba(124,58,237,0.3); border-radius: 999px;
  font-size: 11px; font-weight: 700; color: #a855f7; text-transform: uppercase; letter-spacing: 0.5px;
`
const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4), 0 0 20px rgba(124,58,237,0.1); }
  50% { box-shadow: 0 0 0 4px rgba(124,58,237,0.1), 0 0 40px rgba(124,58,237,0.2); }
`
const AiGenerateBtn = styled.button<{ $loading?: boolean }>`
  flex-shrink: 0; display: flex; align-items: center; gap: 8px;
  padding: 11px 20px;
  background: ${p => p.$loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)'};
  border: none; border-radius: 10px; color: #fff; font-size: 14px; font-weight: 700;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  white-space: nowrap; font-family: 'Noto Sans Lao', sans-serif;
  transition: all 0.2s;
  ${p => p.$loading ? '' : '&:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.4); }'}
  animation: ${p => p.$loading ? glowPulse : 'none'} 1.5s ease-in-out infinite;
`
const AiResultCard = styled.div`
  margin-top: 14px; padding: 16px; background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05));
  border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; font-size: 13px;
  color: rgba(148,163,184,0.8);
`
const AiResultRow = styled.div`display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;`
const AiResultKey = styled.span`color: #a855f7; font-weight: 700; min-width: 90px; flex-shrink: 0;`
const AiResultVal = styled.span`color: #e2e8f0; line-height: 1.5;`

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

  const handleSteamFetchMedia = async () => {
    const input = window.prompt('ใส่ Steam Store URL หรือ Steam App ID\n(เช่น 313690 หรือ https://store.steampowered.com/app/313690/...)')
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

    try {
      const sgdbImages = await fetchSteamGridDbImages('', Number(appId))
      if (sgdbImages.cover) setCoverImage(sgdbImages.cover)
      else setCoverImage(`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`)

      let screenshots = sgdbImages.screenshots
      if (screenshots.length === 0) {
        try {
          const steamUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=screenshots`
          const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(steamUrl)}`)
          const steamData = await res.json()
          const appData = steamData[appId]?.data
          if (appData?.screenshots?.length > 0) {
            screenshots = appData.screenshots.map((s: any) => s.path_full)
          }
        } catch { /* silent */ }
      }
      if (screenshots.length > 0) {
        setScreenshots(prev => Array.from(new Set([...prev, ...screenshots])))
      }
    } catch (err) {
      console.error('Failed to fetch media:', err)
      setCoverImage(`https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900.jpg`)
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
  "video_url": "YouTube trailer URL if available (optional)",
  "minimum_requirements": "OS: Windows 10 64-bit\\nCPU: Intel Core i5-8400\\nRAM: 8 GB\\nGPU: NVIDIA GTX 970",
  "recommended_requirements": "OS: Windows 10/11 64-bit\\nCPU: Intel Core i7-8700K\\nRAM: 16 GB\\nGPU: NVIDIA RTX 2080",
  "steam_app_id": 12120, // The numeric Steam App ID for the game (crucial for fetching real images, provide it if the game is on Steam)
  "cover_image": "URL to the official game cover",
  "screenshots": ["URL1", "URL2", "URL3"] (list of in-game screenshot URLs)
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
        let platform = 'windows';
        let cloud_name = link.cloud_name;
        if (cloud_name.startsWith('[windows] ')) {
          platform = 'windows';
          cloud_name = cloud_name.replace('[windows] ', '');
        } else if (cloud_name.startsWith('[macos] ')) {
          platform = 'macos';
          cloud_name = cloud_name.replace('[macos] ', '');
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
  const updateLink = (i: number, field: keyof LinkItem, val: string) => setLinks(l => l.map((item, idx) => idx === i ? { ...item, [field]: val } : item))

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
        <div style={{ background: 'rgba(124,58,237,0.05)', border: '1px dashed rgba(124,58,237,0.3)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <span style={{ margin: 0 }}><Bot size={15} /> AI Auto-Fill</span>
            <AiBadge><Sparkles size={10} /> Powered by Gemini</AiBadge>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', marginBottom: 12, lineHeight: 1.6 }}>
            พิมพ์ชื่อเกม แล้วกด <strong style={{ color: '#a855f7' }}>Generate</strong> — AI จะช่วยดึงข้อมูลและเติมให้ (ไม่ต้องกรอกเองทั้งหมด)
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <Input
                placeholder="Search game..."
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAiGenerate()}
              />
            </div>
            <Select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              style={{ width: 160, flexShrink: 0 }}
            >
              <option value="gemini-flash-latest">Flash (Latest)</option>
              <option value="gemini-2.5-flash">2.5 Flash</option>
              <option value="gemini-2.0-flash">2.0 Flash</option>
              <option value="gemini-pro-latest">Pro (Latest)</option>
            </Select>
            <AiGenerateBtn $loading={aiLoading} onClick={handleAiGenerate} disabled={aiLoading || !aiQuery.trim()} style={{ flexShrink: 0 }}>
              {aiLoading ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Wand2 size={16} />}
              {aiLoading ? 'Generating...' : 'Generate'}
            </AiGenerateBtn>
          </div>

          {aiError && (
            <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠️ {aiError}
            </p>
          )}

          {aiPreview && (
            <AiResultCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={11} /> AI Result Preview
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={handleAiApply}
                    disabled={isApplying}
                    style={{ padding: '6px 16px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: isApplying ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center', opacity: isApplying ? 0.7 : 1 }}
                  >
                    {isApplying ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <CheckCircle size={13} />}
                    {isApplying ? 'Applying...' : 'Apply to Form'}
                  </button>
                  <button
                    onClick={() => setAiPreview(null)}
                    style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>
              <AiResultRow><AiResultKey>🎮 Title</AiResultKey><AiResultVal>{aiPreview.title}</AiResultVal></AiResultRow>
              <AiResultRow><AiResultKey>🏷️ Genres</AiResultKey><AiResultVal>{(aiPreview.genres || []).join(', ')}</AiResultVal></AiResultRow>
              <AiResultRow><AiResultKey>💾 Size</AiResultKey><AiResultVal>{aiPreview.file_size}</AiResultVal></AiResultRow>
              <AiResultRow><AiResultKey>📝 Desc</AiResultKey><AiResultVal style={{ maxHeight: 80, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>{aiPreview.description}</AiResultVal></AiResultRow>
              <AiResultRow><AiResultKey>💻 Min Req</AiResultKey><AiResultVal style={{ whiteSpace: 'pre-line', fontSize: 12 }}>{aiPreview.minimum_requirements}</AiResultVal></AiResultRow>
            </AiResultCard>
          )}
        </div>

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <SectionLabel style={{ marginBottom: 0 }}><Image size={13} /> Media (Cover, Screenshots & Video)</SectionLabel>
          <FetchBtn type="button" onClick={handleSteamFetchMedia} style={{ padding: '6px 12px', background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.4)', color: '#a78bfa' }}>
            <Bot size={14} /> ดึงรูปจาก Steam
          </FetchBtn>
        </div>
        <Field>
          <Label>Video Trailer (YouTube URL)</Label>
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
            <Input placeholder="Screenshot URL..." value={newScreenshot} onChange={e => setNewScreenshot(e.target.value)} onKeyDown={e => e.key === 'Enter' && addScreenshot()} style={{ flex: 1 }} />
            <FetchBtn onClick={handlePasteScreenshot} style={{ padding: '10px 14px', background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.4)', color: '#06b6d4' }} title="วาง URL จาก Clipboard">
              📋 วาง
            </FetchBtn>
            <FetchBtn onClick={addScreenshot}><Plus size={14} /> Add URL</FetchBtn>
            <UploadBtn>
              <Image size={14} /> เลือกไฟล์
              <input type="file" accept="image/*" hidden multiple onChange={handleUploadScreenshot} />
            </UploadBtn>
          </FetchRow>
          {screenshots.length > 0 && (
            <ScreenshotSorter screenshots={screenshots} onChange={setScreenshots} />
          )}
        </Field>

        <Field><Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={isFeatured} onChange={e => setIsFeatured(e.target.checked)} /> Featured</Label></Field>

        <SectionLabel>💻 System Requirements</SectionLabel>
        <Field>
          <Label>Supported Platforms</Label>
          <div style={{ display: 'flex', gap: 16 }}>
            <Label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: '#e2e8f0' }}>
              <input type="checkbox" checked={platforms.includes('windows')} onChange={e => {
                if (e.target.checked) setPlatforms(p => [...p, 'windows'])
                else setPlatforms(p => p.filter(x => x !== 'windows'))
              }} />
              Windows
            </Label>
            <Label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, color: '#e2e8f0' }}>
              <input type="checkbox" checked={platforms.includes('macos')} onChange={e => {
                if (e.target.checked) setPlatforms(p => [...p, 'macos'])
                else setPlatforms(p => p.filter(x => x !== 'macos'))
              }} />
              macOS
            </Label>
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
            <Select value={link.platform || 'windows'} onChange={e => updateLink(i, 'platform', e.target.value)} style={{ width: 110, padding: '9px 12px' }}>
              <option value="windows">Windows</option>
              <option value="macos">macOS</option>
            </Select>
            <Input
              list="cloud-options"
              value={link.cloud_name}
              onChange={e => updateLink(i, 'cloud_name', e.target.value)}
              placeholder="Select or type..."
              style={{ width: 150, padding: '9px 12px' }}
            />
            <Input placeholder="https://..." value={link.url} onChange={e => updateLink(i, 'url', e.target.value)} />
            {links.length > 1 && <IconBtn onClick={() => removeLink(i)}><Minus size={14} /></IconBtn>}
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
