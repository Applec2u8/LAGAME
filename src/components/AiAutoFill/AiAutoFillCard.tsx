import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Bot, Sparkles, Loader2, Wand2, Check, Zap, Database, RefreshCw, X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react'
import { Input, Select } from '../../pages/Admin/adminStyles'
import { getAvailableKeys } from '../../lib/aiProvider'
import { searchGameGenerations } from '../../lib/gameGenerations'
import type { GameGenerationRecord } from '../../lib/gameGenerations'

// ─── Animations ───────────────────────────────────────────────────────────────

const glowPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
  70% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
  100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
`
const dropIn = keyframes`
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
`
const slideDown = keyframes`
  from { opacity: 0; max-height: 0; transform: translateY(-4px); }
  to   { opacity: 1; max-height: 800px; transform: translateY(0); }
`
const slideUp = keyframes`
  from { opacity: 1; max-height: 800px; }
  to   { opacity: 0; max-height: 0; }
`
const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.96) translateY(4px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
`

// ─── Styled Components ────────────────────────────────────────────────────────

const AiWrapper = styled.div`
  background: rgba(124,58,237,0.05); border: 1px dashed rgba(124,58,237,0.3); 
  border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;
`
const AiHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between; 
  margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
`
const AiBadge = styled.span<{ $provider?: string }>`
  background: ${p => p.$provider === 'groq' ? 'rgba(234,179,8,0.15)' : 'rgba(124,58,237,0.15)'}; 
  color: ${p => p.$provider === 'groq' ? '#fbbf24' : '#c084fc'}; 
  font-size: 10px; font-weight: 800; padding: 4px 8px; border-radius: 20px;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: flex; align-items: center; gap: 4px; transition: all 0.2s;
`
const AiInputRow = styled.div`
  display: flex; gap: 8px; align-items: center;
  @media (max-width: 640px) { flex-direction: column; align-items: stretch; }
`
const AiOptionRow = styled.div`
  display: flex; gap: 8px; align-items: center;
  @media (max-width: 640px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    width: 100%;
    & > :first-child {
      grid-column: 1 / -1;
      width: 100%;
      min-width: 0 !important;
    }
  }
`
const AiGenerateBtn = styled.button<{ $loading?: boolean }>`
  flex-shrink: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 14px;
  background: ${p => p.$loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)'};
  border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  white-space: nowrap; font-family: 'Noto Sans Lao', sans-serif; transition: all 0.2s;
  ${p => p.$loading ? '' : '&:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.4); }'}
  animation: ${p => p.$loading ? glowPulse : 'none'} 1.5s ease-in-out infinite;
  min-width: 90px;
  @media (max-width: 640px) {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    gap: 5px;
    border-radius: 8px;
  }
