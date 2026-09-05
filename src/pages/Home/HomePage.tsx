import { useState, useEffect } from 'react'
// import { Link } from 'react-router-dom'
import styled, { keyframes, css } from 'styled-components'

import { useLanguage } from '../../lib/i18n/LanguageContext'
import { Filter, Gamepad2, ChevronLeft, ChevronRight, Loader2, X, SlidersHorizontal, Check, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game, Category } from '../../lib/supabase'
import { useCategoryTranslator } from '../../lib/i18n/CategoryTranslator'
import GameCard from '../../components/GameCard/GameCard'
import CommentSection from '../../components/CommentSection/CommentSection'
import Seo from '../../components/Seo'
import { getPageUrl, SITE_NAME } from '../../lib/seo'

const PAGE_SIZE = 100

const Hero = styled.div`
  background: 
    linear-gradient(to bottom, rgba(8,8,16,0.55) 0%, rgba(8,8,16,0.92) 100%),
    url('/bg.jpg') center 38%/cover no-repeat;
  border-bottom: 0px solid rgba(124,58,237,0.15);
  padding: 64px 24px 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    background: 
      linear-gradient(to bottom, rgba(8,8,16,0.55) 0%, rgba(8,8,16,0.92) 100%),
      url('/bg.jpg') center 40%/cover no-repeat;
  }
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(8,8,16,0.7) 100%);
  }
  
  > * { position: relative; z-index: 1; }
`

const HeroTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
  line-height: 1.1;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
`

const HeroSub = styled.p`
  font-size: 16px;
  color: rgba(148,163,184,0.8);
  max-width: 500px;
  margin: 0 auto;
`

const UptimeContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-top: 16px;
  }
`

const UptimeBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(18, 18, 31, 0.6);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 80px;

  @media (max-width: 768px) {
    min-width: 65px;
    padding: 6px 10px;
    border-radius: 6px;
  }
`

const UptimeValue = styled.span`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(124, 58, 237, 0.5);

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

const UptimeLabel = styled.span`
  font-size: 10px;
  color: rgba(148, 163, 184, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 9px;
    letter-spacing: 0.5px;
  }
`

const HeroStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-top: 28px;
  flex-wrap: wrap;
`

const Stat = styled.div`
  text-align: center;
`

const StatNum = styled.div`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const StatLabel = styled.div`
  font-size: 12px;
  color: rgba(148,163,184,0.6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const PageWrap = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

const Sidebar = styled.aside`
  @media (max-width: 900px) { display: none; }
`

const SidebarCard = styled.div`
  background: rgba(18,18,31,0.8);
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 14px;
  padding: 20px;
  position: sticky;
  top: 90px;
`

const SidebarTitle = styled.h3`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(148,163,184,0.6);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const CatBtn = styled.button<{ $active: boolean }>`
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${p => p.$active ? 600 : 400};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.8)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'transparent'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.15s;
  margin-bottom: 2px;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

// const SidebarLink = styled(Link)`
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   width: 100%;
//   padding: 10px 14px;
//   margin-top: 12px;
//   border-radius: 10px;
//   border: 1px dashed rgba(251,191,36,0.3);
//   background: rgba(251,191,36,0.06);
//   color: rgba(251,191,36,0.85);
//   font-size: 13px;
//   font-weight: 600;
//   text-decoration: none;
//   transition: all 0.2s;
//   &:hover {
//     background: rgba(251,191,36,0.15);
//     border-color: rgba(251,191,36,0.5);
//     color: #fbbf24;
//   }
// `

const Content = styled.div``

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`

const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const SortSelect = styled.select`
  padding: 8px 14px;
  background: rgba(18,18,31,0.8);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  &:focus { border-color: rgba(124,58,237,0.5); }
  @media (max-width: 900px) { display: none; }
`

/* ─── Mobile Filter Button ─────────────────────────────── */
const MobileFilterBtn = styled.button<{ $active?: boolean }>`
  display: none;
  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
    border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.2)'};
    border-radius: 10px;
    color: ${p => p.$active ? '#c4b5fd' : '#e2e8f0'};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Noto Sans Lao', sans-serif;
  }
`

const FilterBadge = styled.span`
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 7px;
  min-width: 18px;
  text-align: center;
