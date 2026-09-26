import { useState, useEffect } from 'react'
import { useScrollRestore } from '../../hooks/useScrollRestore'

import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import type { Game } from '../../lib/supabase'
import GameCard from '../../components/GameCard/GameCard'
import GameCardSkeleton from '../../components/Skeleton/GameCardSkeleton'
import Seo from '../../components/Seo'
import { getPageUrl } from '../../lib/seo'

import { Page, Banner, BannerTitle, Grid, TopLabel, GameWrap } from './TopGamesStyles'

export default function TopGamesPage() {
  const { t } = useLanguage()
  
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  // Use universal scroll restore hook
  useScrollRestore(!loading && games.length > 0)

  useEffect(() => {
    const fetchGames = async () => {
      // 1. Try fetching AI Ranked games
      const { data: aiRanked } = await supabase
        .from('games')
        .select('*, category:categories(id,name,slug), download_links(id)')
        .not('ai_rank', 'is', null)
        .order('ai_rank', { ascending: true })
        .limit(10)
      
      if (aiRanked && (aiRanked as any[]).length > 0) {
        setGames((aiRanked as any) || [])
        setLoading(false)
        return
      }

      // 2. Fallback to view_count
      const { data: popular } = await supabase
        .from('games')
        .select('*, category:categories(id,name,slug), download_links(id)')
        .order('view_count', { ascending: false })
        .limit(50)
      
      setGames((popular as any) || [])
      setLoading(false)
    }

    fetchGames()
  }, [])

  const pageTitle = 'Top PC Games'
  const pageDescription = 'Explore the best free PC games ranked by downloads, popularity, and AI recommendations.'
  const pageKeywords = 'top pc games, best pc games, free game downloads, game ranking'

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        path="/top-games"
        image="/LOGO.png"
        type="website"
        schema={{
          '@type': 'ItemList',
          itemListElement: games.map((g, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: getPageUrl(`/game/${g.slug}`),
            name: g.title,
          })),
        }}
      />

      <Page>
        <Banner>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
          <BannerTitle>{t('top.title')}</BannerTitle>
          <p style={{ fontSize: 15, color: 'rgba(148,163,184,0.7)' }}>{t('top.subtitle')}</p>
        </Banner>

      {loading ? (
        <Grid>
          {Array.from({ length: 12 }).map((_, i) => (
            <GameWrap key={i}>
              <TopLabel $rank={i + 1}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </TopLabel>
              <GameCardSkeleton />
            </GameWrap>
          ))}
        </Grid>
      ) : (
        <Grid>
          {games.map((g, i) => (
            <GameWrap key={g.id}>
              <TopLabel $rank={i + 1}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </TopLabel>
              <GameCard game={g as any} index={i} />
            </GameWrap>
          ))}
        </Grid>
      )}
    </Page>
    </>
  )
}