`
const FilterToggleBtn = styled.button<{ $active?: boolean }>`
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; gap: 5px;
  padding: 9px 12px; border-radius: 8px; font-size: 13px; font-weight: 700;
  cursor: pointer; white-space: nowrap; transition: all 0.2s;
  background: ${p => p.$active ? 'rgba(124,58,237,0.35)' : 'rgba(124,58,237,0.12)'};
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.8)' : 'rgba(124,58,237,0.35)'};
  color: ${p => p.$active ? '#e9d5ff' : '#cbd5e1'};
  &:hover { background: rgba(124,58,237,0.28); color: #fff; border-color: rgba(124,58,237,0.7); }
  @media (max-width: 640px) {
    width: 100%;
    padding: 8px 10px;
    font-size: 12px;
    gap: 4px;
    border-radius: 8px;
  }
`
const FilterPanel = styled.div<{ $open: boolean }>`
  overflow: hidden;
  ${p => p.$open
    ? css`animation: ${slideDown} 0.22s ease forwards; max-height: 9999px;`
    : css`animation: ${slideUp} 0.18s ease forwards; pointer-events: none; max-height: 0;`
  }
`
const FilterGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 6px;
  margin-top: 10px;
  padding: 12px 14px;
  background: rgba(124,58,237,0.04);
  border: 1px solid rgba(124,58,237,0.18);
  border-radius: 10px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
    padding: 10px 8px;
    gap: 4px;
  }
  @media (max-width: 360px) {
    grid-template-columns: 1fr;
  }
`
const FilterCheckItem = styled.label`
  display: flex; align-items: center; gap: 7px;
  padding: 6px 8px; border-radius: 7px; cursor: pointer;
  font-size: 12px; color: rgba(148,163,184,0.8); font-weight: 600;
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.1); color: #e2e8f0; }
  @media (max-width: 640px) {
    padding: 5px 6px;
    font-size: 11px;
    gap: 5px;
  }
`
const AiResultCard = styled.div`
  margin-top: 14px; padding: 16px;
  background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05));
  border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; font-size: 13px;
  color: rgba(148,163,184,0.8);
  @media (max-width: 640px) {
    padding: 12px;
  }
`
const AiResultRow = styled.div`display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;`
const AiResultKey = styled.span`color: #a855f7; font-weight: 700; min-width: 90px; flex-shrink: 0;`
const AiResultVal = styled.span`color: #e2e8f0; line-height: 1.5;`
const ApplyBtn = styled.button<{ $loading?: boolean }>`
  width: 100%; margin-top: 16px; padding: 12px;
  background: ${p => p.$loading ? 'rgba(16,185,129,0.3)' : '#10b981'};
  color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px;
  transition: all 0.2s;
  ${p => p.$loading ? '' : '&:hover { background: #059669; transform: translateY(-1px); }'}
  @media (max-width: 640px) {
    padding: 9px 12px;
    font-size: 12px;
    margin-top: 12px;
  }
`
const CancelBtn = styled.button`
  width: 100%; margin-top: 8px; padding: 10px;
  background: transparent; color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);
  border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;
  &:hover { background: rgba(148,163,184,0.1); color: #fff; }
  @media (max-width: 640px) {
    padding: 8px 12px;
    font-size: 12px;
    margin-top: 6px;
  }
`

// Autocomplete
const SearchWrap = styled.div`position: relative; flex: 1; min-width: 0;`
const SuggestionList = styled.ul`
  position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 999;
  background: #0f0f1e; border: 1px solid rgba(124,58,237,0.3); border-radius: 10px;
  padding: 4px; margin: 0; list-style: none;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  animation: ${dropIn} 0.15s ease;
  max-height: 260px; overflow-y: auto;
`
const SuggestionItem = styled.li<{ $active?: boolean }>`
  padding: 8px 12px; border-radius: 7px; cursor: pointer;
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  transition: background 0.12s;
  &:hover { background: rgba(124,58,237,0.15); }
`
const SuggestionTitle = styled.div`
  font-size: 13px; font-weight: 600; color: #e2e8f0;
  display: flex; align-items: center; gap: 6px;
`
const SuggestionMeta = styled.div`font-size: 11px; color: rgba(148,163,184,0.5); margin-top: 2px;`
const CachedBadge = styled.span`
  font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 2px 6px; border-radius: 20px;
  background: rgba(16,185,129,0.15); color: #34d399;
  border: 1px solid rgba(16,185,129,0.3);
`
const RegenerateBtn = styled.button`
  width: 100%; margin-top: 8px; padding: 10px;
  background: transparent; border: 1px solid rgba(124,58,237,0.3);
  border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;
  color: #a78bfa; display: flex; align-items: center; justify-content: center; gap: 7px;
  transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.15); border-color: rgba(124,58,237,0.5); }
`

// ── New: Collapsible + Checkbox Styles ─────────────────────────────────────────

const CollapseHeader = styled.button`
  width: 100%; display: flex; align-items: center; justify-content: space-between;
  background: none; border: none; cursor: pointer; padding: 0;
  margin-bottom: 0;
`
const CollapseBody = styled.div<{ $open: boolean }>`
  overflow: hidden;
  ${p => p.$open
    ? css`animation: ${slideDown} 0.25s ease forwards; max-height: 9999px;`
    : css`animation: ${slideUp} 0.2s ease forwards; pointer-events: none; max-height: 0;`
  }
  overflow: hidden;
`

const CheckBox = styled.input.attrs({ type: 'checkbox' })`
  width: 15px; height: 15px; margin-top: 3px; flex-shrink: 0; cursor: pointer;
  accent-color: #7c3aed;
`
const SuccessToast = styled.div`
  margin-top: 10px; padding: 10px 14px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.1));
  border: 1px solid rgba(16,185,129,0.3); color: #34d399;
  display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;
  animation: ${fadeIn} 0.3s ease;
`
// Responsive field row: stacks on mobile
const FieldItem = styled.div`
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 6px;
  background: rgba(124,58,237,0.04);
  border: 1px solid rgba(124,58,237,0.1);
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.08); }
`
const FieldTopRow = styled.div`
  display: flex; align-items: center; gap: 8px;
`
const FieldLabelText = styled.span<{ $dim: boolean }>`
  font-size: 12px; font-weight: 700; color: #a855f7;
  opacity: ${p => p.$dim ? 0.35 : 1}; transition: opacity 0.2s; flex: 1;
  display: flex; align-items: center; gap: 4px;
`
const FieldValueRow = styled.div<{ $dim: boolean }>`
  margin-top: 4px; padding-left: 23px;
  opacity: ${p => p.$dim ? 0.25 : 1}; transition: opacity 0.2s;
`
const FieldValueText = styled.span<{ $expanded: boolean; $isDesc: boolean }>`
  font-size: 12px; color: #e2e8f0; line-height: 1.5;
  display: block;
  word-break: break-word;
  white-space: pre-wrap;
  ${p => !p.$expanded
    ? `display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;`
    : p.$isDesc
      ? `max-height: 160px; overflow-y: auto; padding-right: 4px;
         scrollbar-width: thin; scrollbar-color: rgba(124,58,237,0.4) transparent;
         &::-webkit-scrollbar { width: 4px; }
         &::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.4); border-radius: 4px; }
         &::-webkit-scrollbar-track { background: transparent; }`
      : ``
  }
`
const ExpandBtn = styled.button`
  margin-top: 3px; padding: 0; background: none; border: none;
  color: #7c3aed; font-size: 11px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; gap: 3px;
  &:hover { color: #a855f7; }
`

