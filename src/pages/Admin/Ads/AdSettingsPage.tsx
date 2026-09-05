import { useState, useEffect } from 'react'
import styled, { keyframes } from 'styled-components'
import { Save, Loader2, CheckCircle, AlertCircle, Megaphone, Clock, Plus, Trash2, Code2, LayoutTemplate } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { AdFormat, AdScriptItem } from '../../../lib/supabase'
import { useAdSettings } from '../../../context/AdSettingsContext'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card, CardHeader, CardTitle,
  TwoCol, Field, Label, TextArea, Select, Hint,
  PrimaryBtn,
  Alert, Badge, Divider,
  ToggleRow, ToggleLabel, ToggleHint, TogglePill
} from '../adminStyles'

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`

const StepItem = styled.div`
  display: flex; align-items: flex-start; gap: 14px;
  padding: 14px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  &:last-child { border-bottom: none; }
`
const StepNum = styled.div`
  width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(124,58,237,0.3), rgba(6,182,212,0.2));
  border: 1px solid rgba(124,58,237,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #a78bfa;
`

const RangeWrap = styled.div`
  input[type="range"] {
    -webkit-appearance: none; width: 100%; height: 6px;
    background: rgba(255,255,255,0.08); border-radius: 3px; outline: none;
    accent-color: #7c3aed; cursor: pointer;
    &::-webkit-slider-thumb {
      -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #06b6d4);
      cursor: pointer; box-shadow: 0 2px 6px rgba(124,58,237,0.5);
    }
  }
`

const AdItemCard = styled.div`
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeIn} 0.3s ease;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(124,58,237,0.3);
  }
`

const AdItemHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 12px;
  border-bottom: 1px dashed rgba(255,255,255,0.1);
`

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const InputLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #a78bfa;
`

const RemoveBtn = styled.button`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 10px;
  color: #fca5a5;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s ease;
  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #f87171;
  }
`

const AddBtn = styled.button`
  background: linear-gradient(135deg, rgba(124,58,237,0.8), rgba(6,182,212,0.8));
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  color: #fff;
  padding: 14px 20px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  transition: all 0.2s ease;
  &:hover {
    background: linear-gradient(135deg, rgba(124,58,237,1), rgba(6,182,212,1));
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(124,58,237,0.3);
  }
  &:active {
    transform: translateY(1px);
  }