`

/* ─── Bottom Sheet Overlay ─────────────────────────────── */
const slideUp = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
`
const slideDown = keyframes`
  from { transform: translateY(0); }
  to   { transform: translateY(100%); }
`
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`
const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`

const Backdrop = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  animation: ${p => p.$closing ? css`${fadeOut} 0.28s ease forwards` : css`${fadeIn} 0.2s ease forwards`};
`

const Sheet = styled.div<{ $closing: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: #0f0f1f;
  border-top: 1px solid rgba(124,58,237,0.3);
  border-radius: 20px 20px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  max-height: 88vh;
  overflow-y: auto;
  animation: ${p => p.$closing ? css`${slideDown} 0.28s ease forwards` : css`${slideUp} 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards`};
`

const SheetHandle = styled.div`
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  margin: 14px auto 0;
`

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(124,58,237,0.1);
`

const SheetTitle = styled.h3`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`

const SheetCloseBtn = styled.button`
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(124,58,237,0.2);
  background: rgba(124,58,237,0.1);
  color: rgba(148,163,184,0.8);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.2); color: #fff; }
`

const SheetSection = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(124,58,237,0.08);
  &:last-child { border-bottom: none; }
`

const SheetSectionTitle = styled.p`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(148,163,184,0.5);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`

const OptionChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.15)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.8)'};
  font-size: 13px;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Noto Sans Lao', sans-serif;
  &:hover { border-color: rgba(124,58,237,0.4); color: #fff; }
`

const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

const MobileCatBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.12)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'rgba(18,18,31,0.6)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.8)'};
  font-size: 14px;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.12s;
  font-family: 'Noto Sans Lao', sans-serif;
  margin-bottom: 6px;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

const SheetApplyBtn = styled.button`
  display: block;
  width: calc(100% - 40px);
  margin: 4px 20px 20px;
  padding: 14px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: 'Noto Sans Lao', sans-serif;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`

/* ─── Rest of styles ────────────────────────────── */

const ResultCount = styled.span`
  font-size: 13px;
  color: rgba(148,163,184,0.6);
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: rgba(148,163,184,0.5);
`

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
`

const PageBtn = styled.button<{ $active?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? '#7c3aed' : 'rgba(124,58,237,0.2)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.7)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover:not(:disabled) { background: rgba(124,58,237,0.2); color: #fff; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`

const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(148,163,184,0.6);
  gap: 12px;
  font-size: 14px;
`

const ScrollTopBtn = styled.button<{ $visible: boolean }>`
  position: fixed;
  bottom: 100px;
  right: 34px;
  z-index: 999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(124,58,237,0.4);
  background: rgba(18,18,31,0.9);
  backdrop-filter: blur(12px);
  color: #c4b5fd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(124,58,237,0.3);
  transition: opacity 0.3s, transform 0.3s, background 0.2s;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? 'translateY(0)' : 'translateY(16px)'};
  pointer-events: ${p => p.$visible ? 'auto' : 'none'};
  &:hover { background: rgba(124,58,237,0.4); color: #fff; transform: translateY(-2px); }
  @media (max-width: 900px) { bottom: 100px; right: 22px; }
`

/* ─── Helper ─────────────────────────────────────── */
const SORT_LABELS: Record<string, string> = {
  created_at_desc: 'Newest First',
  title_asc: 'A-Z',
  view_count_desc: 'Most Viewed',
}
const PLATFORM_LABELS: Record<string, string> = {
  all: '🌐 All',
  windows: '🖥️ Windows',
  macos: '🍏 macOS',
}

export default function HomePage() {
  const [games, setGames] = useState<Game[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<string | null>(null)
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [sort, setSort] = useState('created_at_desc')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [comingSoonCount, setComingSoonCount] = useState(0)
  const [allGamesCount, setAllGamesCount] = useState(0)
  const [uptime, setUptime] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Mobile sheet state
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetClosing, setSheetClosing] = useState(false)
  // Temp state inside sheet (applied on "Apply")
  const [tmpCat, setTmpCat] = useState<string | null>(null)
  const [tmpPlatform, setTmpPlatform] = useState('all')
  const [tmpSort, setTmpSort] = useState('created_at_desc')

  // Scroll-to-top visibility
  const [showScrollTop, setShowScrollTop] = useState(false)

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Count active filters for badge
  const activeFilters = [
    selectedCat !== null ? 1 : 0,
    selectedPlatform !== 'all' ? 1 : 0,
    sort !== 'created_at_desc' ? 1 : 0,
  ].reduce((a, b) => a + b, 0)

  const pageTitle = 'Download Free PC Games'
  const pageDescription = 'Browse and download free PC games with fast cloud links, top categories, and A-Z filters for fast game discovery.'
  const pageKeywords = 'free pc games, download pc games, PC game hub, top PC games, freeware games'
  const pageSchema = {
    '@type': 'WebSite',
    url: getPageUrl('/'),
    name: SITE_NAME,
    description: pageDescription,
    potentialAction: {
      '@type': 'SearchAction',
      target: getPageUrl('/az-filter?q={search_term_string}'),
      queryInput: 'required name=search_term_string',
    },
  }

  const openSheet = () => {
    setTmpCat(selectedCat)
    setTmpPlatform(selectedPlatform)
    setTmpSort(sort)
    setSheetClosing(false)
    setSheetOpen(true)
  }

  const closeSheet = () => {
    setSheetClosing(true)
    setTimeout(() => { setSheetOpen(false); setSheetClosing(false) }, 280)
  }

  const applySheet = () => {
    setSelectedCat(tmpCat)
    setSelectedPlatform(tmpPlatform)
    setSort(tmpSort)
    setPage(1)
    closeSheet()
  }

  useEffect(() => {
    const launchDate = new Date('2026-08-04T12:11:17').getTime()

    const updateUptime = () => {
      const now = new Date().getTime()
      const distance = now - launchDate

      if (distance > 0) {
        setUptime({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        })
      }
    }

    updateUptime()
    const interval = setInterval(updateUptime, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const loadCategoriesAndCounts = async () => {
      const [catsRes, gamesRes] = await Promise.all([
        supabase.from('categories').select('*').order('name'),
        supabase.from('games').select('category_id, category_ids, is_coming_soon')
      ])

      setCategories(catsRes.data || [])

      const counts: Record<string, number> = {}
      let comingSoon = 0
      const allGames = (gamesRes.data as any[]) || []
      setAllGamesCount(allGames.length)

      allGames.forEach(g => {
        if (g.is_coming_soon) comingSoon++
        const catIds = new Set<string>()
        if (g.category_id) catIds.add(g.category_id)
        if (g.category_ids) g.category_ids.forEach((id: string) => catIds.add(id))

        catIds.forEach(id => {
          counts[id] = (counts[id] || 0) + 1
        })
      })

      setComingSoonCount(comingSoon)
      setCategoryCounts(counts)
    }
    loadCategoriesAndCounts()
  }, [])

  useEffect(() => {
    fetchGames()
  }, [selectedCat, selectedPlatform, sort, page])

  const fetchGames = async () => {
    setLoading(true)
    const [orderCol, orderDir] = sort === 'created_at_desc'
      ? ['created_at', false]
      : sort === 'title_asc' ? ['title', true] : ['view_count', false]

    let q = supabase
      .from('games')
      .select('*, category:categories(id,name,slug), download_links(id)', { count: 'exact' })
      .order(orderCol, { ascending: orderDir as boolean })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (selectedCat === 'coming_soon') {
      q = q.eq('is_coming_soon', true)
    } else if (selectedCat) {
      q = q.or(`category_id.eq.${selectedCat},category_ids.cs.{${selectedCat}}`)
    }

    if (selectedPlatform !== 'all') {
      q = q.contains('system_requirements', { platforms: [selectedPlatform] })
    }

    const { data, count } = await q
    setGames((data as any) || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const { t } = useLanguage()
  const { translateCategoryName } = useCategoryTranslator()

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        path="/"
        image="/LOGO.png"
        type="website"
        schema={pageSchema}
      />

      {/* Hero Banner */}
      <Hero>
        <HeroTitle>
          <img src="/game-2-svgrepo-com.svg" alt="Gamepad" style={{ width: 64, height: 64, filter: 'brightness(0) invert(1) drop-shadow(0 4px 12px rgba(124,58,237,0.5))' }} />
          {t('home.title')}
        </HeroTitle>
        <HeroSub>{t('home.subtitle')}</HeroSub>
        <UptimeContainer>
          <UptimeBlock>
            <UptimeValue>{uptime.days}</UptimeValue>
            <UptimeLabel>{t('home.uptime_days')}</UptimeLabel>
          </UptimeBlock>
          <UptimeBlock>
            <UptimeValue>{uptime.hours}</UptimeValue>
            <UptimeLabel>{t('home.uptime_hours')}</UptimeLabel>
          </UptimeBlock>
          <UptimeBlock>
            <UptimeValue>{uptime.minutes}</UptimeValue>
            <UptimeLabel>{t('home.uptime_minutes')}</UptimeLabel>
          </UptimeBlock>
          <UptimeBlock>
            <UptimeValue>{uptime.seconds}</UptimeValue>
            <UptimeLabel>{t('home.uptime_seconds')}</UptimeLabel>
          </UptimeBlock>
        </UptimeContainer>
        <HeroStats>
          <Stat><StatNum>{total}+</StatNum><StatLabel>{t('home.stat_games')}</StatLabel></Stat>
          <Stat><StatNum>{categories.length}</StatNum><StatLabel>{t('home.stat_categories')}</StatLabel></Stat>
          <Stat><StatNum>{t('home.stat_free')}</StatNum><StatLabel>{t('home.stat_always')}</StatLabel></Stat>
        </HeroStats>
      </Hero>

      <PageWrap>
        {/* Sidebar (desktop only) */}
        <Sidebar>
          <SidebarCard>
            <SidebarTitle><Filter size={12} /> {t('home.categories')}</SidebarTitle>
            <CatBtn $active={selectedCat === null} onClick={() => { setSelectedCat(null); setPage(1) }}>
              {t('home.all_games')}
              <span style={{ fontSize: 11, background: selectedCat === null ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', padding: '2px 6px', borderRadius: 6, minWidth: 20, textAlign: 'center' }}>
                {allGamesCount}
              </span>
            </CatBtn>
            <CatBtn $active={selectedCat === 'coming_soon'} onClick={() => { setSelectedCat('coming_soon'); setPage(1) }}>
              🚀 Coming Soon
              <span style={{ fontSize: 11, background: selectedCat === 'coming_soon' ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', padding: '2px 6px', borderRadius: 6, minWidth: 20, textAlign: 'center' }}>
                {comingSoonCount}
              </span>
            </CatBtn>
            {categories.map(cat => (
              <CatBtn key={cat.id} $active={selectedCat === cat.id} onClick={() => { setSelectedCat(cat.id); setPage(1) }}>
                {translateCategoryName(cat.name)}
                {categoryCounts[cat.id] > 0 && (
                  <span style={{ fontSize: 11, background: selectedCat === cat.id ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', padding: '2px 6px', borderRadius: 6, minWidth: 20, textAlign: 'center' }}>
                    {categoryCounts[cat.id]}
                  </span>
                )}
              </CatBtn>
            ))}
          </SidebarCard>
        </Sidebar>

        {/* Main Content */}
        <Content>
          <Toolbar>
            <ToolbarLeft>
              <Gamepad2 size={18} style={{ color: '#7c3aed' }} />
              <ResultCount>{total} games found</ResultCount>
            </ToolbarLeft>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {/* Desktop dropdowns */}
              <SortSelect value={selectedPlatform} onChange={e => { setSelectedPlatform(e.target.value); setPage(1) }}>
                <option value="all">{t('home.platform_all')}</option>
                <option value="windows">{t('home.platform_windows')}</option>
                <option value="macos">{t('home.platform_macos')}</option>
              </SortSelect>
              <SortSelect value={sort} onChange={e => { setSort(e.target.value); setPage(1) }}>
                <option value="created_at_desc">{t('home.sort_newest')}</option>
                <option value="title_asc">{t('home.sort_az')}</option>
                <option value="view_count_desc">{t('home.sort_most_viewed')}</option>
              </SortSelect>

              {/* Mobile filter button */}
              <MobileFilterBtn $active={activeFilters > 0} onClick={openSheet}>
                <SlidersHorizontal size={15} />
                {t('home.filter')}
                {activeFilters > 0 && <FilterBadge>{activeFilters}</FilterBadge>}
              </MobileFilterBtn>
            </div>
          </Toolbar>

          {loading ? (
            <LoadingOverlay>
              <Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} />
              {t('home.loading_games')}
            </LoadingOverlay>
          ) : games.length === 0 ? (
            <EmptyState>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎮</div>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{t('home.no_games')}</p>
              <p style={{ fontSize: 13 }}>{t('home.no_games_sub')}</p>
            </EmptyState>
          ) : (
            <Grid>
              {games.map((g, i) => <GameCard key={g.id} game={g as any} index={i} />)}
            </Grid>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PageBtn onClick={() => setPage(p => p - 1)} disabled={page === 1}><ChevronLeft size={16} /></PageBtn>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return <PageBtn key={p} $active={p === page} onClick={() => setPage(p)}>{p}</PageBtn>
              })}
              <PageBtn onClick={() => setPage(p => p + 1)} disabled={page === totalPages}><ChevronRight size={16} /></PageBtn>
            </Pagination>
          )}

          <div style={{ marginTop: 40 }}>
            <CommentSection type="website" isPreview={true} />
          </div>
        </Content>
      </PageWrap>

      {/* Mobile Bottom Sheet */}
      {sheetOpen && (
        <>
          <Backdrop $closing={sheetClosing} onClick={closeSheet} />
          <Sheet $closing={sheetClosing}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle><SlidersHorizontal size={16} style={{ color: '#7c3aed' }} /> {t('home.filter')}</SheetTitle>
              <SheetCloseBtn onClick={closeSheet}><X size={15} /></SheetCloseBtn>
            </SheetHeader>

            {/* Platform */}
            <SheetSection>
              <SheetSectionTitle>{t('home.platform')}</SheetSectionTitle>
              <ChipsRow>
                {(['all', 'windows', 'macos'] as const).map(p => (
                  <OptionChip key={p} $active={tmpPlatform === p} onClick={() => setTmpPlatform(p)}>
                    {PLATFORM_LABELS[p]}
                    {tmpPlatform === p && <Check size={12} />}
                  </OptionChip>
                ))}
              </ChipsRow>
            </SheetSection>

            {/* Sort */}
            <SheetSection>
              <SheetSectionTitle>{t('home.sort_by')}</SheetSectionTitle>
              <ChipsRow>
                {Object.entries(SORT_LABELS).map(([val, label]) => (
                  <OptionChip key={val} $active={tmpSort === val} onClick={() => setTmpSort(val)}>
                    {label}
                    {tmpSort === val && <Check size={12} />}
                  </OptionChip>
                ))}
              </ChipsRow>
            </SheetSection>

            {/* Categories */}
            <SheetSection>
              <SheetSectionTitle><Filter size={11} /> Categories</SheetSectionTitle>
              <MobileCatBtn $active={tmpCat === null} onClick={() => setTmpCat(null)}>
                All Games
                <span style={{ fontSize: 11, background: tmpCat === null ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)', padding: '2px 7px', borderRadius: 6 }}>
                  {allGamesCount}
                </span>
              </MobileCatBtn>
              <MobileCatBtn $active={tmpCat === 'coming_soon'} onClick={() => setTmpCat('coming_soon')}>
                🚀 Coming Soon
                <span style={{ fontSize: 11, background: tmpCat === 'coming_soon' ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)', padding: '2px 7px', borderRadius: 6 }}>
                  {comingSoonCount}
                </span>
              </MobileCatBtn>
              {categories.map(cat => (
                <MobileCatBtn key={cat.id} $active={tmpCat === cat.id} onClick={() => setTmpCat(cat.id)}>
                  {translateCategoryName(cat.name)}
                  {categoryCounts[cat.id] > 0 && (
                    <span style={{ fontSize: 11, background: tmpCat === cat.id ? 'rgba(124,58,237,0.4)' : 'rgba(124,58,237,0.2)', padding: '2px 7px', borderRadius: 6 }}>
                      {categoryCounts[cat.id]}
                    </span>
                  )}
                </MobileCatBtn>
              ))}
            </SheetSection>

            <SheetApplyBtn onClick={applySheet}>
              {t('home.apply_filters')} {activeFilters > 0 ? `(${activeFilters} ${t('home.active')})` : ''}
            </SheetApplyBtn>
          </Sheet>
        </>
      )}

      {/* Scroll to top button */}
      <ScrollTopBtn
        $visible={showScrollTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        title="Back to top"
      >
        <ChevronUp size={20} />
      </ScrollTopBtn>
    </>
  )
}
