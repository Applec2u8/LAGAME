import { useState, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Search, RefreshCw, Trophy, AlertTriangle, CalendarClock, Zap, Check, X, ExternalLink } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card,
  SecondaryBtn,
  Alert
} from '../adminStyles'

const fadeIn = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`

const BtnRow = styled.div`display: flex; gap: 10px; flex-wrap: wrap;`

const FetchBtn = styled.button`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 24px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  color: #fff; font-weight: 600; font-size: 14px;
  cursor: pointer; transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(124,58,237,0.3);
  &:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(124,58,237,0.4); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`

const SmallBtn = styled.button<{ $variant?: 'success' | 'danger' | 'warning' }>`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px; border-radius: 10px; font-weight: 600; font-size: 13px;
  cursor: pointer; transition: all 0.2s;
  ${p => p.$variant === 'success' && css`
    border: 1px solid rgba(34,197,94,0.35); background: rgba(34,197,94,0.1); color: #4ade80;
    &:hover { background: rgba(34,197,94,0.18); }
  `}
  ${p => p.$variant === 'danger' && css`
    border: 1px solid rgba(239,68,68,0.3); background: rgba(239,68,68,0.08); color: #f87171;
    &:hover { background: rgba(239,68,68,0.15); }
  `}
  ${p => p.$variant === 'warning' && css`
    border: 1px solid rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); color: #f59e0b;
    &:hover { background: rgba(245,158,11,0.15); }
  `}
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`



const PreviewCard = styled(Card)`
  border-color: rgba(6,182,212,0.3);
  animation: ${fadeIn} 0.3s ease;
`

const PreviewGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`

const PreviewCol = styled.div`display: flex; flex-direction: column; gap: 8px;`
const ColTitle = styled.div`font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: rgba(148,163,184,0.5); margin-bottom: 4px;`

const SteamRow = styled.div`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 8px; font-size: 13px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  color: rgba(148,163,184,0.8);
`

const MatchedRow = styled.div<{ $matched: boolean }>`
  display: flex; align-items: center; gap: 10px;
  padding: 8px 12px; border-radius: 8px; font-size: 13px;
  background: ${p => p.$matched ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.06)'};
  border: 1px solid ${p => p.$matched ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.12)'};
  color: ${p => p.$matched ? '#4ade80' : 'rgba(148,163,184,0.4)'};
`

const RankNum = styled.span`
  width: 22px; height: 22px; border-radius: 6px; flex-shrink: 0;
  background: rgba(124,58,237,0.2); color: #c4b5fd;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 800;
`

const List = styled.div`display: flex; flex-direction: column; gap: 12px;`

const GameItem = styled.div`
  display: flex; align-items: center; gap: 16px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px; padding: 12px 20px;
`

const RankBadge = styled.div<{ $rank: number }>`
  width: 36px; height: 36px; border-radius: 8px; flex-shrink: 0;
  background: ${p => p.$rank === 1 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : p.$rank === 2 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : p.$rank === 3 ? 'linear-gradient(135deg,#d97706,#92400e)' : 'rgba(124,58,237,0.2)'};
  color: ${p => p.$rank <= 3 ? '#fff' : '#c4b5fd'};
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 16px;
`

const InfoCard = styled(Card)`
  display: flex; gap: 20px; align-items: center;
  @media (max-width: 600px) { flex-direction: column; align-items: flex-start; }
`

interface PreviewData {
  steamNames: string[]
  matched: { id: string; title: string; rank: number; steamName: string }[]
}