`

export default function AdSettingsPage() {
  const AD_FORMATS: AdFormat[] = ['Popunder', 'Smartlink', 'Native Banner', 'Social Bar', 'Banner']
  const FORMAT_COLOR: Record<AdFormat, string> = {
    Popunder: '#ef4444',
    'Social Bar': '#3b82f6',
    Smartlink: '#8b5cf6',
    'Native Banner': '#f59e0b',
    Banner: '#10b981',
  }

  const { adSettings, refresh } = useAdSettings()
  const [scriptItems, setScriptItems] = useState<AdScriptItem[]>([])
  const [countdown, setCountdown] = useState(10)
  const [isActive, setIsActive] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const normalizeAdScriptItem = (item: any): AdScriptItem => {
    if (!item) return { code: '', format: 'Banner' }
    if (typeof item === 'string') return { code: item, format: 'Banner' }

    const code = String(item.code || item.script || item.url || '').trim()
    const candidate = String(item.format || 'Banner') as AdFormat
    const format: AdFormat = AD_FORMATS.includes(candidate) ? candidate : 'Banner'
    return { code, format }
  }

  const buildScriptItems = (raw: any, legacyUrl?: string | null): AdScriptItem[] => {
    if (Array.isArray(raw)) {
      return raw.map(normalizeAdScriptItem).filter((item): item is AdScriptItem => Boolean(item.code || item.format))
    }
    if (legacyUrl) {
      return [{ code: legacyUrl, format: 'Banner' }]
    }
    return []
  }

  useEffect(() => {
    if (adSettings) {
      setScriptItems(buildScriptItems((adSettings as any).ad_scripts, adSettings.ad_url || null))
      setCountdown(adSettings.countdown_seconds || 10)
      setIsActive(adSettings.is_active)
    }
  }, [adSettings])

  const handleSave = async () => {
    setSaving(true); setMsg(null)
    const id = adSettings?.id
    const payload = {
      ad_url: scriptItems[0]?.code || '',
      ad_scripts: scriptItems.map(item => ({ code: item.code, format: item.format })),
      countdown_seconds: countdown,
      is_active: isActive,
      updated_at: new Date().toISOString(),
    }
    let error
    if (id) {
      const res = await (supabase.from('ad_settings') as any).update(payload).eq('id', id)
      error = res.error
    } else {
      const res = await (supabase.from('ad_settings') as any).insert(payload)
      error = res.error
    }
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: 'Ad settings saved successfully!' }); refresh() }
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const addNewScript = () => {
    setScriptItems(prev => [...prev, { code: '', format: 'Popunder' }])
  }

  const updateScriptItem = (index: number, key: keyof AdScriptItem, value: any) => {
    setScriptItems(prev => prev.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }

  const removeScriptItem = (index: number) => {
    setScriptItems(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <AdminPage $maxWidth="800px">
      <PageHeader>
        <div>
          <PageTitle>
            <Megaphone size={26} style={{ color: '#f59e0b' }} />
            Ad Settings
          </PageTitle>
          <PageSubTitle>Configure multiple interstitial ads shown before download links.</PageSubTitle>
        </div>
        <PrimaryBtn onClick={handleSave} disabled={saving}>
          {saving
            ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
            : <><Save size={15} /> Save Settings</>
          }
        </PrimaryBtn>
      </PageHeader>

      {msg && (
        <Alert $type={msg.type}>
          {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </Alert>
      )}

      <TwoCol>
        {/* Config Card */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardHeader>
            <CardTitle><Megaphone size={16} style={{ color: '#f59e0b' }} /> Ad Configuration</CardTitle>
          </CardHeader>

          <ToggleRow>
            <div>
              <ToggleLabel>Ad Status</ToggleLabel>
              <ToggleHint>
                {isActive ? '✅ Enabled — Users see the ad before downloading' : '❌ Disabled — Users go directly to download'}
              </ToggleHint>
            </div>
            <TogglePill $on={isActive} onClick={() => setIsActive(v => !v)} />
          </ToggleRow>

          <Divider />

          <Field>
            <Label>Manage Ad Scripts</Label>
            <Hint style={{ marginBottom: 16 }}>
              Separate your ads clearly. For each ad, select its format and paste the provided script code.
            </Hint>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {scriptItems.map((item, idx) => (
                <AdItemCard key={idx}>
                  <AdItemHeader>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>Ad Script #{idx + 1}</div>
                      <Badge $color={FORMAT_COLOR[item.format]}>{item.format}</Badge>
                    </div>
                    <RemoveBtn type="button" onClick={() => removeScriptItem(idx)}>
                      <Trash2 size={14} /> Remove
                    </RemoveBtn>
                  </AdItemHeader>

                  <InputGroup>
                    <InputLabel><LayoutTemplate size={14} /> Ad Format</InputLabel>
                    <Select
                      value={item.format}
                      onChange={(e: any) => updateScriptItem(idx, 'format', e.target.value)}
                      style={{ background: 'rgba(0,0,0,0.2)' }}
                    >
                      {AD_FORMATS.map(format => (
                        <option key={format} value={format}>{format}</option>
                      ))}
                    </Select>
                  </InputGroup>

                  <InputGroup>
                    <InputLabel><Code2 size={14} /> Script Code / Zone ID</InputLabel>
                    <TextArea
                      placeholder="<script src='...'></script>"
                      value={item.code}
                      onChange={(e: any) => updateScriptItem(idx, 'code', e.target.value)}
                      style={{ minHeight: 90, maxHeight: 180, resize: 'vertical', background: 'rgba(0,0,0,0.2)', fontFamily: 'monospace', fontSize: 13 }}
                    />
                  </InputGroup>
                </AdItemCard>
              ))}

              <AddBtn type="button" onClick={addNewScript}>
                <Plus size={18} /> Add New Ad Script
              </AddBtn>
            </div>
          </Field>

          <Divider />

          <Field>
            <Label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={14} style={{ color: '#7c3aed' }} />
              Countdown Duration
              <span style={{ marginLeft: 'auto', fontFamily: 'Noto Sans Lao', fontSize: 20, fontWeight: 800, color: '#a78bfa' }}>
                {countdown}s
              </span>
            </Label>
            <RangeWrap>
              <input
                type="range" min={3} max={30} value={countdown}
                onChange={e => setCountdown(Number(e.target.value))}
              />
            </RangeWrap>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <Hint>3s (fast)</Hint>
              <Hint>30s (long)</Hint>
            </div>
          </Field>
        </Card>

        {/* How it works */}
        <Card style={{ gridColumn: '1 / -1' }}>
          <CardHeader>
            <CardTitle>ℹ️ How the Download Flow Works</CardTitle>
          </CardHeader>
          {[
            ['1', 'User clicks a Cloud download button on a game page'],
            ['2', 'System checks if ads are enabled (Ad Status toggle above)'],
            ['3', `If ENABLED: User sees an interstitial ad with ${countdown}s countdown`],
            ['4', 'The system will load and render ALL active ad scripts above simultaneously'],
            ['5', '"Proceed to Download" button appears after countdown ends'],
            ['6', 'User clicks Proceed → download link opens in new tab'],
          ].map(([num, text]) => (
            <StepItem key={num}>
              <StepNum>{num}</StepNum>
              <p style={{ fontSize: 14, color: 'rgba(148,163,184,0.7)', lineHeight: 1.7, margin: 0 }}>{text}</p>
            </StepItem>
          ))}
        </Card>
      </TwoCol>
    </AdminPage>
  )
}
