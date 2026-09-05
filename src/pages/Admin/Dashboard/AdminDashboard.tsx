import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'
import { Gamepad2, Tags, Eye, Plus, TrendingUp, Globe, BarChart2, Activity } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { getSitePlatformStats, getAllGamesPlatformStats, getTotalSiteVisits, getSitePlatformModelStats, getAllGamesPlatformModelStats } from '../../../lib/analytics'
import type { PlatformStat } from '../../../lib/analytics'

// ── Animations ─────────────────────────────────────────────────────
const fadeUp = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`

// ── Platform config ────────────────────────────────────────────────
const PLATFORM_CONFIG: Record<string, { label: string; icon: string; color: string; gradient: string }> = {
  windows: { label: 'Windows', icon: '🪟', color: '#06b6d4', gradient: 'linear-gradient(135deg,#06b6d4,#0284c7)' },
  macos: { label: 'macOS', icon: '🍎', color: '#a78bfa', gradient: 'linear-gradient(135deg,#a78bfa,#7c3aed)' },
  ios: { label: 'iOS', icon: '📱', color: '#34d399', gradient: 'linear-gradient(135deg,#34d399,#059669)' },
  android: { label: 'Android', icon: '🤖', color: '#fbbf24', gradient: 'linear-gradient(135deg,#fbbf24,#d97706)' },
  linux: { label: 'Linux', icon: '🐧', color: '#f97316', gradient: 'linear-gradient(135deg,#f97316,#ea580c)' },
  other: { label: 'Other', icon: '🌐', color: '#94a3b8', gradient: 'linear-gradient(135deg,#94a3b8,#64748b)' },
}
const getPConfig = (p: string) => PLATFORM_CONFIG[p] ?? PLATFORM_CONFIG.other

// ── Styled Components ──────────────────────────────────────────────
const Grid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px;
  animation: ${fadeUp} 0.4s ease both;
`

const StatCard = styled.div<{ $color: string }>`
  position: relative;
  background: rgba(20,20,35,0.6); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px; padding: 24px 28px;
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  &::before {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px;
    background: ${p => p.$color};
    box-shadow: 0 0 20px ${p => p.$color};
  }
  &:hover { 
    transform: translateY(-6px); 
    box-shadow: 0 24px 48px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
    background: rgba(30,30,50,0.8);
  }
`
const StatIconBox = styled.div<{ $color: string }>`
  width: 48px; height: 48px; border-radius: 14px;
  background: ${p => p.$color}22;
  color: ${p => p.$color};
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 16px;
`
const StatNum = styled.div`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 36px; font-weight: 900;
  color: #fff; line-height: 1; letter-spacing: -0.5px;
`
const StatLabel = styled.div`font-size: 14px; color: rgba(148,163,184,0.7); margin-top: 8px; font-weight: 500; letter-spacing: 0.3px;`

const Section = styled.div`
  background: rgba(20,20,35,0.6); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 24px; padding: 28px; margin-bottom: 24px;
  animation: ${fadeUp} 0.45s ease both;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
`
const SectionHeader = styled.div`display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;`
const SectionTitle = styled.h2`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 16px; font-weight: 700; color: #fff;
  display: flex; align-items: center; gap: 8px;
`
const AddBtn = styled(Link)`
  display: flex; align-items: center; gap: 6px; padding: 8px 16px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4); border-radius: 8px;
  font-size: 13px; font-weight: 600; color: #fff; transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`
const GameRow = styled.div`
  display: flex; align-items: center; gap: 12px; padding: 10px 0;
  border-bottom: 1px solid rgba(124,58,237,0.08);
  &:last-child { border-bottom: none; }
`
const GameThumb = styled.img`width: 52px; height: 36px; object-fit: cover; border-radius: 6px;`
const GameThumbPlaceholder = styled.div`width: 52px; height: 36px; background: rgba(124,58,237,0.1); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 18px;`
const GameTitle = styled.span`font-size: 14px; font-weight: 500; color: #e2e8f0; flex: 1;`
const ViewCount = styled.span`font-size: 12px; color: rgba(148,163,184,0.5); display: flex; align-items: center; gap: 4px;`

