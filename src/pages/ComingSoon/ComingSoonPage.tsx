import { useState, useEffect } from 'react'
import { useScrollRestore } from '../../hooks/useScrollRestore'
import { Rocket, Clock, ExternalLink, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game } from '../../lib/supabase'
import Seo from '../../components/Seo'
import EpicCardSkeleton from '../../components/Skeleton/EpicCardSkeleton'
import { useLanguage } from '../../lib/i18n/LanguageContext'

import type { EpicFreeGame, SteamGame, EpicGeneralGame } from './ComingSoonFunctions'
import { fetchEpicGames, fetchSteamUpcoming, fetchEpicGeneralUpcoming, fmtDate } from './ComingSoonFunctions'

import { 
  SpinRefreshIcon, HeroBanner, HeroIconWrap, HeroTitle, HeroSub, Wrap, 
  Section, SectionHeader, SectionTitle, Badge, RefreshBtn, StatusRow, ErrorBox,
  EpicGrid, EpicCard, EpicImgWrap, EpicImg, EpicBadge, EpicSource, EpicBody, 
  EpicTitle, EpicDate
} from './ComingSoonStyles'

import { CountdownTimer } from './CountdownTimer'

export default function ComingSoonPage() {

  const { t } = useLanguage()
  
  const [nowGames, setNowGames] = useState<EpicFreeGame[]>([])
  const [soonGames, setSoonGames] = useState<EpicFreeGame[]>([])
  const [epicLoading, setEpicLoading] = useState(true)
  const [epicError, setEpicError] = useState('')
  const [localGames, setLocalGames] = useState<Game[]>([])
  const [localLoading, setLocalLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Epic General Upcoming state
  const [epicGeneralGames, setEpicGeneralGames] = useState<EpicGeneralGame[]>([])
  const [epicGeneralLoading, setEpicGeneralLoading] = useState(true)

  // Steam (Global Upcoming) state
  const [steamGames, setSteamGames] = useState<SteamGame[]>([])
  const [steamLoading, setSteamLoading] = useState(true)

  const loadEpic = async (force = false) => {
    if (force) setRefreshing(true)
    setEpicLoading(true)
    setEpicError('')
    try {
      const data = await fetchEpicGames(force)
      setNowGames(data.filter(g => !g.isUpcoming))
      setSoonGames(data.filter(g => g.isUpcoming))
    } catch (e: unknown) {
      setEpicError(e instanceof Error ? e.message : 'ดึงข้อมูลไม่สำเร็จ')
    } finally {
      setEpicLoading(false)
      setRefreshing(false)
    }
  }

  const loadAll = async () => {
    setLocalLoading(true)
    setEpicLoading(true)
    setSteamLoading(true)
    setEpicGeneralLoading(true)
    Promise.allSettled([
      supabase.from('games').select('*, categories(*)').eq('is_coming_soon', true).order('created_at', { ascending: false }),
      fetchEpicGames(false),
      fetchSteamUpcoming(),
      fetchEpicGeneralUpcoming()
    ]).then(([localRes, epicRes, steamRes, epicGeneralRes]) => {
      if (localRes.status === 'fulfilled') {
        setLocalGames((localRes.value.data as any) || [])
      }
      setLocalLoading(false)

      if (epicRes.status === 'fulfilled') {
        const now = epicRes.value.filter(g => !g.isUpcoming)
        const soon = epicRes.value.filter(g => g.isUpcoming)
        setNowGames(now)
        setSoonGames(soon)
      } else {
        setEpicError('ดึงข้อมูลไม่สำเร็จ')
      }
      setEpicLoading(false)

      if (steamRes.status === 'fulfilled') {
        setSteamGames(steamRes.value)
      }
      setSteamLoading(false)

      if (epicGeneralRes.status === 'fulfilled') {
        setEpicGeneralGames(epicGeneralRes.value)
      }
      setEpicGeneralLoading(false)
    })
  }

  useEffect(() => {
    loadAll()
  }, [])

  // Scroll restore: wait until ALL sections finish loading (explicit key prevents cross-page collision)
  useScrollRestore('scroll_pos_coming_soon', !localLoading && !epicLoading && !steamLoading && !epicGeneralLoading)

  return (
    <>
      <Seo
        title="Coming Soon & Free Games"
        description="เกมที่กำลังจะมาถึงและเกมแจกฟรีจาก Epic Games Store พร้อมเกม Coming Soon จากคลังของเรา"
        keywords="coming soon games, epic games free, เกมแจกฟรี"
        path="/coming-soon"
      />

      <HeroBanner>
        <HeroIconWrap>🚀</HeroIconWrap>
        <HeroTitle>Coming Soon & Free Games</HeroTitle>
        <HeroSub>{t('soon.titleGL')}</HeroSub>
      </HeroBanner>

      <Wrap>

        {/* â”€â”€ Epic: Free Now (Separate from Coming Soon) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <span style={{ color: '#0078f2', fontWeight: 800, fontSize: 13 }}>EPIC</span>
              🎮 {t('soon.epic.title')}
            </SectionTitle>
            {!epicLoading && <Badge>{nowGames.length + soonGames.length} {t('soon.games')}</Badge>}
            <RefreshBtn onClick={() => loadEpic(true)} disabled={refreshing || epicLoading}>
              <SpinRefreshIcon $active={refreshing}><RefreshCw size={12} /></SpinRefreshIcon>
              {refreshing ? '...' : t('soon.refresh')}
            </RefreshBtn>
          </SectionHeader>

          {epicLoading ? (
            <EpicGrid>
              {Array.from({ length: 4 }).map((_, i) => (
                <EpicCardSkeleton key={i} />
              ))}
            </EpicGrid>
          ) : epicError ? (
            <ErrorBox>âš ï¸ {epicError} {t('soon.error_refresh')}</ErrorBox>
          ) : (nowGames.length === 0 && soonGames.length === 0) ? (
            <StatusRow>{t('soon.epic.empty')}</StatusRow>
          ) : (
            <EpicGrid>
              {nowGames.map(g => (
                <EpicCard key={g.id} href={g.epicUrl} target="_blank" rel="noopener noreferrer" $now>
                  <EpicImgWrap>
                    <EpicImg $now src={g.coverImage} alt={g.title} loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '.3' }} />
                    <EpicBadge $now>{t('soon.epic.now')}</EpicBadge>
                    <EpicSource>EPIC GAMES</EpicSource>
                  </EpicImgWrap>
                  <EpicBody>
                    <EpicTitle title={g.title}>{g.title}</EpicTitle>
                    <EpicDate><Clock size={11} /> {t('soon.epic.until').replace('{date}', fmtDate(g.endDate))}</EpicDate>
                  </EpicBody>
                </EpicCard>
              ))}
              {soonGames.map(g => (
                <EpicCard key={g.id} href={g.epicUrl} target="_blank" rel="noopener noreferrer" $now={false}>
                  <EpicImgWrap>
                    <EpicImg $now={false} src={g.coverImage} alt={g.title} loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '.3' }} />
                    <EpicBadge $now={false} style={{ background: '#0078f2', color: '#fff', border: 'none' }}>
                      {t('soon.epic.soon_badge')}
                    </EpicBadge>
                    <CountdownTimer targetDate={g.startDate} label="ปลดล็อคในอีก" />
                    <EpicSource>EPIC GAMES</EpicSource>
                  </EpicImgWrap>
                  <EpicBody>
                    <EpicTitle title={g.title}>{g.title}</EpicTitle>
                    <EpicDate style={{ color: '#60a5fa' }}><Clock size={11} /> {t('soon.epic.starts').replace('{date}', fmtDate(g.startDate))}</EpicDate>
                  </EpicBody>
                </EpicCard>
              ))}
            </EpicGrid>
          )}
        </Section>

        {/* â”€â”€ Unified Coming Soon Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <Section>
          <SectionHeader>
            <SectionTitle><Rocket size={18} style={{ color: '#fbbf24' }} /> {t('soon.title')}</SectionTitle>
            {(!localLoading && !epicLoading && !steamLoading && !epicGeneralLoading) && (
              <Badge>{localGames.length + steamGames.length + epicGeneralGames.length} {t('soon.games')}</Badge>
            )}
          </SectionHeader>

          {(localLoading || epicLoading || steamLoading || epicGeneralLoading) ? (
            <EpicGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <EpicCardSkeleton key={i} />
              ))}
            </EpicGrid>
          ) : (localGames.length === 0 && steamGames.length === 0 && epicGeneralGames.length === 0) ? (
            <StatusRow>{t('soon.all_empty')}</StatusRow>
          ) : (
            <EpicGrid>
              {/* Local Games First */}
              {localGames.map(g => (
                <EpicCard key={`local-${g.id}`} href={`/game/${g.slug}`} $now={false}>
                  <EpicImgWrap>
                    <EpicImg $now src={g.cover_image || undefined} alt={g.title} loading="lazy" style={{ objectFit: 'cover' }}
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '.3' }} />
                    <EpicBadge $now={false} style={{ background: 'linear-gradient(135deg, #f59e0b, #fbbf24)', color: '#000' }}>
                      {t('soon.local.soon_badge')}
                    </EpicBadge>
                    <EpicSource style={{ background: '#7c3aed' }}>{t('soon.local.source')}</EpicSource>
                  </EpicImgWrap>
                  <EpicBody>
                    <EpicTitle title={g.title}>{g.title}</EpicTitle>
                    <EpicDate><Clock size={11} /> {t('soon.local.soon')}</EpicDate>
                  </EpicBody>
                </EpicCard>
              ))}

              {/* Epic Games Soon (General) */}
              {epicGeneralGames.map(g => (
                <EpicCard key={`epic-gen-${g.id}`} href={g.url} target="_blank" rel="noopener noreferrer" $now={false}>
                  <EpicImgWrap>
                    <EpicImg $now src={g.coverImage} alt={g.title} loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '.3' }} />
                    <EpicBadge $now={false} style={{ background: '#313131', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                      EPIC NEW
                    </EpicBadge>
                    <EpicSource style={{ background: '#313131' }}>EPIC GAMES</EpicSource>
                  </EpicImgWrap>
                  <EpicBody>
                    <EpicTitle title={g.title}>{g.title}</EpicTitle>
                    <EpicDate><Clock size={11} /> {fmtDate(g.releaseDate)}</EpicDate>
                  </EpicBody>
                </EpicCard>
              ))}

              {/* Steam Games Soon */}
              {steamGames.map(g => (
                <EpicCard key={`steam-${g.id}`} href={`https://store.steampowered.com/app/${g.id}`} target="_blank" rel="noopener noreferrer" $now={false}>
                  <EpicImgWrap>
                    <EpicImg $now src={g.large_capsule_image} alt={g.name} loading="lazy"
                      onError={e => { (e.target as HTMLImageElement).style.opacity = '.3' }} />
                    <EpicBadge $now={false} style={{ background: '#171a21', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
                      {t('soon.steam.hot_badge')}
                    </EpicBadge>
                    <EpicSource style={{ background: '#171a21' }}>{t('soon.steam.source')}</EpicSource>
                  </EpicImgWrap>
                  <EpicBody>
                    <EpicTitle title={g.name}>{g.name}</EpicTitle>
                    <EpicDate><Clock size={11} /> {t('soon.steam.hot')}</EpicDate>
                  </EpicBody>
                </EpicCard>
              ))}
            </EpicGrid>
          )}
        </Section>



        {/* â”€â”€ Attribution â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div style={{ textAlign: 'center', color: 'rgba(148,163,184,.4)', fontSize: 12, marginTop: 20 }}>
          {t('soon.attribution')}
          <a href="https://store.epicgames.com/en-US/free-games" target="_blank" rel="noopener noreferrer"
            style={{ color: '#0078f2', textDecoration: 'none' }}>
            Epic Games Store <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
          </a>
          {t('soon.cache')}
        </div>
      </Wrap>
    </>
  )
}