// ─── Field keys type ──────────────────────────────────────────────────────────

export type FieldKey =
  | 'title'
  | 'size'
  | 'slug'
  | 'genres'
  | 'description'
  | 'platform'
  | 'videoTrailer'
  | 'coverImage'
  | 'screenshots'
  | 'links'

export interface CacheFieldSelection {
  title: boolean
  size: boolean
  slug: boolean
  genres: boolean
  description: boolean
  platform: boolean
  videoTrailer: boolean
  coverImage: boolean
  screenshots: boolean
  links?: boolean
}

export const AI_FILTER_STORAGE_KEY = 'la_game_ai_filter_prefs'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  aiQuery: string
  setAiQuery: (v: string) => void
  selectedModel: string
  setSelectedModel: (v: string) => void
  aiLoading: boolean
  isApplying: boolean
  aiError: string
  aiPreview: any
  /** Called with the active field selection so parent can filter what AI generates */
  onGenerate: (fields: CacheFieldSelection) => void
  onApply: (fields?: CacheFieldSelection) => void
  onCancel: () => void
  /** Called when user toggles any field in the filter */
  onFilterChange?: (fields: CacheFieldSelection) => void
  /** Called when user selects a cached record — parent should apply it with field selection */
  onApplyCache?: (record: GameGenerationRecord, fields: CacheFieldSelection) => void
}

interface KeyOption { value: string; label: string; provider: 'gemini' | 'groq' }

