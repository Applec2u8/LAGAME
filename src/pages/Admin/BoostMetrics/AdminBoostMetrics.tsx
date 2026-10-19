import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import {
  Flame, ThumbsUp, Eye, Search, RefreshCw, CheckCircle2, AlertCircle,
  Sliders, ChevronLeft, ChevronRight, Save, Copy, Check, ExternalLink,
  X, BarChart3, Filter, Clock, Target, PlayCircle, PauseCircle, Trash2,
  Calendar, TrendingUp, Info, ListChecks,
  RotateCcw, Zap, Plus, ArrowUpDown, LayoutGrid, LayoutList, Database, Sparkles
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Game, Category } from '../../../lib/supabase'
import {
  getEffectiveViews,
  getEffectiveLikes,
  updateGameMetrics,
  batchUpdateGameMetrics,
} from '../../../lib/engagementService'

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface GameWithMetrics extends Game {
  currentViews: number
  currentLikes: number
  draftViews: number
  draftLikes: number
  categoryName?: string
  activeScheduleId?: string
}

interface ToastInfo {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

type IntervalUnit = 'minute' | 'hour' | 'day' | 'month'
type BoostMode = 'increment' | 'target'
type BoostScope = 'selected' | 'category' | 'all'

interface BoostSchedule {
  id: string
  scope: BoostScope
  game_ids: string[]
  category_id: string | null
  mode: BoostMode
  view_min: number
  view_max: number
  like_min: number
  like_max: number
  target_views: number | null
  target_likes: number | null
  interval_unit: IntervalUnit
  interval_value: number
  is_active: boolean
  label: string | null
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_views_added: number
  total_likes_added: number
  created_at: string
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const fmtTimeLeft = (next: string | null) => {
  if (!next) return '—'
  const diff = new Date(next).getTime() - Date.now()
  if (diff <= 0) return 'Due now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

const intervalLabel = (unit: IntervalUnit, val: number) => {
  const u = val === 1 ? unit : `${unit}s`
  return `Every ${val} ${u}`
}

/* ─── Default Schedule Draft ─────────────────────────────────────────────── */

type ScheduleDraft = Omit<BoostSchedule, 'id' | 'last_run_at' | 'next_run_at' | 'total_runs' | 'total_views_added' | 'total_likes_added' | 'created_at'>

const DEFAULT_DRAFT: ScheduleDraft = {
  scope: 'selected',
  game_ids: [],
  category_id: null,
  mode: 'increment',
  view_min: 20,
  view_max: 150,
  like_min: 5,
  like_max: 40,
  target_views: null,
  target_likes: null,
  interval_unit: 'hour',
  interval_value: 1,
  is_active: true,
  label: null,
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AdminBoostMetrics() {
  /* ── State ── */
  const [games, setGames] = useState<GameWithMetrics[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [schedules, setSchedules] = useState<BoostSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [schedLoading, setSchedLoading] = useState(false)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [batchSaving, setBatchSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'table' | 'schedules'>('table')
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table')

  const [search, setSearch] = useState('')
  const [selCat, setSelCat] = useState('all')
  const [sortBy, setSortBy] = useState<'views_desc' | 'views_asc' | 'likes_desc' | 'likes_asc' | 'newest' | 'title'>('views_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const [showModal, setShowModal] = useState(false)
  const [draft, setDraft] = useState<ScheduleDraft>({ ...DEFAULT_DRAFT })
  const [savingSched, setSavingSched] = useState(false)
  const [editSchedId, setEditSchedId] = useState<string | null>(null)
  const [showSqlModal, setShowSqlModal] = useState(false)

  const [fineGame, setFineGame] = useState<GameWithMetrics | null>(null)
  const [fineMode, setFineMode] = useState<'increment' | 'overwrite'>('increment')
  const [fineViews, setFineViews] = useState(250)
  const [fineLikes, setFineLikes] = useState(50)

  const [toasts, setToasts] = useState<ToastInfo[]>([])
  const [copiedSql, setCopiedSql] = useState(false)
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  /* ── Toast ── */
  const toast = useCallback((type: ToastInfo['type'], title: string, message: string) => {
    const id = Math.random().toString(36).slice(2, 9)
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4200)
  }, [])

  /* ── Fetch ── */
  const fetchSchedules = useCallback(async () => {
    setSchedLoading(true)
    try {
      const { data } = await (supabase as any)
        .from('boost_schedules')
        .select('*')
        .order('created_at', { ascending: false })
      if (data) {
        setSchedules(data as BoostSchedule[])
        const map = new Map<string, string>()
          ; (data as BoostSchedule[]).forEach(s => {
            if (s.is_active) s.game_ids?.forEach((id: string) => map.set(id, s.id))
          })
        setGames(p => p.map(g => ({ ...g, activeScheduleId: map.get(g.id) })))
      }
    } catch {
      /* table might not exist yet */
    } finally {
      setSchedLoading(false)
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [gr, cr] = await Promise.all([
        supabase.from('games').select('*, category:categories(id,name,slug)').order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
      ])
      if (cr.data) setCategories(cr.data as Category[])
      if (gr.data) {
        setGames((gr.data as any[]).map(g => {
          const v = getEffectiveViews(g)
          const l = getEffectiveLikes(g)
          return {
            ...g,
            currentViews: v,
            currentLikes: l,
            draftViews: v,
            draftLikes: l,
            categoryName: g.category?.name || 'Uncategorized',
          }
        }))
      }
    } catch (e: any) {
      toast('error', 'Load Error', e?.message)
    } finally {
      setLoading(false)
    }
    await fetchSchedules()
  }, [toast, fetchSchedules])

  useEffect(() => {
    fetchAll()
    tickerRef.current = setInterval(async () => {
      try {
        await (supabase as any).rpc('process_due_boost_schedules')
        await fetchSchedules()
      } catch {
        /* silent */
      }
    }, 60_000)
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [fetchAll, fetchSchedules])

  /* ── Computed ── */
  const filtered = useMemo(() =>
    games
      .filter(g => {
        const s = !search || g.title.toLowerCase().includes(search.toLowerCase())
        const c = selCat === 'all' || g.category_id === selCat || (g.category_ids && g.category_ids.includes(selCat))
        return s && c
      })
      .sort((a, b) => {
        switch (sortBy) {
          case 'views_desc': return b.currentViews - a.currentViews
          case 'views_asc': return a.currentViews - b.currentViews
          case 'likes_desc': return b.currentLikes - a.currentLikes
          case 'likes_asc': return a.currentLikes - b.currentLikes
          case 'title': return a.title.localeCompare(b.title)
          default: return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        }
      }),
    [games, search, selCat, sortBy]
  )

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => filtered.slice((page - 1) * pageSize, page * pageSize), [filtered, page, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const stats = useMemo(() => ({
    games: games.length,
    views: games.reduce((a, g) => a + g.currentViews, 0),
    likes: games.reduce((a, g) => a + g.currentLikes, 0),
    schedules: schedules.filter(s => s.is_active).length,
  }), [games, schedules])

  /* ── Selection ── */
  const toggleSelect = (id: string) =>
    setSelectedIds(p => {
      const n = new Set(p)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const togglePage = () => {
    const ids = paginated.map(g => g.id)
    const all = ids.every(id => selectedIds.has(id))
    setSelectedIds(p => {
      const n = new Set(p)
      all ? ids.forEach(id => n.delete(id)) : ids.forEach(id => n.add(id))
      return n
    })
  }

  const selectAllFilter = () => {
    setSelectedIds(new Set(filtered.map(g => g.id)))
    toast('info', 'Selected All', `${filtered.length} games selected`)
  }

  const clearSel = () => setSelectedIds(new Set())

  /* ── Edits ── */
  const updateDraft = (id: string, f: 'draftViews' | 'draftLikes', v: number) =>
    setGames(p => p.map(g => (g.id === id ? { ...g, [f]: Math.max(0, isNaN(v) ? 0 : Math.round(v)) } : g)))

  const quickInc = (id: string, vd: number, ld: number) =>
    setGames(p => p.map(g => (g.id !== id ? g : {
      ...g,
      draftViews: Math.max(0, g.draftViews + vd),
      draftLikes: Math.max(0, g.draftLikes + ld),
    })))

  /* ── Save single ── */
  const saveSingle = async (game: GameWithMetrics) => {
    setSavingId(game.id)
    const res = await updateGameMetrics(game.id, { views: game.draftViews, likes: game.draftLikes })
    if (res.success) {
      setGames(p => p.map(g => (g.id === game.id ? { ...g, currentViews: game.draftViews, currentLikes: game.draftLikes } : g)))
      toast('success', 'Changes Saved', `"${game.title}" updated to ${fmtNum(game.draftViews)} views · ${fmtNum(game.draftLikes)} likes`)
    } else {
      toast('error', 'Update Failed', res.error || 'Database error')
    }
    setSavingId(null)
  }

  /* ── Batch boost ── */
  const batchBoost = async (vd: number, ld: number) => {
    if (!selectedIds.size) {
      toast('info', 'No Games Selected', 'Please tick at least one game to boost.')
      return
    }
    setBatchSaving(true)
    const updates = games
      .filter(g => selectedIds.has(g.id))
      .map(g => ({ id: g.id, views: g.currentViews + vd, likes: g.currentLikes + ld }))
    const { successCount, failureCount } = await batchUpdateGameMetrics(updates)
    if (successCount) {
      const map = new Map(updates.map(u => [u.id, u]))
      setGames(p => p.map(g => {
        const u = map.get(g.id)
        return u ? { ...g, currentViews: u.views, draftViews: u.views, currentLikes: u.likes, draftLikes: u.likes } : g
      }))
      toast('success', `Boosted ${successCount} Games`, `+${fmtNum(vd)} views and +${ld} likes applied successfully`)
    }
    if (failureCount) {
      toast('warning', 'Partial Boost', `${failureCount} games could not be updated`)
    }
    setBatchSaving(false)
  }

  /* ── Fine modal ── */
  const applyFine = async () => {
    if (!fineGame) return
    const v = fineMode === 'increment' ? fineGame.currentViews + fineViews : fineViews
    const l = fineMode === 'increment' ? fineGame.currentLikes + fineLikes : fineLikes
    setSavingId(fineGame.id)
    const res = await updateGameMetrics(fineGame.id, { views: Math.max(0, v), likes: Math.max(0, l) })
    if (res.success) {
      setGames(p => p.map(g => (g.id === fineGame.id ? { ...g, currentViews: v, draftViews: v, currentLikes: l, draftLikes: l } : g)))
      toast('success', 'Metrics Updated', `"${fineGame.title}" set to ${fmtNum(v)} views · ${fmtNum(l)} likes`)
      setFineGame(null)
    } else {
      toast('error', 'Failed', res.error || 'Database error')
    }
    setSavingId(null)
  }

  /* ── Schedule CRUD ── */
  const saveSchedule = async () => {
    setSavingSched(true)
    try {
      const targetIds =
        draft.scope === 'selected' ? Array.from(selectedIds)
          : draft.scope === 'category' && draft.category_id
            ? games.filter(g => g.category_id === draft.category_id || (g.category_ids && g.category_ids.includes(draft.category_id!))).map(g => g.id)
            : games.map(g => g.id)

      if (targetIds.length === 0) {
        toast('warning', 'No Target Games', 'Target scope contains 0 games. Please select games or choose a category.')
        setSavingSched(false)
        return
      }

      const payload = {
        scope: draft.scope,
        game_ids: targetIds,
        category_id: draft.category_id,
        mode: draft.mode,
        view_min: draft.view_min,
        view_max: draft.view_max,
        like_min: draft.like_min,
        like_max: draft.like_max,
        target_views: draft.target_views,
        target_likes: draft.target_likes,
        interval_unit: draft.interval_unit,
        interval_value: draft.interval_value,
        is_active: draft.is_active,
        label: draft.label,
        next_run_at: new Date().toISOString(),
      }

      if (editSchedId) {
        const { error } = await (supabase as any).from('boost_schedules').update(payload).eq('id', editSchedId)
        if (error) throw error
        toast('success', 'Schedule Updated', 'Your changes have been saved.')
      } else {
        const { error } = await (supabase as any).from('boost_schedules').insert([payload])
        if (error) throw error
        toast('success', 'Schedule Created', 'Auto-boost background schedule is now running.')
      }

      setShowModal(false)
      setEditSchedId(null)
      await fetchSchedules()
    } catch (e: any) {
      toast('error', 'Save Failed', e?.message || 'Database error')
    } finally {
      setSavingSched(false)
    }
  }

  const toggleScheduleActive = async (s: BoostSchedule) => {
    const nextState = !s.is_active
    const { error } = await (supabase as any).from('boost_schedules').update({ is_active: nextState }).eq('id', s.id)
    if (!error) {
      setSchedules(p => p.map(item => (item.id === s.id ? { ...item, is_active: nextState } : item)))
      toast('info', nextState ? 'Schedule Resumed' : 'Schedule Paused', `Schedule is now ${nextState ? 'active' : 'paused'}`)
    }
  }

  const deleteSchedule = async (id: string) => {
    if (!window.confirm('Delete this boost schedule permanently?')) return
    const { error } = await (supabase as any).from('boost_schedules').delete().eq('id', id)
    if (!error) {
      setSchedules(p => p.filter(s => s.id !== id))
      toast('success', 'Deleted', 'Schedule removed successfully')
    }
  }

  const runScheduleNow = async (id: string) => {
    await (supabase as any).from('boost_schedules').update({ next_run_at: new Date().toISOString() }).eq('id', id)
      ; (supabase as any).rpc('process_due_boost_schedules').catch(() => { })
    toast('success', 'Triggered Now', 'Background boost execution started.')
    setTimeout(fetchAll, 2500)
  }

  const openEdit = (s: BoostSchedule) => {
    setEditSchedId(s.id)
    setDraft({
      scope: s.scope,
      game_ids: s.game_ids,
      category_id: s.category_id,
      mode: s.mode,
      view_min: s.view_min,
      view_max: s.view_max,
      like_min: s.like_min,
      like_max: s.like_max,
      target_views: s.target_views,
      target_likes: s.target_likes,
      interval_unit: s.interval_unit,
      interval_value: s.interval_value,
      is_active: s.is_active,
      label: s.label,
    })
    setShowModal(true)
  }

  const copySqlFiles = () => {
    navigator.clipboard.writeText('-- 1. Run boost_schedules_schema.sql\n-- 2. Run setup_pg_cron.sql\n-- Both files are inside src/lib/ folder')
    setCopiedSql(true)
    toast('info', 'SQL Copied', 'SQL instructions copied to clipboard')
    setTimeout(() => setCopiedSql(false), 2500)
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen text-slate-100 pb-28 font-sans relative overflow-x-hidden" style={{ background: '#0a0d18' }}>
      {/* Dynamic Background Mesh Orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full blur-[140px] opacity-20" style={{ background: 'radial-gradient(circle, #f97316 0%, #ec4899 100%)' }} />
        <div className="absolute top-1/3 -right-40 w-[600px] h-[600px] rounded-full blur-[160px] opacity-20" style={{ background: 'radial-gradient(circle, #6366f1 0%, #3b82f6 100%)' }} />
        <div className="absolute -bottom-40 left-1/4 w-[480px] h-[480px] rounded-full blur-[140px] opacity-15" style={{ background: 'radial-gradient(circle, #06b6d4 0%, #10b981 100%)' }} />
      </div>

      {/* Floating Notifications (Toast) */}
      <div className="fixed top-5 right-5 z-[300] flex flex-col gap-2.5 w-88 max-w-[calc(100vw-2.5rem)] pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            style={{ animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
            className={`pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all ${t.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-100 shadow-emerald-950/40'
              : t.type === 'error' ? 'bg-rose-950/90 border-rose-500/30 text-rose-100 shadow-rose-950/40'
                : t.type === 'warning' ? 'bg-amber-950/90 border-amber-500/30 text-amber-100 shadow-amber-950/40'
                  : 'bg-indigo-950/90 border-indigo-500/30 text-indigo-100 shadow-indigo-950/40'
              }`}
          >
            <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${t.type === 'success' ? 'bg-emerald-500/20 text-emerald-400'
              : t.type === 'error' ? 'bg-rose-500/20 text-rose-400'
                : t.type === 'warning' ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}>
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
              {t.type === 'error' && <AlertCircle className="w-4 h-4" />}
              {t.type === 'warning' && <AlertCircle className="w-4 h-4" />}
              {t.type === 'info' && <Info className="w-4 h-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm leading-tight text-white">{t.title}</p>
              <p className="text-xs opacity-80 mt-1 leading-relaxed">{t.message}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 relative z-10">
        {/* ═══════════════════════════════════════════════════════════════════
            TOP NAVIGATION & HEADER
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between mb-8 pb-6 border-b border-white/[0.06]">
          {/* Brand & Title */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 blur-md opacity-60 animate-pulse" />
              <div className="relative w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-orange-500 via-rose-500 to-purple-600 flex items-center justify-center shadow-xl border border-white/20">
                <Flame className="w-7 h-7 text-white drop-shadow-md" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Boost Metrics</h1>
                <span className="text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm">
                  Engagement Hub
                </span>
                {stats.schedules > 0 && (
                  <span className="flex items-center gap-1.5 text-[10px] sm:text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    {stats.schedules} Active Job{stats.schedules > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-normal">
                Optimize game views, likes &amp; background automation schedules
              </p>
            </div>
          </div>

          {/* Action Header Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
            <button
              onClick={() => setShowSqlModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition hover:border-purple-500/40"
              title="Database Setup & SQL Scripts"
            >
              <Database className="w-4 h-4 text-purple-400" />
              <span className="hidden sm:inline">DB Setup</span>
            </button>

            <button
              onClick={fetchAll}
              disabled={loading}
              className="p-2.5 rounded-xl text-slate-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition hover:text-white disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={() => {
                setShowModal(true)
                setEditSchedId(null)
                setDraft({ ...DEFAULT_DRAFT, scope: selectedIds.size > 0 ? 'selected' : 'all' })
              }}
              className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #e11d48 50%, #db2777 100%)',
                boxShadow: '0 8px 24px rgba(225,29,72,0.3)',
              }}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Schedule</span>
            </button>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            KEY PERFORMANCE METRICS (CARDS)
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-7">
          {[
            {
              label: 'Total Games',
              value: stats.games.toLocaleString(),
              subtext: 'Catalog games',
              icon: <BarChart3 className="w-5 h-5 text-indigo-400" />,
              border: 'border-indigo-500/20',
              bgGradient: 'from-indigo-500/10 via-indigo-500/5 to-transparent',
            },
            {
              label: 'Total Views',
              value: fmtNum(stats.views),
              subtext: `Avg ${fmtNum(stats.games ? Math.round(stats.views / stats.games) : 0)} / game`,
              icon: <Eye className="w-5 h-5 text-cyan-400" />,
              border: 'border-cyan-500/20',
              bgGradient: 'from-cyan-500/10 via-cyan-500/5 to-transparent',
            },
            {
              label: 'Total Likes',
              value: fmtNum(stats.likes),
              subtext: `Avg ${fmtNum(stats.games ? Math.round(stats.likes / stats.games) : 0)} / game`,
              icon: <ThumbsUp className="w-5 h-5 text-rose-400" />,
              border: 'border-rose-500/20',
              bgGradient: 'from-rose-500/10 via-rose-500/5 to-transparent',
            },
            {
              label: 'Auto Schedules',
              value: String(stats.schedules),
              subtext: `${schedules.length} total jobs created`,
              icon: <Zap className="w-5 h-5 text-amber-400" />,
              border: 'border-amber-500/20',
              bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
            },
          ].map((card, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-2xl border ${card.border} p-4 sm:p-5 transition-all duration-300 hover:scale-[1.01] hover:border-white/20`}
              style={{
                background: 'rgba(15, 20, 35, 0.65)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.bgGradient} pointer-events-none`} />
              <div className="relative flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] border border-white/[0.08]">
                  {card.icon}
                </div>
              </div>
              <div className="relative text-2xl sm:text-3xl font-black text-white tracking-tight tabular-nums">
                {card.value}
              </div>
              <div className="relative text-[11px] text-slate-400 font-medium mt-1">
                {card.subtext}
              </div>
            </div>
          ))}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB SWITCHER & VIEW LAYOUT TOGGLE
        ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          {/* Main Tabs */}
          <div
            className="flex items-center p-1 rounded-2xl border border-white/[0.08] w-fit shadow-inner"
            style={{ background: 'rgba(15, 20, 35, 0.75)', backdropFilter: 'blur(16px)' }}
          >
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'table'
                ? 'text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              style={activeTab === 'table' ? { background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', boxShadow: '0 4px 16px rgba(99,102,241,0.3)' } : {}}
            >
              <ListChecks className="w-4 h-4" />
              <span>Games Table</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-white/20 text-white">
                {filtered.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('schedules')}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${activeTab === 'schedules'
                ? 'text-white shadow-lg'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              style={activeTab === 'schedules' ? { background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)', boxShadow: '0 4px 16px rgba(225,29,72,0.3)' } : {}}
            >
              <Clock className="w-4 h-4" />
              <span>Auto-Boost Schedules</span>
              {stats.schedules > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30">
                  {stats.schedules}
                </span>
              )}
            </button>
          </div>

          {/* Desktop Layout Switcher (Table vs Grid Cards) */}
          {activeTab === 'table' && (
            <div className="hidden md:flex items-center gap-1.5 p-1 rounded-xl border border-white/[0.06] bg-slate-900/60 backdrop-blur-md">
              <button
                onClick={() => setViewLayout('table')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${viewLayout === 'table' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                title="Table View"
              >
                <LayoutList className="w-4 h-4" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewLayout('grid')}
                className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${viewLayout === 'grid' ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
                <span>Cards</span>
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            TAB CONTENT: GAMES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'table' && (
          <div className="space-y-4">
            {/* Filter / Search Bar */}
            <div
              className="p-3.5 sm:p-4 rounded-2xl border border-white/[0.08] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3"
              style={{ background: 'rgba(15, 20, 35, 0.75)', backdropFilter: 'blur(20px)' }}
            >
              {/* Search Box */}
              <div className="relative flex-1 min-w-0 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  placeholder="Search games by title..."
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 focus:border-indigo-500/60 pl-10 pr-9 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Category Dropdown */}
                <div className="relative">
                  <select
                    value={selCat}
                    onChange={e => { setSelCat(e.target.value); setPage(1) }}
                    className="bg-white/[0.05] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer focus:border-indigo-500/60 transition"
                  >
                    <option value="all" className="bg-slate-900 text-white">All Categories ({categories.length})</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.name}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as typeof sortBy)}
                    className="bg-white/[0.05] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2.5 pr-8 text-xs sm:text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer focus:border-indigo-500/60 transition"
                  >
                    <option value="views_desc" className="bg-slate-900 text-white">👁 Views: High → Low</option>
                    <option value="views_asc" className="bg-slate-900 text-white">📉 Views: Low → High</option>
                    <option value="likes_desc" className="bg-slate-900 text-white">❤️ Likes: High → Low</option>
                    <option value="likes_asc" className="bg-slate-900 text-white">🤍 Likes: Low → High</option>
                    <option value="newest" className="bg-slate-900 text-white">⏱ Date: Newest First</option>
                    <option value="title" className="bg-slate-900 text-white">🔤 Title: A → Z</option>
                  </select>
                  <ArrowUpDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>

                {/* Page Size */}
                <select
                  value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="bg-white/[0.05] border border-white/10 rounded-xl px-2.5 py-2.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  {[10, 15, 25, 50].map(s => (
                    <option key={s} value={s} className="bg-slate-900 text-white">{s} / page</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Sticky Floating Bulk Action Bar */}
            {selectedIds.size > 0 && (
              <div
                className="p-3.5 sm:p-4 rounded-2xl border border-indigo-500/30 flex flex-wrap items-center justify-between gap-3 shadow-2xl transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(49, 46, 129, 0.95) 100%)',
                  backdropFilter: 'blur(20px)',
                  boxShadow: '0 12px 36px rgba(79,70,229,0.3)',
                }}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs sm:text-sm font-black text-white">
                      {selectedIds.size} game{selectedIds.size > 1 ? 's' : ''} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={selectAllFilter}
                      className="text-indigo-200 hover:text-white underline font-semibold transition"
                    >
                      Select all {filtered.length}
                    </button>
                    <span className="text-white/20">|</span>
                    <button
                      onClick={clearSel}
                      className="text-slate-400 hover:text-white transition font-medium"
                    >
                      Deselect
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-indigo-200 font-semibold hidden md:inline">Quick Boost:</span>
                  {[
                    { v: 100, l: 20, label: '+100 👁' },
                    { v: 500, l: 75, label: '+500 👁' },
                    { v: 1000, l: 150, label: '+1k 👁' },
                  ].map(b => (
                    <button
                      key={b.v}
                      disabled={batchSaving}
                      onClick={() => batchBoost(b.v, b.l)}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white transition hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                      {b.label}
                    </button>
                  ))}

                  <button
                    onClick={() => {
                      setShowModal(true)
                      setDraft({ ...DEFAULT_DRAFT, scope: 'selected' })
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-200 border border-amber-400/40 bg-amber-500/20 hover:bg-amber-500/30 transition shadow-sm"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Schedule For Selected</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── GAMES VIEW: TABLE OR CARDS ─── */}
            <div
              className="rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl"
              style={{ background: 'rgba(15, 20, 35, 0.75)', backdropFilter: 'blur(24px)' }}
            >
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-28 text-center">
                  <RefreshCw className="w-9 h-9 text-indigo-400 animate-spin" />
                  <p className="text-sm font-semibold text-slate-300">Loading game catalogue...</p>
                  <p className="text-xs text-slate-500">Fetching metrics and thumbnail covers</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-28 text-center">
                  <Search className="w-12 h-12 text-slate-600" />
                  <p className="text-base text-slate-200 font-bold">No matching games found</p>
                  <p className="text-xs text-slate-500">Try adjusting your search query or category filters</p>
                </div>
              ) : (
                <>
                  {/* ─────────────────────────────────────────────────────────────
                      DESKTOP TABLE VIEW (Visible on md+ screens when table layout active)
                  ───────────────────────────────────────────────────────────── */}
                  <div className={`overflow-x-auto ${viewLayout === 'grid' ? 'hidden' : 'hidden md:block'}`}>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.08] bg-black/40 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          <th className="py-4 px-4 w-12 text-center">
                            <input
                              type="checkbox"
                              checked={paginated.length > 0 && paginated.every(g => selectedIds.has(g.id))}
                              onChange={togglePage}
                              className="rounded-md bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                            />
                          </th>
                          <th className="py-4 px-4 text-left">Game</th>
                          <th className="py-4 px-4 text-left min-w-[260px]">
                            <div className="flex items-center gap-1.5 text-cyan-400">
                              <Eye className="w-4 h-4" />
                              <span>Views (ยอดวิว)</span>
                            </div>
                          </th>
                          <th className="py-4 px-4 text-left min-w-[260px]">
                            <div className="flex items-center gap-1.5 text-rose-400">
                              <ThumbsUp className="w-4 h-4" />
                              <span>Likes (ยอดไลก์)</span>
                            </div>
                          </th>
                          <th className="py-4 px-5 text-right w-36">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.04]">
                        {paginated.map(game => {
                          const modified = game.draftViews !== game.currentViews || game.draftLikes !== game.currentLikes
                          const saving = savingId === game.id
                          const hasSched = !!game.activeScheduleId
                          const sched = hasSched ? schedules.find(s => s.id === game.activeScheduleId) : null

                          return (
                            <tr
                              key={game.id}
                              className={`group transition-colors hover:bg-white/[0.03] ${selectedIds.has(game.id) ? 'bg-indigo-500/[0.08]' : ''
                                }`}
                            >
                              {/* Checkbox */}
                              <td className="py-4 px-4 text-center">
                                <input
                                  type="checkbox"
                                  checked={selectedIds.has(game.id)}
                                  onChange={() => toggleSelect(game.id)}
                                  className="rounded-md bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4"
                                />
                              </td>

                              {/* Game Information */}
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3.5">
                                  <div className="w-12 h-15 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-md group-hover:border-indigo-500/40 transition">
                                    {game.cover_image ? (
                                      <img
                                        src={game.cover_image.split('#')[0]}
                                        alt={game.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 mb-1">
                                      <span className="font-bold text-white text-sm line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                        {game.title}
                                      </span>
                                      <a
                                        href={`/game/${game.slug}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-indigo-400 transition shrink-0"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                        {game.categoryName}
                                      </span>
                                      {game.is_featured && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                          FEATURED
                                        </span>
                                      )}
                                      {hasSched && sched && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          AUTO {intervalLabel(sched.interval_unit, sched.interval_value)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Views Column */}
                              <td className="py-4 px-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-slate-400 w-12 text-right tabular-nums font-semibold shrink-0">
                                      {fmtNum(game.currentViews)}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={game.draftViews}
                                      onChange={e => updateDraft(game.id, 'draftViews', parseInt(e.target.value) || 0)}
                                      className={`w-28 rounded-xl border px-3 py-1.5 text-xs text-white bg-black/30 focus:outline-none transition ${game.draftViews !== game.currentViews
                                        ? 'border-cyan-400 text-cyan-300 font-bold shadow-sm'
                                        : 'border-white/10 hover:border-white/20 focus:border-cyan-500/60'
                                        }`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 ml-14">
                                    {[50, 100, 500].map(v => (
                                      <button
                                        key={v}
                                        onClick={() => quickInc(game.id, v, 0)}
                                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 hover:bg-cyan-500/20 transition hover:scale-105 active:scale-95"
                                      >
                                        +{fmtNum(v)}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* Likes Column */}
                              <td className="py-4 px-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-slate-400 w-12 text-right tabular-nums font-semibold shrink-0">
                                      {fmtNum(game.currentLikes)}
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={game.draftLikes}
                                      onChange={e => updateDraft(game.id, 'draftLikes', parseInt(e.target.value) || 0)}
                                      className={`w-28 rounded-xl border px-3 py-1.5 text-xs text-white bg-black/30 focus:outline-none transition ${game.draftLikes !== game.currentLikes
                                        ? 'border-rose-400 text-rose-300 font-bold shadow-sm'
                                        : 'border-white/10 hover:border-white/20 focus:border-rose-500/60'
                                        }`}
                                    />
                                  </div>
                                  <div className="flex items-center gap-1 ml-14">
                                    {[10, 25, 100].map(l => (
                                      <button
                                        key={l}
                                        onClick={() => quickInc(game.id, 0, l)}
                                        className="px-2 py-0.5 rounded-lg text-[10px] font-bold text-rose-400 border border-rose-500/25 bg-rose-500/10 hover:bg-rose-500/20 transition hover:scale-105 active:scale-95"
                                      >
                                        +{l}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </td>

                              {/* Actions Column */}
                              <td className="py-4 px-5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => {
                                      setFineGame(game)
                                      setFineMode('increment')
                                      setFineViews(250)
                                      setFineLikes(50)
                                    }}
                                    className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition"
                                    title="Precision Adjuster"
                                  >
                                    <Sliders className="w-4 h-4" />
                                  </button>

                                  <button
                                    disabled={!modified || saving}
                                    onClick={() => saveSingle(game)}
                                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md ${modified
                                      ? 'text-white shadow-emerald-950/40 hover:scale-105 active:scale-95 cursor-pointer'
                                      : 'bg-white/[0.02] text-slate-600 border border-white/[0.05] cursor-not-allowed'
                                      }`}
                                    style={modified ? { background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' } : {}}
                                  >
                                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    <span>Save</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      MOBILE CARDS / GRID CARDS VIEW
                      (Always shown on mobile < md, or on desktop when Grid view chosen)
                  ───────────────────────────────────────────────────────────── */}
                  <div className={`${viewLayout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4' : 'md:hidden divide-y divide-white/[0.06]'}`}>
                    {paginated.map(game => {
                      const modified = game.draftViews !== game.currentViews || game.draftLikes !== game.currentLikes
                      const saving = savingId === game.id
                      const hasSched = !!game.activeScheduleId
                      const sched = hasSched ? schedules.find(s => s.id === game.activeScheduleId) : null

                      return (
                        <div
                          key={game.id}
                          className={`p-4 transition-colors ${viewLayout === 'grid' ? 'rounded-2xl border border-white/[0.08] bg-white/[0.02]' : ''} ${selectedIds.has(game.id) ? 'bg-indigo-500/[0.08]' : ''
                            }`}
                        >
                          {/* Card Header: Cover, Title, Checkbox */}
                          <div className="flex items-start gap-3 mb-3.5">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(game.id)}
                              onChange={() => toggleSelect(game.id)}
                              className="mt-1 rounded-md bg-white/10 border-white/20 text-indigo-600 focus:ring-0 cursor-pointer w-4 h-4 shrink-0"
                            />
                            <div className="w-12 h-15 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-white/10 shadow-md">
                              {game.cover_image ? (
                                <img src={game.cover_image.split('#')[0]} alt={game.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">🎮</div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-white text-sm line-clamp-2 leading-snug">{game.title}</h4>
                                <a
                                  href={`/game/${game.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-500 hover:text-indigo-400 transition shrink-0 p-1"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              </div>
                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/25">
                                  {game.categoryName}
                                </span>
                                {game.is_featured && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/15 text-amber-300 border border-amber-500/25">
                                    FEATURED
                                  </span>
                                )}
                                {hasSched && sched && (
                                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    AUTO
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Dual Metric Input Panels */}
                          <div className="grid grid-cols-2 gap-2.5 mb-3">
                            {/* Views Box */}
                            <div className="p-3 rounded-xl border border-cyan-500/20 bg-cyan-950/20">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                                  <Eye className="w-3 h-3" /> Views
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 font-bold">
                                  {fmtNum(game.currentViews)}
                                </span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={game.draftViews}
                                onChange={e => updateDraft(game.id, 'draftViews', parseInt(e.target.value) || 0)}
                                className={`w-full rounded-lg border bg-black/40 px-2.5 py-1.5 text-xs text-white focus:outline-none transition ${game.draftViews !== game.currentViews
                                  ? 'border-cyan-400 text-cyan-300 font-bold'
                                  : 'border-white/10'
                                  }`}
                              />
                              <div className="flex gap-1 mt-2">
                                {[50, 100, 500].map(v => (
                                  <button
                                    key={v}
                                    onClick={() => quickInc(game.id, v, 0)}
                                    className="flex-1 py-1 rounded-md text-[9px] font-bold text-cyan-400 border border-cyan-500/25 bg-cyan-500/10 active:scale-95 transition"
                                  >
                                    +{fmtNum(v)}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Likes Box */}
                            <div className="p-3 rounded-xl border border-rose-500/20 bg-rose-950/20">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
                                  <ThumbsUp className="w-3 h-3" /> Likes
                                </span>
                                <span className="text-[11px] font-mono text-slate-400 font-bold">
                                  {fmtNum(game.currentLikes)}
                                </span>
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={game.draftLikes}
                                onChange={e => updateDraft(game.id, 'draftLikes', parseInt(e.target.value) || 0)}
                                className={`w-full rounded-lg border bg-black/40 px-2.5 py-1.5 text-xs text-white focus:outline-none transition ${game.draftLikes !== game.currentLikes
                                  ? 'border-rose-400 text-rose-300 font-bold'
                                  : 'border-white/10'
                                  }`}
                              />
                              <div className="flex gap-1 mt-2">
                                {[10, 25, 100].map(l => (
                                  <button
                                    key={l}
                                    onClick={() => quickInc(game.id, 0, l)}
                                    className="flex-1 py-1 rounded-md text-[9px] font-bold text-rose-400 border border-rose-500/25 bg-rose-500/10 active:scale-95 transition"
                                  >
                                    +{l}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setFineGame(game)
                                setFineMode('increment')
                                setFineViews(250)
                                setFineLikes(50)
                              }}
                              className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-400 hover:text-white transition"
                              title="Fine-tune values"
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                            <button
                              disabled={!modified || saving}
                              onClick={() => saveSingle(game)}
                              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${modified
                                ? 'text-white shadow-lg shadow-emerald-950/40'
                                : 'bg-white/[0.02] text-slate-600 border border-white/[0.05] cursor-not-allowed'
                                }`}
                              style={modified ? { background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' } : {}}
                            >
                              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                              <span>{modified ? 'Save Changes' : 'Saved'}</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-t border-white/[0.08] bg-black/40 text-xs"
                >
                  <span className="text-slate-400 text-center sm:text-left">
                    Showing <strong className="text-white">{(page - 1) * pageSize + 1}</strong> – <strong className="text-white">{Math.min(page * pageSize, filtered.length)}</strong> of <strong className="text-white">{filtered.length}</strong> games
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(1)}
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 font-semibold"
                    >
                      First
                    </button>
                    <button
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-bold tabular-nums">
                      {page} / {totalPages}
                    </span>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      className="p-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage(totalPages)}
                      className="px-2.5 py-1.5 rounded-lg border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none text-slate-300 font-semibold"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            TAB CONTENT: AUTO-BOOST SCHEDULES
        ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === 'schedules' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl">
              <div>
                <h3 className="font-bold text-white text-base">Background Auto-Boost Workers</h3>
                <p className="text-xs text-slate-400 mt-0.5">Automated schedules execute repeatedly even when offline or browser closed</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(true)
                  setEditSchedId(null)
                  setDraft({ ...DEFAULT_DRAFT, scope: selectedIds.size > 0 ? 'selected' : 'all' })
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)' }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Create Schedule</span>
              </button>
            </div>

            {schedLoading ? (
              <div className="py-20 text-center">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading schedules...</p>
              </div>
            ) : schedules.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-white/[0.08] bg-slate-900/40">
                <Clock className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">No Active Schedules</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                  Set up background jobs to continuously increase views and likes automatically over time.
                </p>
                <button
                  onClick={() => {
                    setShowModal(true)
                    setEditSchedId(null)
                    setDraft({ ...DEFAULT_DRAFT })
                  }}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)' }}
                >
                  Create Your First Schedule
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schedules.map(s => {
                  const scopeCount =
                    s.scope === 'all' ? games.length
                      : s.scope === 'category'
                        ? games.filter(g => g.category_id === s.category_id || (g.category_ids && g.category_ids.includes(s.category_id!))).length
                        : (s.game_ids || []).length

                  return (
                    <div
                      key={s.id}
                      className="p-5 rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl relative overflow-hidden transition hover:border-white/20 shadow-xl"
                    >
                      {/* Top status bar */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${s.is_active
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-700/40 text-slate-400 border border-slate-600/30'
                              }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                            {s.is_active ? 'Active' : 'Paused'}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            {s.label || 'Auto-Boost Worker'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleScheduleActive(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                            title={s.is_active ? 'Pause Schedule' : 'Resume Schedule'}
                          >
                            {s.is_active ? <PauseCircle className="w-4 h-4 text-amber-400" /> : <PlayCircle className="w-4 h-4 text-emerald-400" />}
                          </button>
                          <button
                            onClick={() => runScheduleNow(s.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-white/10 transition"
                            title="Execute Immediately"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-white/10 transition"
                            title="Edit Settings"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSchedule(s.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Details row */}
                      <div className="space-y-1.5 text-xs text-slate-300 mb-4 bg-black/30 p-3 rounded-xl border border-white/[0.04]">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Frequency:</span>
                          <strong className="text-amber-300">{intervalLabel(s.interval_unit, s.interval_value)}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Target Scope:</span>
                          <span className="text-white font-medium">{s.scope.toUpperCase()} ({scopeCount} games)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Boost Range:</span>
                          <span className="text-cyan-300 font-bold">+{s.view_min}~{s.view_max} views <span className="text-slate-500 font-normal">·</span> <span className="text-rose-300">+{s.like_min}~{s.like_max} likes</span></span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Next Execution:</span>
                          <span className="text-emerald-300 font-semibold">{fmtTimeLeft(s.next_run_at)}</span>
                        </div>
                      </div>

                      {/* Cumulative stats */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                          <div className="text-[10px] text-slate-500 font-bold uppercase">Total Runs</div>
                          <div className="font-extrabold text-white mt-0.5">{s.total_runs || 0}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-cyan-950/20 border border-cyan-500/10">
                          <div className="text-[10px] text-cyan-400 font-bold uppercase">+Views Added</div>
                          <div className="font-extrabold text-cyan-300 mt-0.5">+{fmtNum(s.total_views_added || 0)}</div>
                        </div>
                        <div className="p-2 rounded-xl bg-rose-950/20 border border-rose-500/10">
                          <div className="text-[10px] text-rose-400 font-bold uppercase">+Likes Added</div>
                          <div className="font-extrabold text-rose-300 mt-0.5">+{fmtNum(s.total_likes_added || 0)}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: NEW / EDIT AUTO-BOOST SCHEDULE
      ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          style={{ background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(16px)', animation: 'fadeIn 0.2s ease-out' }}
        >
          <div
            className="w-full max-w-xl rounded-3xl border border-white/[0.12] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            style={{
              background: 'linear-gradient(180deg, #121829 0%, #0c101c 100%)',
              backdropFilter: 'blur(40px)',
              animation: 'scaleIn 0.2s ease-out',
            }}
          >
            {/* Modal Header */}
            <div
              className="relative p-5 sm:p-6 border-b border-white/[0.08]"
              style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.15) 0%, rgba(225,29,72,0.1) 100%)' }}
            >
              <button
                onClick={() => { setShowModal(false); setEditSchedId(null) }}
                className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3.5">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)' }}
                >
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white">
                    {editSchedId ? 'Edit Auto-Boost Schedule' : 'New Auto-Boost Schedule'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Background automated job · Continues running even when browser is closed
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
              {/* Optional Schedule Name */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Schedule Label / Description (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily Featured Games Auto-Growth"
                  value={draft.label || ''}
                  onChange={e => setDraft(p => ({ ...p, label: e.target.value || null }))}
                  className="w-full rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 focus:border-amber-500/60 px-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none transition"
                />
              </div>

              {/* 1. Target Scope Selection */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  1. Target Games Scope
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { v: 'selected' as BoostScope, icon: '🎯', label: 'Selected', sub: `${selectedIds.size} games` },
                    { v: 'category' as BoostScope, icon: '📂', label: 'By Category', sub: 'Category filter' },
                    { v: 'all' as BoostScope, icon: '🌐', label: 'All Games', sub: `${games.length} total` },
                  ].map(s => (
                    <button
                      key={s.v}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, scope: s.v }))}
                      className={`p-3 rounded-2xl border text-center transition-all ${draft.scope === s.v
                        ? 'border-amber-500/60 bg-amber-500/15 shadow-md scale-[1.02]'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                        }`}
                    >
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className={`text-xs font-bold ${draft.scope === s.v ? 'text-amber-300' : 'text-slate-300'}`}>
                        {s.label}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">{s.sub}</div>
                    </button>
                  ))}
                </div>

                {draft.scope === 'category' && (
                  <div className="mt-3">
                    <select
                      value={draft.category_id || ''}
                      onChange={e => setDraft(p => ({ ...p, category_id: e.target.value || null }))}
                      className="w-full rounded-xl bg-white/[0.05] border border-white/15 px-4 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none appearance-none cursor-pointer focus:border-amber-500/60"
                    >
                      <option value="" className="bg-slate-900">— Select Target Category —</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* 2. Boost Mode */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                  2. Growth Strategy (Boost Mode)
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { v: 'increment' as BoostMode, label: 'Natural Increments', sub: 'Adds random amount each run', icon: <TrendingUp className="w-4 h-4 text-indigo-400" /> },
                    { v: 'target' as BoostMode, label: 'Target Milestones', sub: 'Runs until target goals met', icon: <Target className="w-4 h-4 text-emerald-400" /> },
                  ].map(m => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, mode: m.v }))}
                      className={`p-3.5 rounded-2xl border text-left flex items-start gap-2.5 transition-all ${draft.mode === m.v
                        ? 'border-indigo-500/60 bg-indigo-500/15 scale-[1.01]'
                        : 'border-white/[0.08] bg-white/[0.03] hover:border-white/20'
                        }`}
                    >
                      <div className="mt-0.5 shrink-0">{m.icon}</div>
                      <div>
                        <div className={`text-xs font-bold ${draft.mode === m.v ? 'text-indigo-300' : 'text-slate-300'}`}>
                          {m.label}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{m.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Metric Growth Rates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Views Config */}
                <div className="p-4 rounded-2xl border border-cyan-500/25 bg-cyan-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Eye className="w-4 h-4" /> Views / Run
                    </span>
                    <span className="text-[10px] text-cyan-500/80 font-semibold">Min ~ Max</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={draft.view_min}
                      onChange={e => setDraft(p => ({ ...p, view_min: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-cyan-400"
                    />
                    <span className="text-slate-500 font-bold">~</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={draft.view_max}
                      onChange={e => setDraft(p => ({ ...p, view_max: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  {/* Preset Pills */}
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { min: 10, max: 50, label: 'Low (~50)' },
                      { min: 30, max: 150, label: 'Mid (~150)' },
                      { min: 100, max: 500, label: 'High (~500)' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDraft(p => ({ ...p, view_min: preset.min, view_max: preset.max }))}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-cyan-400 border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Likes Config */}
                <div className="p-4 rounded-2xl border border-rose-500/25 bg-rose-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <ThumbsUp className="w-4 h-4" /> Likes / Run
                    </span>
                    <span className="text-[10px] text-rose-500/80 font-semibold">Min ~ Max</span>
                  </div>
                  <div className="flex items-center gap-2 mb-2.5">
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={draft.like_min}
                      onChange={e => setDraft(p => ({ ...p, like_min: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-rose-400"
                    />
                    <span className="text-slate-500 font-bold">~</span>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      value={draft.like_max}
                      onChange={e => setDraft(p => ({ ...p, like_max: Math.max(0, parseInt(e.target.value) || 0) }))}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white text-center font-bold focus:outline-none focus:border-rose-400"
                    />
                  </div>
                  {/* Preset Pills */}
                  <div className="flex gap-1 flex-wrap">
                    {[
                      { min: 5, max: 20, label: 'Low (~20)' },
                      { min: 10, max: 50, label: 'Mid (~50)' },
                      { min: 25, max: 100, label: 'High (~100)' },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setDraft(p => ({ ...p, like_min: preset.min, like_max: preset.max }))}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold text-rose-400 border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Execution Frequency */}
              <div className="p-4 rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-400" />
                  <span>4. Execution Frequency</span>
                </label>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="text-xs text-slate-400 font-medium">Every</span>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={draft.interval_value}
                    onChange={e => setDraft(p => ({ ...p, interval_value: Math.max(1, parseInt(e.target.value) || 1) }))}
                    className="w-20 bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs sm:text-sm text-white text-center font-black focus:outline-none focus:border-amber-400"
                  />
                  <div className="grid grid-cols-4 gap-1 flex-1">
                    {(['minute', 'hour', 'day', 'month'] as IntervalUnit[]).map(unit => (
                      <button
                        key={unit}
                        type="button"
                        onClick={() => setDraft(p => ({ ...p, interval_unit: unit }))}
                        className={`py-2 rounded-xl text-xs font-bold capitalize border transition ${draft.interval_unit === unit
                          ? 'text-amber-200 border-amber-500/60 bg-amber-500/20 shadow-sm'
                          : 'text-slate-400 border-white/[0.08] hover:text-white hover:bg-white/[0.04]'
                          }`}
                      >
                        {unit}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Frequency Quick Chips */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { unit: 'minute' as IntervalUnit, val: 5, label: '5 mins' },
                    { unit: 'minute' as IntervalUnit, val: 30, label: '30 mins' },
                    { unit: 'hour' as IntervalUnit, val: 1, label: '1 hour' },
                    { unit: 'hour' as IntervalUnit, val: 6, label: '6 hours' },
                    { unit: 'day' as IntervalUnit, val: 1, label: '1 day' },
                  ].map(item => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, interval_unit: item.unit, interval_value: item.val }))}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition ${draft.interval_unit === item.unit && draft.interval_value === item.val
                        ? 'text-amber-300 border-amber-500/60 bg-amber-500/20'
                        : 'text-slate-400 border-white/10 hover:text-white'
                        }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Live Summary Preview Card */}
              <div className="p-4 rounded-2xl border border-indigo-500/30 bg-indigo-950/30 text-xs space-y-1.5 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-indigo-300 mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Execution Summary</span>
                </div>
                <div className="text-slate-300">
                  • Frequency: <strong className="text-white">{intervalLabel(draft.interval_unit, draft.interval_value)}</strong>
                </div>
                <div className="text-slate-300">
                  • Target Scope: <strong className="text-white">
                    {draft.scope === 'all'
                      ? `All ${games.length} games`
                      : draft.scope === 'category'
                        ? 'Games in specified category'
                        : `${selectedIds.size} selected games`}
                  </strong>
                </div>
                <div className="text-slate-300">
                  • Added per run: <strong className="text-cyan-300">+{draft.view_min}~{draft.view_max} views</strong> and <strong className="text-rose-300">+{draft.like_min}~{draft.like_max} likes</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-white/[0.08] bg-black/40 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => { setShowModal(false); setEditSchedId(null) }}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-400 hover:text-white hover:bg-white/[0.05] transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingSched}
                onClick={saveSchedule}
                className="px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-xl flex items-center gap-2 transition hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #f97316 0%, #e11d48 100%)',
                  boxShadow: '0 8px 24px rgba(225,29,72,0.3)',
                }}
              >
                {savingSched ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>{editSchedId ? 'Update Schedule' : 'Start Auto-Boost'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: FINE-TUNE PRECISION ADJUSTER
      ═══════════════════════════════════════════════════════════════════ */}
      {fineGame && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/[0.12] p-6 shadow-2xl relative"
            style={{ background: 'linear-gradient(180deg, #121829 0%, #0c101c 100%)', backdropFilter: 'blur(40px)' }}
          >
            <button
              onClick={() => setFineGame(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shrink-0">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-white text-base line-clamp-1">{fineGame.title}</h3>
                <p className="text-xs text-slate-400">Fine-tune engagement counts</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="grid grid-cols-2 gap-2 mb-4 p-1 rounded-2xl border border-white/[0.08] bg-black/40">
              {(['increment', 'overwrite'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setFineMode(m)}
                  className={`py-2 rounded-xl text-xs font-bold transition ${fineMode === m ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                >
                  {m === 'increment' ? '➕ Add Delta' : '🎯 Set Exact'}
                </button>
              ))}
            </div>

            {/* Inputs */}
            <div className="space-y-3 mb-5">
              <div className="p-3.5 rounded-2xl border border-cyan-500/20 bg-cyan-950/20">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-cyan-400 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Views {fineMode === 'increment' ? 'to Add' : 'Target'}
                  </span>
                  <span className="text-slate-400 font-mono">Current: {fmtNum(fineGame.currentViews)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={fineViews}
                  onChange={e => setFineViews(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400 font-bold"
                />
              </div>

              <div className="p-3.5 rounded-2xl border border-rose-500/20 bg-rose-950/20">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="font-bold text-rose-400 flex items-center gap-1">
                    <ThumbsUp className="w-3.5 h-3.5" /> Likes {fineMode === 'increment' ? 'to Add' : 'Target'}
                  </span>
                  <span className="text-slate-400 font-mono">Current: {fmtNum(fineGame.currentLikes)}</span>
                </div>
                <input
                  type="number"
                  min="0"
                  value={fineLikes}
                  onChange={e => setFineLikes(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full rounded-xl bg-black/40 border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400 font-bold"
                />
              </div>
            </div>

            {/* Preview result */}
            <div className="p-3.5 rounded-2xl border border-white/[0.08] bg-black/30 flex items-center justify-between text-xs mb-5">
              <span className="text-slate-400">Final Metric Result:</span>
              <div className="flex items-center gap-3 font-bold">
                <span className="text-cyan-300">
                  {fmtNum(fineMode === 'increment' ? fineGame.currentViews + fineViews : fineViews)} 👁
                </span>
                <span className="text-rose-300">
                  {fmtNum(fineMode === 'increment' ? fineGame.currentLikes + fineLikes : fineLikes)} ❤️
                </span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setFineGame(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
              <button
                onClick={applyFine}
                className="flex-[2] py-2.5 rounded-xl text-xs font-bold text-white shadow-lg transition hover:scale-105 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #6366f1 100%)' }}
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          MODAL: SQL SETUP & HELP
      ═══════════════════════════════════════════════════════════════════ */}
      {showSqlModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(16px)' }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-purple-500/30 p-6 shadow-2xl relative"
            style={{ background: 'linear-gradient(180deg, #16122a 0%, #0d0a1c 100%)' }}
          >
            <button
              onClick={() => setShowSqlModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-purple-500/20 border border-purple-500/30 text-purple-300 shrink-0">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Database Setup Guide</h3>
                <p className="text-xs text-purple-300/80">Configure Supabase for Background Jobs</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed mb-6">
              <p>
                To enable automatic persistent boost schedules that run on the Supabase server even when the browser is closed:
              </p>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.08] space-y-2">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">Step 1:</span>
                  <span>Run <code className="text-purple-200 bg-purple-950/60 px-1.5 py-0.5 rounded">src/lib/boost_schedules_schema.sql</code> in the Supabase SQL Editor.</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-purple-400">Step 2:</span>
                  <span>Run <code className="text-purple-200 bg-purple-950/60 px-1.5 py-0.5 rounded">src/lib/setup_pg_cron.sql</code> to schedule the 1-minute automated cron job.</span>
                </div>
              </div>
              <p className="text-slate-400 text-[11px]">
                Note: Even without pg_cron, active schedules will still execute whenever an admin opens this dashboard.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={copySqlFiles}
                className="flex-1 py-3 rounded-xl text-xs font-bold text-white border border-purple-500/40 bg-purple-600/30 hover:bg-purple-600/40 transition flex items-center justify-center gap-2"
              >
                {copiedSql ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedSql ? 'Copied to Clipboard!' : 'Copy SQL Instructions'}</span>
              </button>
              <button
                onClick={() => setShowSqlModal(false)}
                className="px-5 py-3 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
