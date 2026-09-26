import { useState, useEffect } from 'react'
import { useScrollRestore } from '../../hooks/useScrollRestore'
// import { Link } from 'react-router-dom'

import { useLanguage } from '../../lib/i18n/LanguageContext'
import { Filter, Gamepad2, ChevronLeft, ChevronRight, X, SlidersHorizontal, Check, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game, Category } from '../../lib/supabase'
import { useCategoryTranslator } from '../../lib/i18n/CategoryTranslator'
import GameCard from '../../components/GameCard/GameCard'
import GameCardSkeleton from '../../components/Skeleton/GameCardSkeleton'
import CommentSection from '../../components/CommentSection/CommentSection'
import Seo from '../../components/Seo'
import { getPageUrl, SITE_NAME } from '../../lib/seo'


import {
  Hero, HeroTitle, HeroSub, UptimeContainer, UptimeBlock, UptimeValue, UptimeLabel,
  HeroStats, Stat, StatNum, StatLabel, PageWrap, Sidebar, SidebarCard, SidebarTitle,
  CatBtn, Content, Toolbar, ToolbarLeft, ResultCount, SortSelect, Grid, EmptyState,
  Pagination, PageBtn, MobileFilterBtn, FilterBadge, Backdrop, Sheet, SheetHandle,
  SheetHeader, SheetTitle, SheetCloseBtn, SheetSection, SheetSectionTitle,
  ChipsRow, OptionChip, MobileCatBtn, SheetApplyBtn, ScrollTopBtn
} from './HomeStyles'

const PAGE_SIZE = 100

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
  const [selectedCat, setSelectedCat] = useState<string | null>(() => sessionStorage.getItem('hp_cat') || null);
  useEffect(() => { if (selectedCat) sessionStorage.setItem('hp_cat', selectedCat); else sessionStorage.removeItem('hp_cat'); }, [selectedCat]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>(() => sessionStorage.getItem('hp_platform') || 'all');
  useEffect(() => { sessionStorage.setItem('hp_platform', selectedPlatform); }, [selectedPlatform]);
  const [sort, setSort] = useState(() => sessionStorage.getItem('hp_sort') || 'created_at_desc');
  useEffect(() => { sessionStorage.setItem('hp_sort', sort); }, [sort]);
  const [page, setPage] = useState(() => {
    const saved = sessionStorage.getItem('home_page_index');
    return saved ? Number(saved) : 1;
  })

  useEffect(() => {
    sessionStorage.setItem('home_page_index', page.toString());
  }, [page]);

  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Universal scroll restore
  useScrollRestore(!loading && games.length > 0);
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

  // Restore scroll position after data load
  useScrollRestore(!loading && games.length > 0)

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
            <CatBtn $active={selectedCat === null} onClick={() => { setLoading(true); setSelectedCat(null); setPage(1); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
              {t('home.all_games')}
              <span style={{ fontSize: 11, background: selectedCat === null ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', padding: '2px 6px', borderRadius: 6, minWidth: 20, textAlign: 'center' }}>
                {allGamesCount}
              </span>
            </CatBtn>
            <CatBtn $active={selectedCat === 'coming_soon'} onClick={() => { setLoading(true); setSelectedCat('coming_soon'); setPage(1); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
              🚀 Coming Soon
              <span style={{ fontSize: 11, background: selectedCat === 'coming_soon' ? 'rgba(255,255,255,0.2)' : 'rgba(124,58,237,0.2)', padding: '2px 6px', borderRadius: 6, minWidth: 20, textAlign: 'center' }}>
                {comingSoonCount}
              </span>
            </CatBtn>
            {categories.map(cat => (
              <CatBtn key={cat.id} $active={selectedCat === cat.id} onClick={() => { setLoading(true); setSelectedCat(cat.id); setPage(1); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
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
              <SortSelect value={selectedPlatform} onChange={e => { setLoading(true); setSelectedPlatform(e.target.value); setPage(1); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
                <option value="all">{t('home.platform_all')}</option>
                <option value="windows">{t('home.platform_windows')}</option>
                <option value="macos">{t('home.platform_macos')}</option>
              </SortSelect>
              <SortSelect value={sort} onChange={e => { setLoading(true); setSort(e.target.value); setPage(1); window.scrollTo({ top: 0, behavior: 'instant' }); }}>
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
            <Grid>
              {Array.from({ length: 12 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </Grid>
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
              <PageBtn onClick={() => { setLoading(true); setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'instant' }); }} disabled={page === 1}><ChevronLeft size={16} /></PageBtn>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = i + 1
                return <PageBtn key={p} $active={p === page} onClick={() => { setLoading(true); setPage(p); window.scrollTo({ top: 0, behavior: 'instant' }); }}>{p}</PageBtn>
              })}
              <PageBtn onClick={() => { setLoading(true); setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'instant' }); }} disabled={page === totalPages}><ChevronRight size={16} /></PageBtn>
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