// ── Analytics Chart ────────────────────────────────────────────────
const BarWrap = styled.div`display: flex; flex-direction: column; gap: 14px;`
const BarRow = styled.div`display: flex; align-items: center; gap: 12px;`
const BarLabel = styled.div`width: 90px; font-size: 13px; color: #e2e8f0; display: flex; align-items: center; gap: 6px; flex-shrink: 0;`
const BarTrack = styled.div`flex: 1; height: 10px; background: rgba(255,255,255,0.05); border-radius: 999px; overflow: hidden;`
const grow = (w: string) => keyframes`from { width: 0%; } to { width: ${w}; }`
const BarFill = styled.div<{ $pct: string; $grad: string }>`
  height: 100%; border-radius: 999px;
  background: ${p => p.$grad};
  width: ${p => p.$pct};
  animation: ${p => grow(p.$pct)} 0.8s cubic-bezier(0.34,1.56,0.64,1) both;
`
const BarCount = styled.div`width: 52px; text-align: right; font-size: 13px; font-weight: 700; color: rgba(148,163,184,0.8);`

// ── Platform mini badges ───────────────────────────────────────────
const PlatformBadge = styled.span<{ $color: string }>`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700;
  background: ${p => p.$color}22; color: ${p => p.$color};
  border: 1px solid ${p => p.$color}44;
`

// ── Two-col grid for analytics ─────────────────────────────────────
const AnalyticsGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
  animation: ${fadeUp} 0.5s ease both;
`

// ── Top games by total views table ────────────────────────────────
const Table = styled.table`width: 100%; border-collapse: collapse;`
const Th = styled.th`
  text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px; color: rgba(148,163,184,0.5);
  border-bottom: 1px solid rgba(124,58,237,0.1);
`
const Td = styled.td`
  padding: 10px 12px; font-size: 13px; color: #e2e8f0;
  border-bottom: 1px solid rgba(124,58,237,0.06);
`
const Rank = styled.div<{ $rank: number }>`
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 900;
  background: ${p => p.$rank === 1 ? 'linear-gradient(135deg,#fbbf24,#f59e0b)' : p.$rank === 2 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : p.$rank === 3 ? 'linear-gradient(135deg,#f97316,#ea580c)' : 'rgba(255,255,255,0.08)'};
  color: ${p => p.$rank <= 3 ? '#fff' : 'rgba(148,163,184,0.6)'};