export default function AdminTopRanking() {
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fetching, setFetching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<PreviewData | null>(null)

  const loadData = async () => {
    setLoading(true)
    const { data: topGames } = await supabase
      .from('games')
      .select('id, title, view_count, ai_rank')
      .not('ai_rank', 'is', null)
      .order('ai_rank', { ascending: true })
    if (topGames) setGames(topGames)

    const { data: settings } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'ai_ranking')
      .single()
    if (settings) setLastRun((settings as any).value?.last_run || null)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const clearAllCooldowns = async () => {
    if (!confirm('ต้องการล้าง Cooldown ของ API Keys ทั้งหมดใช่หรือไม่?')) return
    setClearing(true)
    setError('')
    try {
      await (supabase as any).from('gemini_api_keys').update({ cooldown_until: null }).not('cooldown_until', 'is', null)
      alert('ล้าง Cooldown เรียบร้อยแล้วครับ!')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setClearing(false)
    }
  }

  const fetchPreview = async () => {
    setFetching(true)
    setError('')
    setPreview(null)
    try {
      let steamNames: string[] = []

      if (import.meta.env.DEV) {
        // Dev: use Vite proxy to bypass CORS (see vite.config.ts server.proxy)
        const res = await fetch('/steamspy/api.php?request=top100in2weeks')
        if (!res.ok) throw new Error('ไม่สามารถเชื่อมต่อ SteamSpy ได้')
        const data = await res.json()
        steamNames = Object.values(data as any)
          .sort((a: any, b: any) => (b.players_2weeks || 0) - (a.players_2weeks || 0))
          .slice(0, 25)
          .map((g: any) => g.name)
      } else {
        // Prod: Cloudflare Function fetches server-side
        const res = await fetch('/api/ai-rank?mode=preview')
        if (!res.ok) throw new Error('Server error fetching Steam data')
        const data = await res.json()
        steamNames = data.games || []
      }

      // Fetch all DB game titles for matching
      const { data: allGames } = await supabase.from('games').select('id, title')
      const allGamesList = (allGames as any[]) || []

      // Fuzzy-match Steam names → DB games
      const matched: PreviewData['matched'] = []
      for (let i = 0; i < steamNames.length && matched.length < 10; i++) {
        const sn = steamNames[i].toLowerCase()
        const found = allGamesList.find((g: any) =>
          g.title.toLowerCase() === sn ||
          g.title.toLowerCase().includes(sn) ||
          sn.includes(g.title.toLowerCase())
        )
        if (found && !matched.find(m => m.id === found.id)) {
          matched.push({ id: found.id, title: found.title, rank: matched.length + 1, steamName: steamNames[i] })
        }
      }

      setPreview({ steamNames, matched })
    } catch (err: any) {
      setError('ไม่สามารถดึงข้อมูลได้: ' + err.message)
    } finally {
      setFetching(false)
    }
  }

  const applyRanking = async () => {
    if (!preview || preview.matched.length === 0) return
    if (!confirm(`ยืนยันบันทึก ${preview.matched.length} อันดับลงฐานข้อมูล?`)) return
    setSaving(true)
    setError('')
    try {
      await (supabase as any).from('games').update({ ai_rank: null }).not('ai_rank', 'is', null)
      for (const m of preview.matched) {
        await (supabase as any).from('games').update({ ai_rank: m.rank }).eq('id', m.id)
      }
      const { data: currentSettings } = await supabase.from('system_settings').select('value').eq('key', 'ai_ranking').single()
      const newVal = (currentSettings as any)?.value || { schedule: 'manual' }
      newVal.last_run = new Date().toISOString()
      newVal.matched_count = preview.matched.length
      await (supabase as any).from('system_settings').update({ value: newVal }).eq('key', 'ai_ranking')
      setPreview(null)
      await loadData()
      alert('บันทึกอันดับเรียบร้อยแล้ว! 🎉')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminPage>
      <PageHeader>
        <div>
          <PageTitle>
            <Trophy size={26} style={{ color: '#f59e0b' }} /> Top Ranking
          </PageTitle>
          <PageSubTitle>ดึงอันดับจาก SteamSpy → จับคู่กับเกมในระบบ → บันทึก</PageSubTitle>
        </div>
        <BtnRow>
          <SecondaryBtn onClick={clearAllCooldowns} disabled={clearing}>
            <Zap size={14} /> {clearing ? 'กำลังล้าง...' : 'ล้าง API Cooldown'}
          </SecondaryBtn>
          <FetchBtn onClick={fetchPreview} disabled={fetching || saving}>
            {fetching ? <RefreshCw size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Search size={16} />}
            {fetching ? 'กำลังค้นหา...' : 'ค้นหาอันดับจาก Steam'}
          </FetchBtn>
        </BtnRow>
      </PageHeader>

      {error && (
        <Alert $type="error">
          <AlertTriangle size={16} /> {error}
        </Alert>
      )}

      {/* Preview section */}
      {preview && (
        <PreviewCard>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: 16, marginBottom: 4 }}>
                📊 ผลลัพธ์จาก SteamSpy — พบในระบบ {preview.matched.length}/10 เกม
              </div>
              <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>
                ตรวจสอบรายการด้านล่าง แล้วกด "ยืนยันและบันทึก" หรือ "ค้นหาใหม่"
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <SmallBtn $variant="danger" onClick={() => setPreview(null)} disabled={saving}>
                <X size={14} /> ยกเลิก
              </SmallBtn>
              <SmallBtn $variant="success" onClick={applyRanking} disabled={saving || preview.matched.length === 0}>
                {saving ? <RefreshCw size={14} /> : <Check size={14} />}
                {saving ? 'กำลังบันทึก...' : `ยืนยันและบันทึก (${preview.matched.length} เกม)`}
              </SmallBtn>
            </div>
          </div>

          <PreviewGrid>
            <PreviewCol>
              <ColTitle>🎮 อันดับจาก SteamSpy (Top {preview.steamNames.length})</ColTitle>
              {preview.steamNames.slice(0, 15).map((name, i) => (
                <SteamRow key={i}>
                  <RankNum>{i + 1}</RankNum>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                </SteamRow>
              ))}
            </PreviewCol>

            <PreviewCol>
              <ColTitle>✅ ที่พบในฐานข้อมูลของเรา</ColTitle>
              {preview.steamNames.slice(0, 15).map((name, i) => {
                const match = preview.matched.find(m => m.steamName === name)
                return (
                  <MatchedRow key={i} $matched={!!match}>
                    <RankNum>{i + 1}</RankNum>
                    {match ? (
                      <>
                        <Check size={13} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>#{match.rank} {match.title}</span>
                      </>
                    ) : (
                      <span style={{ opacity: 0.5 }}>ไม่มีในระบบ</span>
                    )}
                  </MatchedRow>
                )
              })}
            </PreviewCol>
          </PreviewGrid>

          {preview.matched.length < 5 && (
            <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 13, color: '#fcd34d' }}>
              ⚠️ พบเกมตรงกันน้อยมาก ({preview.matched.length} เกม) เพราะระบบของคุณยังมีเกมไม่ครบ หรือชื่อต่างกับ Steam ลองเพิ่มเกมยอดนิยมเหล่านั้นเข้าระบบก่อนครับ
            </div>
          )}
        </PreviewCard>
      )}

      <InfoCard>
        <CalendarClock size={40} color="rgba(148,163,184,0.4)" />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: 4 }}>สถานะระบบ</div>
          <div style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', lineHeight: 1.6 }}>
            แหล่งข้อมูล: <a href="https://steamspy.com" target="_blank" rel="noopener noreferrer" style={{ color: '#06b6d4' }}>SteamSpy <ExternalLink size={10} /></a> (ไม่ต้องใช้ API Key หรือ Gemini)<br/>
            อัปเดตล่าสุด: {lastRun ? new Date(lastRun).toLocaleString('th-TH') : 'ยังไม่เคยรัน'}
          </div>
        </div>
      </InfoCard>

      <Card>
        <h3 style={{ margin: '0 0 20px 0', fontSize: 18, fontWeight: 700 }}>🏆 10 อันดับปัจจุบันในระบบ</h3>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(148,163,184,0.5)' }}>กำลังโหลด...</div>
        ) : games.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(148,163,184,0.4)', background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
            ยังไม่มีการจัดอันดับ กรุณากดปุ่ม "ค้นหาอันดับจาก Steam"
          </div>
        ) : (
          <List>
            {games.map((g) => (
              <GameItem key={g.id}>
                <RankBadge $rank={g.ai_rank}>{g.ai_rank}</RankBadge>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: '#fff', marginBottom: 4 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>ยอดเข้าชม {g.view_count?.toLocaleString() || 0} ครั้ง</div>
                </div>
              </GameItem>
            ))}
          </List>
        )}
      </Card>
      </AdminPage>
  )
}
