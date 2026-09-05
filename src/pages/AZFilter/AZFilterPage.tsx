import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import type { Game } from '../../lib/supabase'
import GameCard from '../../components/GameCard/GameCard'
import { Search, Loader2 } from 'lucide-react'
import Seo from '../../components/Seo'
import { getPageUrl } from '../../lib/seo'

const AZ_LETTERS = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]

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
  width: 38px; height: 38px; border-radius: 8px;
  border: 1px solid ${p => p.$active ? '#7c3aed' : 'rgba(124,58,237,0.2)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.7)'};
  font-size: 13px; font-weight: 700; cursor: pointer; transition: all 0.15s;
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

const Loading = styled.div`display: flex; align-items: center; justify-content: center; min-height: 200px; color: rgba(148,163,184,0.5); gap: 10px; font-size: 14px;`

export default function AZFilterPage() {
  const { t } = useLanguage()
  const [params, setParams] = useSearchParams()
  const activeLetter = params.get('letter') || 'All'
  const searchQ = params.get('q') || ''
  const [localQ, setLocalQ] = useState(searchQ)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    fetchGames()
  }, [activeLetter, searchQ])

  const fetchGames = async () => {
    setLoading(true)
    let q = supabase
      .from('games')
      .select('*, category:categories(id,name,slug), download_links(id)')
      .order('title', { ascending: true })
      .limit(200)

    if (searchQ) {
      q = q.ilike('title', `%${searchQ}%`)
    } else if (activeLetter && activeLetter !== 'All') {
      if (activeLetter === '#') {
        q = q.or('title.ilike.0%,title.ilike.1%,title.ilike.2%,title.ilike.3%,title.ilike.4%,title.ilike.5%,title.ilike.6%,title.ilike.7%,title.ilike.8%,title.ilike.9%')
      } else {
        q = q.ilike('title', `${activeLetter}%`)
      }
    }

    const { data } = await q
    setGames((data as any) || [])
    setLoading(false)
  }

  const handleLetterClick = (l: string) => {
    setLocalQ('')
    setParams({ letter: l })
  }

  const handleSearch = (val: string) => {
    setLocalQ(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val) setParams({ q: val })
      else setParams(new URLSearchParams())
    }, 350)
  }

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
          {' · '}{games.length} {t('az.found')}
        </p>

        {loading ? (
          <Loading><Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('az.loading')}</Loading>
        ) : games.length === 0 ? (
          <Empty><div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div><p>{t('az.no_games_found')}</p></Empty>
        ) : (
          <Grid>{games.map((g, i) => <GameCard key={g.id} game={g as any} index={i} />)}</Grid>
        )}
      </Page>
    </>
  )
}
