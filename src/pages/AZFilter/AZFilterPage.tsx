import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useLocation } from 'react-router-dom'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import styled from 'styled-components'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import type { Game } from '../../lib/supabase'
import GameCard from '../../components/GameCard/GameCard'
import GameCardSkeleton from '../../components/Skeleton/GameCardSkeleton'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import Seo from '../../components/Seo'
import { getPageUrl } from '../../lib/seo'

const AZ_LETTERS = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]
const PAGE_SIZE = 100

const Page = styled.div`max-width: 1400px; margin: 0 auto; padding: 32px 24px;`

const PageHeader = styled.div`margin-bottom: 28px;`
const PageTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 2rem; font-weight: 800;
  background: linear-gradient(135deg, #fff 40%, #9d5cf5);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  margin-bottom: 8px;
`

const LetterStrip = styled.div`
  display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 28px;
`

const LetterBtn = styled.button<{ $active: boolean }>`
  min-width: 38px; height: 38px; border-radius: 8px; padding: 0 10px;
  border: 1px solid ${p => p.$active ? '#7c3aed' : 'rgba(124,58,237,0.2)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.7)'};
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  white-space: nowrap;
  &:hover { background: rgba(124,58,237,0.2); color: #fff; }
`

const SearchBar = styled.div`position: relative; max-width: 400px; margin-bottom: 24px;`
const SearchInput = styled.input`
  width: 100%; padding: 10px 16px 10px 40px;
  background: rgba(18,18,31,0.8); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 10px; color: #e2e8f0; font-size: 14px; outline: none;
  &:focus { border-color: rgba(124,58,237,0.5); }
  &::placeholder { color: rgba(148,163,184,0.5); }
`
const SearchIcon = styled.div`position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: rgba(148,163,184,0.5); pointer-events: none;`

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 18px;`

const Empty = styled.div`text-align: center; padding: 80px; color: rgba(148,163,184,0.4);`

const PaginationRow = styled.div`
  display: flex; align-items: center; justify-content: center;
  gap: 8px; margin-top: 40px; flex-wrap: wrap;
`
const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 36px; height: 36px; border-radius: 8px; padding: 0 10px;
  border: 1px solid ${p => p.$active ? '#7c3aed' : 'rgba(124,58,237,0.2)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.7)'};
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
  &:hover:not(:disabled) { background: rgba(124,58,237,0.2); color: #fff; }
  &:disabled { opacity: 0.3; cursor: default; }
`

export default function AZFilterPage() {
  const { t } = useLanguage()
  const location = useLocation()
  
  const [params, setParams] = useSearchParams()
  const activeLetter = params.get('letter') || 'All'
  const searchQ = params.get('q') || ''
  const page = Number(params.get('page') || '1')
  const [localQ, setLocalQ] = useState(searchQ)
  const [games, setGames] = useState<Game[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useScrollRestore(!loading && games.length > 0)

  useEffect(() => {
    fetchGames()
  }, [activeLetter, searchQ, page])

  const fetchGames = async () => {
    setLoading(true)
    let q = supabase
      .from('games')
      .select('*, category:categories(id,name,slug), download_links(id)', { count: 'exact' })
      .order('title', { ascending: true })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1)

    if (searchQ) {
      q = q.ilike('title', `%${searchQ}%`)
    } else if (activeLetter && activeLetter !== 'All') {
      if (activeLetter === '#') {
        q = q.or('title.ilike.0%,title.ilike.1%,title.ilike.2%,title.ilike.3%,title.ilike.4%,title.ilike.5%,title.ilike.6%,title.ilike.7%,title.ilike.8%,title.ilike.9%')
      } else {
        q = q.ilike('title', `${activeLetter}%`)
      }
    }

    const { data, count } = await q
    setGames((data as any) || [])
    setTotal(count || 0)
    setLoading(false)
  }

  const handleLetterClick = (l: string) => {
    setLoading(true)
    sessionStorage.removeItem(`scroll_${location.pathname}`)
    setLocalQ('')
    setParams({ letter: l }) // page resets to 1 automatically (no page param)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const handleSearch = (val: string) => {
    setLoading(true)
    sessionStorage.removeItem(`scroll_${location.pathname}`)
    setLocalQ(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val) setParams({ q: val }) // page resets to 1 automatically
      else setParams(new URLSearchParams())
    }, 350)
  }

  const handlePageChange = (p: number) => {
    setLoading(true)
    sessionStorage.removeItem(`scroll_${location.pathname}`)
    // Preserve existing letter/q params, update page
    const next = new URLSearchParams(params)
    if (p === 1) next.delete('page')
    else next.set('page', String(p))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const pageTitle = searchQ ? `Search results for ${searchQ}` : 'A-Z Game Browser'
  const pageDescription = searchQ
    ? `Search PC games starting with ${searchQ} and filter by platform or letter to find downloads fast.`
    : 'Browse PC games by name with A-Z filters and search for free downloads.'
  const pageKeywords = 'pc game browser, game search, a-z games, free game downloads'

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        path="/az-filter"
        image="/LOGO.png"
        type="website"
        schema={{
          '@type': 'WebPage',
          url: getPageUrl('/az-filter'),
          name: pageTitle,
          description: pageDescription,
        }}
      />

      <Page>
        <PageHeader>
          <PageTitle>{t('az.title')}</PageTitle>
          <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.6)' }}>{t('az.subtitle')}</p>
        </PageHeader>

        <SearchBar>
          <SearchIcon><Search size={16} /></SearchIcon>
          <SearchInput
            placeholder={t('az.search_placeholder')}
            value={localQ}
            onChange={e => handleSearch(e.target.value)}
          />
        </SearchBar>

        <LetterStrip>
          <LetterBtn $active={activeLetter === 'All' && !searchQ} onClick={() => { setLocalQ(''); setParams({}) }}>{t('az.all')}</LetterBtn>
          {AZ_LETTERS.map(l => (
            <LetterBtn key={l} $active={activeLetter === l && !searchQ} onClick={() => handleLetterClick(l)}>{l}</LetterBtn>
          ))}
        </LetterStrip>

        <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)', marginBottom: 20 }}>
          {searchQ ? t('az.search_results_for').replace('{q}', searchQ) : activeLetter === 'All' ? t('az.all_games_label') : t('az.games_starting_with').replace('{letter}', activeLetter)}
          {' · '}{total} {t('az.found')}
          {totalPages > 1 && ` · หน้า ${page}/${totalPages}`}
        </p>

        {loading ? (
          <Grid>
            {Array.from({ length: 12 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </Grid>
        ) : games.length === 0 ? (
          <Empty><div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div><p>{t('az.no_games_found')}</p></Empty>
        ) : (
          <Grid>{games.map((g, i) => <GameCard key={g.id} game={g as any} index={i} />)}</Grid>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <PaginationRow>
            <PageBtn onClick={() => handlePageChange(page - 1)} disabled={page === 1}><ChevronLeft size={16} /></PageBtn>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
              .reduce<(number | '...')[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`dots-${i}`} style={{ color: 'rgba(148,163,184,0.4)', padding: '0 4px' }}>…</span>
                  : <PageBtn key={p} $active={p === page} onClick={() => handlePageChange(p as number)}>{p}</PageBtn>
              )}
            <PageBtn onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}><ChevronRight size={16} /></PageBtn>
          </PaginationRow>
        )}
      </Page>
    </>
  )
}