`

// ── Platform breakdown inline ──────────────────────────────────────
function PlatformBreakdown({ stats }: { stats: PlatformStat[] }) {
  const total = stats.reduce((s, r) => s + r.count, 0)
  if (total === 0) return <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.3)' }}>No data</span>
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
      {stats.map(s => {
        const cfg = getPConfig(s.platform)
        return (
          <PlatformBadge key={s.platform} $color={cfg.color}>
            {cfg.icon} {cfg.label} {s.count}
          </PlatformBadge>
        )
      })}
    </div>
  )
}

// ── Bar Chart (platform + models) ──────────────────────────────────

// Extended bar chart that supports expandable device model lists per platform
function PlatformBarChartWithModels({ data, models }: { data: PlatformStat[]; models: { platform: string; device_model: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const modelsMap: Record<string, { device_model: string; count: number }[]> = {}
  for (const m of models) {
    if (!modelsMap[m.platform]) modelsMap[m.platform] = []
    modelsMap[m.platform].push({ device_model: m.device_model || 'Unknown', count: m.count })
  }

  return (
    <BarWrap>
      {data.map(d => {
        const cfg = getPConfig(d.platform)
        const pct = `${Math.round((d.count / max) * 100)}%`
        const platformModels = (modelsMap[d.platform] || []).sort((a, b) => b.count - a.count)
        return (
          <div key={d.platform} style={{ marginBottom: 8 }}>
            <BarRow>
              <BarLabel><span>{cfg.icon}</span> {cfg.label}</BarLabel>
              <BarTrack><BarFill $pct={pct} $grad={cfg.gradient} /></BarTrack>
              <BarCount style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {d.count.toLocaleString()}
                {platformModels.length > 0 && (
                  <button onClick={() => setExpanded(e => ({ ...e, [d.platform]: !e[d.platform] }))} style={{ background: 'transparent', border: 'none', color: 'rgba(148,163,184,0.6)', cursor: 'pointer' }}>{expanded[d.platform] ? '▾' : '▸'}</button>
                )}
              </BarCount>
            </BarRow>
            {expanded[d.platform] && platformModels.length > 0 && (
              <div style={{ marginTop: 8, marginLeft: 100, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {platformModels.map(m => (
                  <PlatformBadge key={m.device_model} $color={cfg.color}>{m.device_model} {m.count}</PlatformBadge>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </BarWrap>
  )
}

// ── Main Component ─────────────────────────────────────────────────
export default function AdminDashboard() {
  const [stats, setStats] = useState({ games: 0, categories: 0, totalViews: 0 })
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [sitePlatformStats, setSitePlatformStats] = useState<PlatformStat[]>([])
  const [sitePlatformModelStats, setSitePlatformModelStats] = useState<{ platform: string; device_model: string; count: number }[]>([])
  const [totalVisits, setTotalVisits] = useState(0)
  const [topGames, setTopGames] = useState<{ id: string; title: string; cover_image: string | null; view_count: number; platforms: PlatformStat[] }[]>([])
  const [allGamePlatformStats, setAllGamePlatformStats] = useState<{ game_id: string; platform: string; view_count: number }[]>([])
  const [allGamePlatformModelStats, setAllGamePlatformModelStats] = useState<{ game_id: string; platform: string; device_model: string; view_count: number }[]>([])

  useEffect(() => {
    const load = async () => {
      // Basic stats + recent games
      const [{ count: gc }, { count: cc }, { data: games }, { data: allViews }] = await Promise.all([
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('categories').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('id,title,cover_image,view_count,created_at').order('created_at', { ascending: false }).limit(8),
        supabase.from('games').select('view_count')
      ])
      const totalViews = (allViews || []).reduce((s: number, g: any) => s + (g.view_count || 0), 0)
      setStats({ games: gc || 0, categories: cc || 0, totalViews })
      setRecentGames(games || [])

      // Analytics: site visits + platform
      const [siteStats, siteModelStats, visits] = await Promise.all([
        getSitePlatformStats(),
      getSitePlatformModelStats(),
        getTotalSiteVisits(),
      ])
      setSitePlatformStats(siteStats)
      setSitePlatformModelStats(siteModelStats)
      setTotalVisits(visits)

      // Top games with platform breakdown
      const { data: topRaw } = await supabase
        .from('games')
        .select('id,title,cover_image,view_count')
        .order('view_count', { ascending: false })
        .limit(5)

      const allPlatformData = await getAllGamesPlatformStats()
      const allPlatformModelData = await getAllGamesPlatformModelStats()
      
      setAllGamePlatformStats(allPlatformData)
      setAllGamePlatformModelStats(allPlatformModelData)

      if (topRaw && topRaw.length > 0) {
        const platformMap: Record<string, PlatformStat[]> = {}
        for (const row of allPlatformData) {
          if (!platformMap[row.game_id]) platformMap[row.game_id] = []
          platformMap[row.game_id].push({ platform: row.platform, count: row.view_count })
        }
        
        setTopGames(topRaw.map((g: any) => ({
          ...g,
          platforms: (platformMap[g.id] || []).sort((a, b) => b.count - a.count),
        })))
      }
    }
    load()
  }, [])

  return (
    <div>
      <h1 style={{ fontFamily: 'Noto Sans Lao', fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
        <TrendingUp size={24} style={{ color: '#7c3aed' }} /> Dashboard
      </h1>

      {/* ── Summary Stats ── */}
      <Grid>
        <StatCard $color="#7c3aed">
          <StatIconBox $color="#7c3aed"><Gamepad2 size={22} /></StatIconBox>
          <StatNum>{stats.games}</StatNum>
          <StatLabel>Total Games</StatLabel>
        </StatCard>
        <StatCard $color="#06b6d4">
          <StatIconBox $color="#06b6d4"><Tags size={22} /></StatIconBox>
          <StatNum>{stats.categories}</StatNum>
          <StatLabel>Categories</StatLabel>
        </StatCard>
        <StatCard $color="#22c55e">
          <StatIconBox $color="#22c55e"><Eye size={22} /></StatIconBox>
          <StatNum>{stats.totalViews.toLocaleString()}</StatNum>
          <StatLabel>Game Page Views</StatLabel>
        </StatCard>
        <StatCard $color="#f59e0b">
          <StatIconBox $color="#f59e0b"><Globe size={22} /></StatIconBox>
          <StatNum>{totalVisits.toLocaleString()}</StatNum>
          <StatLabel>Site Visits</StatLabel>
        </StatCard>
      </Grid>

      {/* ── Analytics: Platform charts ── */}
      <AnalyticsGrid>
        {/* Site Traffic by Platform */}
        <Section style={{ margin: 0 }}>
          <SectionHeader>
            <SectionTitle><Globe size={16} style={{ color: '#f59e0b' }} /> Site Traffic by Platform</SectionTitle>
          </SectionHeader>
          <PlatformBarChartWithModels
            data={sitePlatformStats}
            models={sitePlatformModelStats}
          />
        </Section>

        {/* Game Views by Platform */}
        <Section style={{ margin: 0 }}>
          <SectionHeader>
            <SectionTitle><BarChart2 size={16} style={{ color: '#06b6d4' }} /> Game Views by Platform</SectionTitle>
          </SectionHeader>
          {(() => {
            // Aggregate game_view_platforms across all games
            const agg: Record<string, number> = {}
            allGamePlatformStats.forEach(r => { agg[r.platform] = (agg[r.platform] || 0) + (r.view_count || 0) })
            const data: PlatformStat[] = Object.entries(agg).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count)

            // Build aggregated models across all games per platform from allGamePlatformModelStats
            const modelsAgg: { platform: string; device_model: string; count: number }[] = []
            const tmp: Record<string, number> = {}
            for (const r of allGamePlatformModelStats) {
              const key = `${r.platform}||${r.device_model}`
              tmp[key] = (tmp[key] || 0) + (r.view_count || 0)
            }
            for (const [k, count] of Object.entries(tmp)) {
              const [platform, device_model] = k.split('||')
              modelsAgg.push({ platform, device_model, count })
            }

            return <PlatformBarChartWithModels data={data} models={modelsAgg} />
          })()}
        </Section>
      </AnalyticsGrid>

      {/* ── Top Games Table ── */}
      {topGames.length > 0 && (
        <Section>
          <SectionHeader>
            <SectionTitle><Activity size={16} style={{ color: '#22c55e' }} /> Top Games — Platform Breakdown</SectionTitle>
          </SectionHeader>
          <div style={{ overflowX: 'auto' }}>
            <Table>
              <thead>
                <tr>
                  <Th style={{ width: 40 }}>#</Th>
                  <Th>Game</Th>
                  <Th style={{ width: 80, textAlign: 'right' }}>Total Views</Th>
                  <Th>Platform Breakdown</Th>
                </tr>
              </thead>
              <tbody>
                {topGames.map((g, i) => (
                  <tr key={g.id}>
                    <Td><Rank $rank={i + 1}>{i + 1}</Rank></Td>
                    <Td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {g.cover_image
                          ? <img src={g.cover_image} alt={g.title} style={{ width: 44, height: 30, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                          : <div style={{ width: 44, height: 30, background: 'rgba(124,58,237,0.1)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🎮</div>
                        }
                        <span style={{ fontWeight: 600 }}>{g.title}</span>
                      </div>
                    </Td>
                    <Td style={{ textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                      {(g.view_count || 0).toLocaleString()}
                    </Td>
                    <Td><PlatformBreakdown stats={g.platforms} /></Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </Section>
      )}

      {/* ── Recent Games ── */}
      <Section>
        <SectionHeader>
          <SectionTitle><Gamepad2 size={16} /> Recent Games</SectionTitle>
          <AddBtn to="/ap-admin/games/add"><Plus size={14} /> Add Game</AddBtn>
        </SectionHeader>
        {recentGames.map(g => (
          <GameRow key={g.id}>
            {g.cover_image ? <GameThumb src={g.cover_image} alt={g.title} /> : <GameThumbPlaceholder>🎮</GameThumbPlaceholder>}
            <GameTitle>{g.title}</GameTitle>
            <ViewCount><Eye size={11} /> {g.view_count || 0}</ViewCount>
          </GameRow>
        ))}
        {recentGames.length === 0 && <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.4)' }}>No games yet. Add your first game!</p>}
      </Section>
    </div>
  )
}