export const DEFAULT_FIELDS: CacheFieldSelection = {
  title: true,
  size: true,
  slug: true,
  genres: true,
  description: true,
  platform: true,
  videoTrailer: true,
  coverImage: true,
  screenshots: true,
  links: true,
}

export function loadSavedAiFilter(): CacheFieldSelection {
  try {
    const raw = localStorage.getItem(AI_FILTER_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      delete parsed.images // remove legacy key
      return { ...DEFAULT_FIELDS, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to load saved AI filter preferences', e)
  }
  return DEFAULT_FIELDS
}

export const FIELD_LABELS: { key: FieldKey; emoji: string; label: string }[] = [
  { key: 'title',        emoji: '🎮', label: 'Title (Game title)' },
  { key: 'size',         emoji: '💾', label: 'File Size (Storage size)' },
  { key: 'slug',         emoji: '🔤', label: 'Slug (URL slug)' },
  { key: 'genres',       emoji: '🏷️', label: 'Category (Game category)' },
  { key: 'description',  emoji: '📝', label: 'Description (Game description)' },
  { key: 'platform',     emoji: '🕹️', label: 'Support Platforms' },
  { key: 'videoTrailer', emoji: '🎬', label: 'YouTube Video Trailer' },
  { key: 'coverImage',   emoji: '🖼️', label: 'Cover Image (Official)' },
  { key: 'screenshots',  emoji: '📸', label: 'Screenshots / Previews' },
  { key: 'links',        emoji: '🔗', label: 'Download Links' },
]

// ─── Expandable content line limits ─────────────────────────────────────────
const COLLAPSIBLE_FIELDS: FieldKey[] = ['description', 'title', 'genres', 'platform', 'slug']

// helper: derive slug from title (same logic as the form)
const slugify = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// ─── Full value (not truncated) for display ───────────────────────────────────
const getFullValue = (key: FieldKey, record: GameGenerationRecord): string => {
  switch (key) {
    case 'title':        return record.game_title || '—'
    case 'size':         return record.file_size || '—'
    case 'slug':         return slugify(record.game_title) || '—'
    case 'genres':       return (record.genres || []).join(', ') || '—'
    case 'description':  return record.description || '—'
    case 'platform':     return (record.platforms || []).join(', ').toUpperCase() || '—'
    case 'videoTrailer': return record.video_url || '—'
    case 'coverImage':   return record.cover_image ? '✓ Official Cover Image available' : '—'
    case 'screenshots':  return record.screenshots?.length ? `✓ ${record.screenshots.length} screenshot(s) available` : '—'
    case 'links':        return record.cached_download_links?.length
      ? `${record.cached_download_links.length} link(s): ${record.cached_download_links.map(l => l.cloud_name).join(', ')}`
      : '—'
  }
}

export default function AiAutoFillCard({
  aiQuery, setAiQuery, selectedModel, setSelectedModel,
  aiLoading, isApplying, aiError, aiPreview,
  onGenerate, onApply, onCancel, onFilterChange, onApplyCache
}: Props) {
  const [keyOptions, setKeyOptions]       = useState<KeyOption[]>([])
  const [loadingKeys, setLoadingKeys]     = useState(true)
  const [suggestions, setSuggestions]     = useState<GameGenerationRecord[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeIdx, setActiveIdx]         = useState(-1)
  const [searchTimer, setSearchTimer]     = useState<ReturnType<typeof setTimeout> | null>(null)
  const [cachedPreview, setCachedPreview] = useState<GameGenerationRecord | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLUListElement>(null)

  // ── New state (persisted via localStorage) ──────────────────────────────────
  const [isExpanded, setIsExpanded]       = useState(true)
  const [fieldSel, setFieldSel]           = useState<CacheFieldSelection>(loadSavedAiFilter)
  const [applyToast, setApplyToast]       = useState(false)
  const [expandedFields, setExpandedFields] = useState<Set<FieldKey>>(new Set())
  const [showFilterPanel, setShowFilterPanel] = useState(false)

  const selectedProvider = selectedModel.startsWith('groq:') ? 'groq' : 'gemini'
  const badgeLabel = selectedProvider === 'groq' ? 'Groq' : 'Gemini'

  // ── Load available API keys ─────────────────────────────────────────────────
  useEffect(() => {
    async function loadOptions() {
      setLoadingKeys(true)
      try {
        const [geminiKeys, groqKeys] = await Promise.all([
          getAvailableKeys('gemini'),
          getAvailableKeys('groq')
        ])
        const opts: KeyOption[] = []

        if (geminiKeys.length > 0) {
          const seen = new Set<string>()
          for (const k of geminiKeys) {
            const model = k.model || 'gemini-flash-latest'
            const val = `gemini:${model}`
            if (!seen.has(val)) { seen.add(val); opts.push({ value: val, label: `[Gemini] ${model}`, provider: 'gemini' }) }
          }
        } else {
          opts.push({ value: 'gemini:gemini-flash-latest', label: '[Gemini] Flash (Latest)', provider: 'gemini' })
          opts.push({ value: 'gemini:gemini-pro-latest',   label: '[Gemini] Pro (Latest)',   provider: 'gemini' })
        }
        if (groqKeys.length > 0) {
          const seen = new Set<string>()
          for (const k of groqKeys) {
            const model = k.model || 'openai/gpt-oss-20b'
            const val = `groq:${model}`
            if (!seen.has(val)) { seen.add(val); opts.push({ value: val, label: `[Groq] ${model}`, provider: 'groq' }) }
          }
        }

        setKeyOptions(opts)
        if (opts.length > 0 && !opts.find(o => o.value === selectedModel)) {
          setSelectedModel(opts[0].value)
          localStorage.setItem('la_game_last_ai_model', opts[0].value)
        }
      } catch (e) {
        console.error('AiAutoFillCard: failed to load providers', e)
      } finally {
        setLoadingKeys(false)
      }
    }
    loadOptions()
  }, [])

  // ── Debounced autocomplete search ───────────────────────────────────────────
  const handleQueryChange = useCallback((val: string) => {
    setAiQuery(val)
    setCachedPreview(null)
    setApplyToast(false)
    setActiveIdx(-1)

    if (searchTimer) clearTimeout(searchTimer)
    if (val.trim().length < 2) { setSuggestions([]); setShowSuggestions(false); return }

    const t = setTimeout(async () => {
      const results = await searchGameGenerations(val)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
    }, 300)
    setSearchTimer(t)
  }, [searchTimer, setAiQuery])

  // ── Keyboard navigation ─────────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); return }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); return }
      if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeIdx]); return }
      if (e.key === 'Escape') { setShowSuggestions(false); return }
    }
    if (e.key === 'Enter') onGenerate(fieldSel)
  }

  // ── Select a cached suggestion ──────────────────────────────────────────────
  const selectSuggestion = (record: GameGenerationRecord) => {
    setAiQuery(record.game_title)
    setSuggestions([])
    setShowSuggestions(false)
    setCachedPreview(record)
    setIsExpanded(true)
    // Preserve the user's saved filter preferences
    setFieldSel(loadSavedAiFilter())
    setApplyToast(false)
    setExpandedFields(new Set())
  }

  // ── Close suggestions on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
          listRef.current && !listRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Force regenerate (dismiss cached preview) ───────────────────────────────
  const handleForceRegenerate = () => {
    setCachedPreview(null)
    setApplyToast(false)
    setExpandedFields(new Set())
    onGenerate(fieldSel)
  }

  // ── Toggle a single checkbox ─────────────────────────────────────────────────
  const toggleField = (key: FieldKey) => {
    setFieldSel(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try {
        localStorage.setItem(AI_FILTER_STORAGE_KEY, JSON.stringify(next))
      } catch (e) {
        console.warn('Failed to save AI filter to localStorage', e)
      }
      onFilterChange?.(next)
      return next
    })
  }

  // ── Select all / none ────────────────────────────────────────────────────────
  const allChecked = Object.values(fieldSel).every(Boolean)
  const toggleAll  = () => {
    const next = !allChecked
    const updated: CacheFieldSelection = {
      title: next,
      size: next,
      slug: next,
      genres: next,
      description: next,
      platform: next,
      videoTrailer: next,
      coverImage: next,
      screenshots: next,
      links: next,
    }
    try {
      localStorage.setItem(AI_FILTER_STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save AI filter to localStorage', e)
    }
    setFieldSel(updated)
    onFilterChange?.(updated)
  }

  const selectedCount = Object.values(fieldSel).filter(Boolean).length

  // ── Toggle expanded field ────────────────────────────────────────────────────
  const toggleExpandField = (e: React.MouseEvent, key: FieldKey) => {
    e.stopPropagation()
    setExpandedFields(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // ── Apply with field selection ────────────────────────────────────────────────
  const handleApplyFromCache = () => {
    if (!cachedPreview) return
    onApplyCache?.(cachedPreview, fieldSel)
    // Show toast then auto-collapse
    setApplyToast(true)
    setTimeout(() => {
      setIsExpanded(false)
      setTimeout(() => {
        setCachedPreview(null)
        setApplyToast(false)
      }, 300)
    }, 1400)
  }


  return (
    <AiWrapper>
      <AiHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={15} style={{ color: '#a78bfa' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Auto-Fill</span>
        </div>
        <AiBadge $provider={selectedProvider}>
          {selectedProvider === 'groq' ? <Zap size={10} /> : <Sparkles size={10} />}
          Powered by {badgeLabel}
        </AiBadge>
      </AiHeader>
      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginBottom: 12, lineHeight: 1.5 }}>
        พิมพ์ชื่อเกม แล้วกด <strong style={{ color: '#a855f7' }}>Generate</strong> — AI จะช่วยดึงข้อมูลและเติมให้อัตโนมัติ (ชื่อ, คำอธิบาย, ประเภท, System Requirements)
      </p>

      <AiInputRow>
        {/* Search box with autocomplete */}
        <SearchWrap>
          <Input
            ref={inputRef}
            placeholder="Search game..."
            value={aiQuery}
            onChange={e => handleQueryChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
            style={{ margin: 0, width: '100%' }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <SuggestionList ref={listRef}>
              {suggestions.map((rec, i) => (
                <SuggestionItem
                  key={rec.id}
                  $active={i === activeIdx}
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(rec) }}
                >
                  <SuggestionTitle>
                    <Database size={11} style={{ color: '#34d399', flexShrink: 0 }} />
                    {rec.game_title}
                    <CachedBadge>Cached</CachedBadge>
                  </SuggestionTitle>
                  <SuggestionMeta>
                    {rec.genres?.slice(0, 3).join(', ')}
                    {rec.platforms?.length > 0 && ` · ${rec.platforms.join(', ').toUpperCase()}`}
                    {rec.file_size && ` · ${rec.file_size}`}
                  </SuggestionMeta>
                </SuggestionItem>
              ))}
            </SuggestionList>
          )}
        </SearchWrap>

        <AiOptionRow>
          <Select
            value={selectedModel}
            onChange={e => {
              setSelectedModel(e.target.value)
              localStorage.setItem('la_game_last_ai_model', e.target.value)
            }}
            style={{ flex: 1, minWidth: 150 }}
            disabled={loadingKeys}
          >
            {loadingKeys
              ? <option>Loading APIs...</option>
              : keyOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))
            }
          </Select>
          <AiGenerateBtn $loading={aiLoading} onClick={() => onGenerate(fieldSel)} disabled={aiLoading || !aiQuery.trim()}>
            {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Wand2 size={14} />}
            {aiLoading ? 'Generating...' : 'Generate'}
          </AiGenerateBtn>
          <FilterToggleBtn
            type="button"
            $active={showFilterPanel}
            onClick={() => setShowFilterPanel(p => !p)}
            title="Configure generation fields"
          >
            <SlidersHorizontal size={14} />
            <span>Filter {selectedCount < FIELD_LABELS.length ? `(${selectedCount})` : ''}</span>
            {showFilterPanel ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </FilterToggleBtn>
        </AiOptionRow>
      </AiInputRow>

      {/* ── Inline Filter Panel ─────────────────────────────────────────────── */}
      <FilterPanel $open={showFilterPanel}>
        <FilterGrid>
          {/* Header row */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(148,163,184,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <SlidersHorizontal size={10} /> Generation Filter
            </span>
            <button
              type="button"
              onClick={toggleAll}
              style={{ background: 'none', border: '1px solid rgba(124,58,237,0.4)', borderRadius: 5, color: '#a78bfa', fontSize: 11, fontWeight: 700, padding: '2px 8px', cursor: 'pointer' }}
            >
              {allChecked ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          {FIELD_LABELS.map(({ key, emoji, label }) => (
            <FilterCheckItem key={key} htmlFor={`gen-filter-${key}`}>
              <CheckBox
                id={`gen-filter-${key}`}
                checked={fieldSel[key]}
                onChange={() => toggleField(key)}
              />
              <span>{emoji} {label}</span>
            </FilterCheckItem>
          ))}
        </FilterGrid>
      </FilterPanel>

      {aiError && (
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />
          {aiError}
        </p>
      )}

      {/* ── Cached preview card ──────────────────────────────────────────────── */}
      {cachedPreview && !aiPreview && (
        <AiResultCard>
          {/* ── Collapsible header ── */}
          <CollapseHeader onClick={() => setIsExpanded(p => !p)}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#34d399', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Database size={11} />
              From cache · {new Date(cachedPreview.updated_at).toLocaleDateString()}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isExpanded ? <ChevronUp size={14} style={{ color: '#94a3b8' }} /> : <ChevronDown size={14} style={{ color: '#94a3b8' }} />}
              <button
                onClick={e => { e.stopPropagation(); setCachedPreview(null); setApplyToast(false) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.4)', padding: 4, display: 'flex' }}
              >
                <X size={12} />
              </button>
            </div>
          </CollapseHeader>

          {/* ── Collapsible body ── */}
          <CollapseBody $open={isExpanded}>
            <div style={{ marginTop: 12, marginBottom: 8 }}>
              {/* Select All toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px dashed rgba(124,58,237,0.2)' }}>
                <span style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Select fields to import
                </span>
                <button
                  onClick={toggleAll}
                  style={{
                    background: 'none', border: '1px solid rgba(124,58,237,0.4)',
                    borderRadius: 6, color: '#a78bfa', fontSize: 11, fontWeight: 700,
                    padding: '3px 8px', cursor: 'pointer',
                  }}
                >
                  {allChecked ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Field checkboxes — responsive mobile layout */}
              {FIELD_LABELS.map(({ key, emoji, label }) => {
                const value = getFullValue(key, cachedPreview)
                const isExpandable = COLLAPSIBLE_FIELDS.includes(key) && value.length > 60
                const isFieldExpanded = expandedFields.has(key)
                const dim = !fieldSel[key]
                return (
                  <FieldItem key={key}>
                    <FieldTopRow>
                      <CheckBox
                        id={`cache-field-${key}`}
                        checked={fieldSel[key]}
                        onChange={() => toggleField(key)}
                      />
                      <label htmlFor={`cache-field-${key}`} style={{ cursor: 'pointer', flex: 1, display: 'flex' }}>
                        <FieldLabelText $dim={dim}>
                          <span>{emoji}</span> {label}
                        </FieldLabelText>
                      </label>
                    </FieldTopRow>
                    <FieldValueRow $dim={dim}>
                      <FieldValueText $expanded={isFieldExpanded} $isDesc={key === 'description'}>
                        {value}
                      </FieldValueText>
                      {isExpandable && (
                        <ExpandBtn onClick={e => toggleExpandField(e, key)}>
                          {isFieldExpanded
                            ? <><ChevronUp size={10} /> ย่อ</>
                            : <><ChevronDown size={10} /> ดูเพิ่ม</>}
                        </ExpandBtn>
                      )}
                    </FieldValueRow>
                  </FieldItem>
                )
              })}
            </div>

            {/* Success toast */}
            {applyToast && (
              <SuccessToast>
                <Check size={15} />
                Applied selected fields successfully!
              </SuccessToast>
            )}

            {/* Action buttons */}
            {!applyToast && (
              <>
                <ApplyBtn
                  $loading={isApplying}
                  onClick={handleApplyFromCache}
                  disabled={isApplying || !Object.values(fieldSel).some(Boolean)}
                >
                  {isApplying
                    ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                    : <Check size={16} />}
                  {isApplying
                    ? 'Applying...'
                    : `Apply ${Object.values(fieldSel).filter(Boolean).length} field(s) from Cache`}
                </ApplyBtn>
                <RegenerateBtn onClick={handleForceRegenerate} disabled={aiLoading}>
                  <RefreshCw size={13} />
                  Generate Fresh (call AI)
                </RegenerateBtn>
              </>
            )}
          </CollapseBody>
        </AiResultCard>
      )}

      {/* ── Fresh AI preview card ─────────────────────────────────────────────── */}
      {aiPreview && !cachedPreview && (
        <AiResultCard>
          <div style={{ marginBottom: 12, borderBottom: '1px dashed rgba(124,58,237,0.2)', paddingBottom: 12 }}>
            {fieldSel.title && <AiResultRow><AiResultKey>🎮 Title</AiResultKey><AiResultVal>{aiPreview.title || '—'}</AiResultVal></AiResultRow>}
            {fieldSel.size && <AiResultRow><AiResultKey>💾 Size</AiResultKey><AiResultVal>{aiPreview.file_size || '—'}</AiResultVal></AiResultRow>}
            {fieldSel.genres && <AiResultRow><AiResultKey>🏷️ Category</AiResultKey><AiResultVal>{(aiPreview.genres || []).join(', ') || '—'}</AiResultVal></AiResultRow>}
            {fieldSel.platform && <AiResultRow><AiResultKey>🕹️ Platform</AiResultKey><AiResultVal>{(aiPreview.platforms || []).join(', ').toUpperCase() || '—'}</AiResultVal></AiResultRow>}
            {fieldSel.videoTrailer && <AiResultRow><AiResultKey>🎬 Trailer</AiResultKey><AiResultVal>{aiPreview.video_url || 'YouTube Auto-search'}</AiResultVal></AiResultRow>}
            {fieldSel.coverImage && <AiResultRow><AiResultKey>🖼️ Cover</AiResultKey><AiResultVal>Official Cover Image</AiResultVal></AiResultRow>}
            {fieldSel.screenshots && <AiResultRow><AiResultKey>📸 Previews</AiResultKey><AiResultVal>In-game Screenshots</AiResultVal></AiResultRow>}
            {fieldSel.description && (
              <AiResultRow>
                <AiResultKey>📝 Desc</AiResultKey>
                <AiResultVal style={{ maxHeight: 70, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>
                  {aiPreview.description || '—'}
                </AiResultVal>
              </AiResultRow>
            )}
          </div>
          <ApplyBtn $loading={isApplying} onClick={() => onApply(fieldSel)} disabled={isApplying || selectedCount === 0}>
            {isApplying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
            {isApplying ? 'Applying & Fetching Images...' : `Apply Selected Fields (${selectedCount})`}
          </ApplyBtn>
          {!isApplying && <CancelBtn onClick={onCancel}>Cancel</CancelBtn>}
        </AiResultCard>
      )}
    </AiWrapper>
  )
}
