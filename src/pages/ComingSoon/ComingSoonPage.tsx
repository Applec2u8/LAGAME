import { useState, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Rocket, Clock, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game } from '../../lib/supabase'
import Seo from '../../components/Seo'
import { useLanguage } from '../../lib/i18n/LanguageContext'

// ─── Types ─────────────────────────────────────────────────────
interface EpicFreeGame {
  id: string
  title: string
  coverImage: string
  startDate: string
  endDate: string
  epicUrl: string
  isUpcoming: boolean // false = free now, true = upcoming free
}

interface SteamGame {
  id: number
  name: string
  large_capsule_image: string
}


// ─── Cache (localStorage, 24h TTL) ────────────────────────────
const CACHE_KEY = 'epic_free_games_v3'
const CACHE_TTL = 24 * 60 * 60 * 1000

function getCached(): EpicFreeGame[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function setCached(data: EpicFreeGame[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* ignore */ }
}

// ─── Epic Games fetcher (no API key needed) ────────────────────
async function fetchEpicGames(force = false): Promise<EpicFreeGame[]> {
  if (!force) {
    const hit = getCached()
    if (hit) {
      const nowMs = Date.now()
      return hit.map(g => ({
        ...g,
        isUpcoming: new Date(g.startDate).getTime() > nowMs
      })).filter(g => new Date(g.endDate).getTime() > nowMs)
    }
  }

  // /api/epic → Vite proxy (dev) or Cloudflare Pages Function (production)
  const res = await fetch('/api/epic', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = json?.data?.Catalog?.searchStore?.elements ?? []

  const results: EpicFreeGame[] = []

  for (const el of elements) {
    if (!el.promotions) continue

    const img =
      el.keyImages?.find((i: { type: string }) => i.type === 'OfferImageTall')?.url ||
      el.keyImages?.find((i: { type: string }) => i.type === 'DieselGameBoxTall')?.url ||
      el.keyImages?.find((i: { type: string }) => i.type === 'Thumbnail')?.url ||
      el.keyImages?.[0]?.url || ''

    const slug =
      el.catalogNs?.mappings?.find((m: { pageType: string }) => m.pageType === 'productHome')?.pageSlug ||
      el.productSlug || el.urlSlug || ''

    const link = slug
      ? `https://store.epicgames.com/en-US/p/${slug}`
      : 'https://store.epicgames.com/en-US/free-games'

    // Current free offers
    let addedNow = false;
    for (const bucket of (el.promotions?.promotionalOffers ?? [])) {
      for (const offer of (bucket.promotionalOffers ?? [])) {
        if (offer.discountSetting?.discountPercentage === 0) {
          results.push({
            id: `${el.id}-now`,
            title: el.title,
            coverImage: img,
            startDate: offer.startDate,
            endDate: offer.endDate,
            epicUrl: link,
            isUpcoming: false,
          })
          addedNow = true;
          break; // Stop processing offers for this bucket if we found one
        }
      }
      if (addedNow) break;
    }

    // Upcoming free offers
    let addedSoon = false;
    for (const bucket of (el.promotions?.upcomingPromotionalOffers ?? [])) {
      for (const offer of (bucket.promotionalOffers ?? [])) {
        // Upcoming offers often don't have discountPercentage=0 set yet, 
        // they just exist in the upcomingPromotionalOffers array
        if (offer.discountSetting?.discountPercentage === 0 || el.promotions?.upcomingPromotionalOffers?.length > 0) {
          results.push({
            id: `${el.id}-soon`,
            title: el.title,
            coverImage: img,
            startDate: offer.startDate,
            endDate: offer.endDate,
            epicUrl: link,
            isUpcoming: true,
          })
          addedSoon = true;
          break;
        }
      }
      if (addedSoon) break;
    }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  const unique = results.filter(g => {
    const k = g.title
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const nowMs = Date.now()
  const evaluated = unique.map(g => ({
    ...g,
    isUpcoming: new Date(g.startDate).getTime() > nowMs
  })).filter(g => new Date(g.endDate).getTime() > nowMs)

  // Sort: upcoming first
  evaluated.sort((a, b) => (a.isUpcoming === b.isUpcoming ? 0 : a.isUpcoming ? -1 : 1))

  setCached(evaluated)
  return evaluated
}

async function fetchSteamUpcoming(): Promise<SteamGame[]> {
  try {
    const res = await fetch('/api/steam')
    if (!res.ok) return []
    const wrapper = await res.json()
    const html = wrapper?.contents || ''

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const rows = doc.querySelectorAll('.search_result_row')

    return Array.from(rows).slice(0, 15).map(row => {
      const imgElem = row.querySelector('.search_capsule img') as HTMLImageElement
      const titleElem = row.querySelector('.title')
      const appId = parseInt(row.getAttribute('data-ds-appid') || '0', 10)
      let capsule = imgElem?.getAttribute('src') || ''
      const srcset = imgElem?.getAttribute('srcset') || ''

      // Steam often uses srcset for lazy loading, with the largest image at the end
      if (srcset) {
        const urls = srcset.match(/(https:\/\/[^\s,]+)/g)
        if (urls && urls.length > 0) {
          capsule = urls[urls.length - 1]
        }
      }

      // If it's a lazy-load placeholder, construct the URL manually via appId
      if (capsule.includes('trans.gif') && appId) {
        capsule = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`
      } else if (capsule) {
        capsule = capsule.replace('capsule_231x87', 'capsule_616x353')
          .replace('capsule_sm_120', 'capsule_616x353')
      }
      return {
        id: appId,
        name: titleElem?.textContent || 'Unknown',
        large_capsule_image: capsule
      }
    })
  } catch {
    return []
  }
}


interface EpicGeneralGame {
  id: string
  title: string
  coverImage: string
  url: string
  releaseDate: string
}

async function fetchEpicGeneralUpcoming(): Promise<EpicGeneralGame[]> {
  try {
    // Epic doesn't have a strict 'coming soon' endpoint, so we query the catalog and sort by release date ascending
    // filtering out games that have already been released.
    const url = 'https://store-site-backend-static.ak.epicgames.com/api/content/v2/catalog/search?locale=th&country=TH&category=games%2Fedition%2Fbase&count=100&sortBy=releaseDate&sortDir=ASC'
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    const elements = json?.data?.Catalog?.searchStore?.elements || []
    const now = new Date().toISOString()
    
    // Filter for unreleased games and take the first 15
    const upcoming = elements.filter((e: any) => e.releaseDate && e.releaseDate > now && e.status !== 'ACTIVE').slice(0, 15)
    
    return upcoming.map((el: any) => {
      const img = el.keyImages?.find((i: any) => i.type === 'OfferImageTall')?.url || 
                  el.keyImages?.find((i: any) => i.type === 'Thumbnail')?.url || 
                  el.keyImages?.[0]?.url || ''
      const slug = el.catalogNs?.mappings?.find((m: any) => m.pageType === 'productHome')?.pageSlug || el.productSlug || el.urlSlug
      return {
        id: el.id,
        title: el.title,
        coverImage: img,
        url: `https://store.epicgames.com/en-US/p/${slug}`,
        releaseDate: el.releaseDate
      }
    })
  } catch {
    return []
  }
}

// ─── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr} น.`
}

// ─── Animations ────────────────────────────────────────────────
const float = keyframes`
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-7px)}
`
const shimmer = keyframes`
  0%{background-position:-200% center}
  100%{background-position:200% center}
`
const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`

const SpinIcon = styled.span`
  display: inline-flex;
  animation: ${spin} 0.8s linear infinite;
`
const SpinRefreshIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  ${p => p.$active && css`
    animation: ${spin} 0.8s linear infinite;
  `}
`

// ─── Styled Components ─────────────────────────────────────────
const HeroBanner = styled.div`
  background:
    linear-gradient(to bottom,rgba(8,8,16,.5) 0%,rgba(8,8,16,.96) 100%),
    url('/bg.jpg') center 38%/cover no-repeat;
  padding: 56px 24px 48px;
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content:'';
    position:absolute;inset:0;
    background:radial-gradient(ellipse at center top,rgba(124,58,237,.18) 0%,transparent 60%);
  }
  >*{position:relative;z-index:1}
`
const HeroIconWrap = styled.div`
  font-size:56px;
  line-height:1;
  margin-bottom:12px;
  animation:${float} 3s ease-in-out infinite;
`
const HeroTitle = styled.h1`
  font-family:'Noto Sans Lao',sans-serif;
  font-size:clamp(1.8rem,4vw,3rem);
  font-weight:900;
  margin-bottom:10px;
  background:linear-gradient(135deg,#fff 0%,#a855f7 50%,#06b6d4 100%);
  background-size:200% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:${shimmer} 3s linear infinite;
`
const HeroSub = styled.p`
  color:rgba(148,163,184,.8);
  font-size:15px;
  max-width:520px;
  margin:0 auto;
`
const Wrap = styled.div`
  max-width:1280px;
  margin:0 auto;
  padding:0 20px 60px;
`
const Section = styled.section`margin-bottom:48px`

const SectionHeader = styled.div`
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:10px;
  margin-bottom:20px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(124,58,237,.15);
`
const SectionTitle = styled.h2`
  font-size:clamp(15px, 3.5vw, 18px);
  font-weight:700;color:#e2e8f0;margin:0;
  display:flex;
  align-items:center;gap:8px;
  // flex-wrap:wrap;
`
const Badge = styled.span`
  font-size:11px;font-weight:600;padding:3px 10px;
  border-radius:99px;background:rgba(124,58,237,.2);
  color:#a855f7;border:1px solid rgba(124,58,237,.3);
`
const RefreshBtn = styled.button`
  margin-left:auto;
  display:flex;align-items:center;gap:6px;
  padding:6px 14px;border-radius:8px;
  background:rgba(124,58,237,.15);
  border:1px solid rgba(124,58,237,.3);
  color:#a855f7;font-size:12px;font-weight:600;
  cursor:pointer;transition:all .2s;
  &:hover{background:rgba(124,58,237,.25)}
  &:disabled{opacity:.5;cursor:not-allowed}
`
const StatusRow = styled.div`
  display:flex;align-items:center;gap:10px;
  color:rgba(148,163,184,.6);font-size:13px;padding:20px 0;
`
const ErrorBox = styled.div`
  padding:18px;border-radius:12px;
  background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);
  color:rgba(239,68,68,.9);font-size:13px;
`

// Epic card grid
const EpicGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
  gap:20px;
  @media(max-width:640px){
    grid-template-columns:repeat(auto-fill,minmax(145px,1fr));
    gap:12px;
  }
`
const EpicCard = styled.a<{ $now: boolean }>`
  display:block;border-radius:14px;overflow:hidden;
  background:rgba(18,18,31,.9);
  border:1px solid ${p => p.$now ? 'rgba(34,197,94,.25)' : 'rgba(251,191,36,.25)'};
  text-decoration:none;
  transition:transform .25s,box-shadow .25s,border-color .25s,opacity .25s;
  position:relative;
  &:hover{
    transform:translateY(-4px);
    box-shadow:0 12px 32px ${p => p.$now ? 'rgba(34,197,94,.18)' : 'rgba(251,191,36,.18)'};
    border-color:${p => p.$now ? 'rgba(34,197,94,.5)' : 'rgba(251,191,36,.5)'};
  }
`
const EpicImgWrap = styled.div`position:relative;aspect-ratio:3/4;overflow:hidden;background:#0d0d1a`
const EpicImg = styled.img<{ $now?: boolean }>`
  width:100%;height:100%;object-fit:cover;
  transition:transform .4s ease,opacity .4s ease;
  opacity: ${p => p.$now ? 1 : 0.5};
  ${EpicCard}:hover &{
    transform:scale(1.05);
    opacity: 1;
  }
`
const EpicBadge = styled.div<{ $now: boolean }>`
  position:absolute;top:8px;left:8px;
  font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;
  background:${p => p.$now ? 'rgba(34,197,94,.9)' : 'rgba(251,191,36,.9)'};
  color:#000;text-transform:uppercase;letter-spacing:.5px;
  backdrop-filter:blur(4px);
`
const EpicSource = styled.div`
  position:absolute;bottom:8px;right:8px;
  font-size:9px;font-weight:700;padding:3px 7px;
  border-radius:5px;background:rgba(0,0,0,.7);
  color:rgba(255,255,255,.7);letter-spacing:.5px;
`
const EpicBody = styled.div`padding:12px`
const EpicTitle = styled.div`
  font-size:13px;font-weight:700;color:#e2e8f0;
  margin-bottom:6px;line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
`
const EpicDate = styled.div`
  font-size:11px;color:rgba(148,163,184,.7);
  display:flex;align-items:center;gap:5px;
`

// ─── Countdown Timer Component ─────────────────────────────────
const CountdownWrap = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 85%;
  z-index: 2;
  pointer-events: none;
`

const TimeBox = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`

const TimeSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  span.val { font-size: 15px; }
  span.lbl { font-size: 9px; color: rgba(255,255,255,0.6); text-transform: uppercase; margin-top: 2px; }
`

function CountdownTimer({ targetDate, label = 'Starts in' }: { targetDate: string, label?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(targetDate).getTime() - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft === 0) return null;

  const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
  const hours = Math.floor((timeLeft / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
  const seconds = Math.floor((timeLeft / 1000) % 60);

  return (
    <CountdownWrap>
      <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>{label}</div>
      <TimeBox>
        {days > 0 && (
          <TimeSection><span className="val">{days}</span><span className="lbl">d</span></TimeSection>
        )}
        <TimeSection><span className="val">{hours.toString().padStart(2, '0')}</span><span className="lbl">h</span></TimeSection>
        <TimeSection><span className="val">{minutes.toString().padStart(2, '0')}</span><span className="lbl">m</span></TimeSection>
        <TimeSection><span className="val">{seconds.toString().padStart(2, '0')}</span><span className="lbl">s</span></TimeSection>
      </TimeBox>
    </CountdownWrap>
  );
}


// ─── Component ─────────────────────────────────────────────────
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

        {/* ── Epic: Free Now (Separate from Coming Soon) ──────────────────────────────── */}
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
            <StatusRow>
              <SpinIcon><Loader2 size={16} /></SpinIcon>
              {t('soon.epic.loading')}
            </StatusRow>
          ) : epicError ? (
            <ErrorBox>⚠️ {epicError} {t('soon.error_refresh')}</ErrorBox>
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

        {/* ── Unified Coming Soon Grid ────────────────────────────── */}
        <Section>
          <SectionHeader>
            <SectionTitle><Rocket size={18} style={{ color: '#fbbf24' }} /> {t('soon.title')}</SectionTitle>
            {(!localLoading && !epicLoading && !steamLoading && !epicGeneralLoading) && (
              <Badge>{localGames.length + steamGames.length + epicGeneralGames.length} {t('soon.games')}</Badge>
            )}
          </SectionHeader>

          {(localLoading || epicLoading || steamLoading || epicGeneralLoading) ? (
            <StatusRow>
              <SpinIcon><Loader2 size={16} /></SpinIcon>
              {t('soon.all_loading')}
            </StatusRow>
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



        {/* ── Attribution ─────────────────────────────────── */}
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
