import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Loader2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import type { Game } from '../../lib/supabase'
import GameCard from '../../components/GameCard/GameCard'
import Seo from '../../components/Seo'
import { getPageUrl } from '../../lib/seo'

const Page = styled.div`max-width: 1400px; margin: 0 auto; padding: 32px 24px;`

const Banner = styled.div`
  background: linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.08) 100%);
  border: 1px solid rgba(245,158,11,0.2); border-radius: 20px;
  padding: 40px 32px; margin-bottom: 36px; text-align: center;
`

const BannerTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif; font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 900; color: #fff; margin-bottom: 10px;
`

const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px;`

const TopLabel = styled.div<{ $rank: number }>`
  position: absolute; top: 10px; left: 10px; z-index: 10;
  width: 32px; height: 32px; border-radius: 8px;
  background: ${p => p.$rank === 1 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : p.$rank === 2 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : p.$rank === 3 ? 'linear-gradient(135deg,#d97706,#92400e)' : 'rgba(124,58,237,0.8)'};
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 800; color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
`

const GameWrap = styled.div`position: relative;`

const Loading = styled.div`display: flex; align-items: center; justify-content: center; min-height: 300px; color: rgba(148,163,184,0.5); gap: 10px; font-size: 14px;`

export default function TopGamesPage() {
  const { t } = useLanguage()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

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
        <Loading><Loader2 size={20} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('az.loading')}</Loading>
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
