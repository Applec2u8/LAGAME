import { useState, useEffect, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import {
  Bot, Save, Loader2, CheckCircle, AlertCircle, Type, Mic, Image as ImageIcon,
  Send, Trash2, Settings, MessageSquare, Activity, Zap, Users,
  RefreshCw, Lock, Globe
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { sendChatMessage } from '../../../lib/chatService'
import type { ChatMessage } from '../../../lib/chatService'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card, CardHeader, CardTitle,
  PrimaryBtn, SecondaryBtn, Alert, Divider,
  ToggleRow, ToggleLabel, ToggleHint, TogglePill,
  Badge
} from '../adminStyles'

// ── Animations ───────────────────────────────────────────────────────
const fadeUp = keyframes`from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); }`
const typing = keyframes`0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-5px);opacity:1}`
const spin = keyframes`to{transform:rotate(360deg)}`
const pulse = keyframes`0%,100%{opacity:1}50%{opacity:.4}`

// ── Layout ────────────────────────────────────────────────────────────
const PageGrid = styled.div`
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 24px;
  align-items: start;
  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`

const LeftPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 24px;
`

// ── Chat Preview Window ───────────────────────────────────────────────
const ChatWindow = styled.div`
  background: rgba(8, 8, 20, 0.97);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  height: 600px;
  animation: ${fadeUp} 0.4s ease both;
`

const ChatHeader = styled.div`
  padding: 14px 16px;
  background: linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(6,182,212,0.15) 100%);
  border-bottom: 1px solid rgba(124,58,237,0.2);
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`

const ChatAvatar = styled.div`
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 18px;
  box-shadow: 0 4px 12px rgba(124,58,237,0.4);
`

const ChatHeaderInfo = styled.div`flex: 1; min-width: 0;`
const ChatName = styled.div`font-size: 14px; font-weight: 700; color: #fff; font-family: 'Noto Sans Lao', sans-serif;`
const ChatStatus = styled.div`
  font-size: 11px; color: rgba(148,163,184,0.7); margin-top: 1px;
  display: flex; align-items: center; gap: 5px;
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: #22c55e; box-shadow: 0 0 6px #22c55e; flex-shrink: 0;
    animation: ${pulse} 2s ease-in-out infinite;
  }
`

const ChatHeaderBtns = styled.div`display: flex; gap: 6px;`
const ChatHdrBtn = styled.button`
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: rgba(255,255,255,0.07); color: rgba(148,163,184,0.7);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.14); color: #fff; }
`

const ChatTabs = styled.div`
  display: flex;
  border-bottom: 1px solid rgba(124,58,237,0.12);
  flex-shrink: 0;
`
const ChatTab = styled.button<{ $active: boolean }>`
  flex: 1; padding: 9px; font-size: 11.5px; font-weight: 700; border: none; cursor: pointer;
  background: ${p => p.$active ? 'rgba(124,58,237,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.5)'};
  border-bottom: 2px solid ${p => p.$active ? '#7c3aed' : 'transparent'};
  transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 5px;
  &:hover { background: rgba(124,58,237,0.1); color: #c4b5fd; }
`

const ChatMessages = styled.div`
  flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px;
  scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 2px; }
`

const MsgWrap = styled.div<{ $isUser: boolean }>`
  display: flex; align-items: flex-end; gap: 6px; max-width: 88%;
  align-self: ${p => p.$isUser ? 'flex-end' : 'flex-start'};
  flex-direction: ${p => p.$isUser ? 'row-reverse' : 'row'};
  animation: ${fadeUp} 0.2s ease;
`

const MiniAvatar = styled.div`
  width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex; align-items: center; justify-content: center; font-size: 12px;
`

const Bubble = styled.div<{ $role: 'user' | 'assistant' | 'system' | 'error' }>`
  padding: 9px 13px; font-size: 13px; line-height: 1.6; border-radius: 14px;
  white-space: pre-wrap; word-break: break-word;
  ${p => p.$role === 'user' && css`
    background: linear-gradient(135deg,#7c3aed,#9d5cf5); color:#fff;
    border-radius: 14px 14px 4px 14px;
    box-shadow: 0 4px 16px rgba(124,58,237,0.3);
  `}
  ${p => p.$role === 'assistant' && css`
    background: rgba(255,255,255,0.06); border: 1px solid rgba(124,58,237,0.15);
    color: #e2e8f0; border-radius: 14px 14px 14px 4px;
  `}
  ${p => p.$role === 'system' && css`
    background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2);
    color: #fcd34d; font-size: 11.5px; border-radius: 8px; align-self: center; text-align: center;
  `}
  ${p => p.$role === 'error' && css`
    background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
    color: #fca5a5; border-radius: 8px;
  `}
`

const TypingBubble = styled.div`
  padding: 10px 14px; background: rgba(255,255,255,0.06);
  border: 1px solid rgba(124,58,237,0.15); border-radius: 14px 14px 14px 4px;
  display: flex; align-items: center; gap: 4px; align-self: flex-start;
`
const Dot = styled.span<{ $delay: number }>`
  width: 6px; height: 6px; border-radius: 50%; background: rgba(148,163,184,0.6);
  animation: ${typing} 1.2s ease-in-out infinite; animation-delay: ${p => p.$delay}ms;
`

// ── Chat Input ─────────────────────────────────────────────────────────
const ChatInputArea = styled.div`
  padding: 10px 12px;
  border-top: 1px solid rgba(124,58,237,0.12);
  flex-shrink: 0;
`

const ChatInputRow = styled.div`display: flex; gap: 8px; align-items: flex-end;`

const ChatTextarea = styled.textarea`
  flex: 1; background: rgba(255,255,255,0.05);
  border: 1px solid rgba(124,58,237,0.2); border-radius: 10px;
  color: #e2e8f0; font-size: 13px; padding: 9px 12px;
  font-family: 'Noto Sans Lao', sans-serif;
  resize: none; outline: none; max-height: 120px; min-height: 38px;
  transition: border-color 0.2s; line-height: 1.5;
  &::placeholder { color: rgba(148,163,184,0.4); }
  &:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.08); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

const SendButton = styled.button<{ $loading?: boolean }>`
  width: 38px; height: 38px; border-radius: 10px; border: none;
  background: ${p => p.$loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #06b6d4)'};
  color: #fff; cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s; flex-shrink: 0;
  &:hover:not(:disabled) { transform: scale(1.05); }
`

const SpinIcon = styled.div`
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: ${spin} 0.7s linear infinite;
`

const ChatFooter = styled.div`
  text-align: center; font-size: 10.5px; color: rgba(148,163,184,0.3);
  padding: 6px 0 2px;
`

// ── Settings Card Extras ──────────────────────────────────────────────
const StatGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
`
const StatCard = styled.div`
  background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 12px; padding: 14px;
  display: flex; flex-direction: column; gap: 4px;
`
const StatValue = styled.div`font-size: 22px; font-weight: 800; color: #fff;`
const StatLabel = styled.div`font-size: 11px; color: rgba(148,163,184,0.5); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;`

const QuotaBar = styled.div<{ $pct: number }>`
  height: 6px; border-radius: 3px; background: rgba(255,255,255,0.06);
  position: relative; margin-top: 8px; overflow: hidden;
  &::after {
    content: '';
    position: absolute; left: 0; top: 0; bottom: 0;
    width: ${p => Math.min(p.$pct, 100)}%;
    border-radius: 3px;
    background: ${p => p.$pct > 80 ? '#ef4444' : p.$pct > 50 ? '#f59e0b' : 'linear-gradient(90deg,#7c3aed,#06b6d4)'};
    transition: width 0.6s ease;
  }
`

const SystemPromptArea = styled.textarea`
  width: 100%; background: rgba(10,10,20,0.6);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 12px;
  color: #e2e8f0; font-size: 12.5px; padding: 12px 14px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  resize: vertical; outline: none; min-height: 120px; line-height: 1.6;
  transition: border-color 0.2s;
  &::placeholder { color: rgba(148,163,184,0.3); }
  &:focus { border-color: rgba(124,58,237,0.6); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
  box-sizing: border-box;
`

const ClearBtn = styled.button`
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; padding: 7px 14px; border-radius: 9px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.25);
  color: #f87171; cursor: pointer; transition: all 0.15s;
  &:hover { background: rgba(239,68,68,0.2); }
`

const ModelTag = styled.div`
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(6,182,212,0.1); border: 1px solid rgba(6,182,212,0.25);
  border-radius: 8px; padding: 5px 10px; font-size: 12px; color: #67e8f9;
  font-family: 'JetBrains Mono', monospace;
`

// ═══════════════════════════════════════════════════════════════════════
const ADMIN_SYSTEM_PROMPT = `You are Labot 🤖, a friendly AI assistant for LA-GAME — a free PC game download platform from Laos 🇱🇦.
Be warm, helpful, and use emojis occasionally. Reply in the same language as the user.`

export default function ChatbotSettings() {
  const [settings, setSettings] = useState<{
    id: string
    enable_text: boolean
    enable_voice: boolean
    enable_image: boolean
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'settings' | 'prompt'>('settings')

  // Stats
  const [gameCount, setGameCount] = useState(0)
  const [totalViews, setTotalViews] = useState(0)
  const [activeKeys, setActiveKeys] = useState(0)
  const [totalKeys, setTotalKeys] = useState(0)

  // Chat preview
  const [chatTab, setChatTab] = useState<'ai' | 'info'>('ai')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [quotaUsed, setQuotaUsed] = useState(0) // estimated tokens used this session
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const load = async () => {
      const [
        { data: s },
        { count: gc },
        { data: gd },
        { data: keys }
      ] = await Promise.all([
        (supabase as any).from('chatbot_settings').select('*').limit(1).single(),
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('view_count'),
        (supabase as any).from('gemini_api_keys').select('id, is_active, cooldown_until')
      ])
      if (s) setSettings(s)
      setGameCount(gc || 0)
      setTotalViews((gd || []).reduce((a: number, g: any) => a + (g.view_count || 0), 0))

      const now = Date.now()
      const allKeys = keys || []
      setTotalKeys(allKeys.length)
      setActiveKeys(allKeys.filter((k: any) => {
        if (!k.is_active) return false
        if (!k.cooldown_until) return true
        return new Date(k.cooldown_until).getTime() < now
      }).length)
    }
    load()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatLoading])

  const handleToggle = (key: 'enable_text' | 'enable_voice' | 'enable_image') => {
    if (!settings) return
    setSettings(prev => prev ? { ...prev, [key]: !prev[key] } : null)
  }

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setMsg(null)
    const payload = {
      enable_text: settings.enable_text,
      enable_voice: settings.enable_voice,
      enable_image: settings.enable_image,
      updated_at: new Date().toISOString()
    }
    let error
    if (settings.id) {
      const res = await (supabase as any).from('chatbot_settings').update(payload).eq('id', settings.id)
      error = res.error
    } else {
      const res = await (supabase as any).from('chatbot_settings').insert(payload).select().single()
      error = res.error
      if (res.data) setSettings(res.data)
    }
    if (error) setMsg({ type: 'error', text: error.message })
    else setMsg({ type: 'success', text: 'Settings saved!' })
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || chatLoading) return

    const userMsg: ChatMessage = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]

    setMessages(newMessages)
    setInput('')
    setChatLoading(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    // Keep only last 5 exchanges (10 msgs) to save quota
    const historyWindow = newMessages.slice(-10)
    // Estimate tokens: ~4 chars per token
    const estimatedTokens = Math.round(text.length / 4)
    setQuotaUsed(prev => prev + estimatedTokens)

    try {
      const reply = await sendChatMessage(historyWindow, {
        gameCount,
        totalViews,
        pageTitle: 'Admin Panel - Chatbot Settings'
      })
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      setQuotaUsed(prev => prev + Math.round(reply.length / 4))
    } catch (e: any) {
      const errMsg = e.message?.includes('QUOTA_EXCEEDED')
        ? '⚠️ API quota หมดแล้ว กรุณาตรวจสอบ API Keys ใน Settings'
        : `❌ Error: ${e.message || 'Unknown error'}`
      setMessages(prev => [...prev, { role: 'assistant' as any, content: errMsg, _isError: true } as any])
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const clearChat = () => {
    setMessages([])
    setQuotaUsed(0)
  }

  const quotaPct = Math.min(Math.round(quotaUsed / 20), 100) // rough % of ~2000 token session budget

  return (
    <AdminPage $maxWidth="1200px">
      <PageHeader>
        <div>
          <PageTitle>
            <Bot size={26} style={{ color: '#06b6d4' }} />
            Chatbot Control Center
          </PageTitle>
          <PageSubTitle>Manage features, test the AI live, and monitor quota usage.</PageSubTitle>
        </div>
        <PrimaryBtn onClick={handleSave} disabled={saving || !settings}>
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

      <PageGrid>
        {/* ── LEFT PANEL ─────────────────────────────────────── */}
        <LeftPanel>
          {/* Stats */}
          <Card style={{ padding: '22px' }}>
            <CardHeader style={{ marginBottom: 16 }}>
              <CardTitle><Activity size={15} style={{ color: '#06b6d4' }} /> System Overview</CardTitle>
            </CardHeader>
            <StatGrid>
              <StatCard>
                <StatValue style={{ color: '#a78bfa' }}>{gameCount}</StatValue>
                <StatLabel>Games</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue style={{ color: '#34d399' }}>{totalViews.toLocaleString()}</StatValue>
                <StatLabel>Total Views</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue style={{ color: activeKeys > 0 ? '#22c55e' : '#ef4444' }}>{activeKeys}</StatValue>
                <StatLabel>Active Keys</StatLabel>
              </StatCard>
              <StatCard>
                <StatValue>{totalKeys}</StatValue>
                <StatLabel>Total Keys</StatLabel>
              </StatCard>
            </StatGrid>
          </Card>

          {/* Settings / Prompt tabs */}
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {(['settings', 'prompt'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    flex: 1, padding: '12px', fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                    background: activeTab === t ? 'rgba(124,58,237,0.12)' : 'transparent',
                    color: activeTab === t ? '#c4b5fd' : 'rgba(148,163,184,0.5)',
                    borderBottom: `2px solid ${activeTab === t ? '#7c3aed' : 'transparent'}`,
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    fontFamily: "'Noto Sans Lao', sans-serif"
                  }}
                >
                  {t === 'settings' ? <><Settings size={13} /> Features</> : <><MessageSquare size={13} /> Prompt</>}
                </button>
              ))}
            </div>

            {activeTab === 'settings' && settings && (
              <div style={{ padding: '20px' }}>
                <ToggleRow>
                  <div>
                    <ToggleLabel><Type size={14} /> Text Chat</ToggleLabel>
                    <ToggleHint>{settings.enable_text ? '✅ เปิดให้พิมพ์ข้อความ' : '❌ ปิดการพิมพ์'}</ToggleHint>
                  </div>
                  <TogglePill $on={settings.enable_text} onClick={() => handleToggle('enable_text')} />
                </ToggleRow>
                <Divider />
                <ToggleRow>
                  <div>
                    <ToggleLabel><Mic size={14} /> Voice Recording</ToggleLabel>
                    <ToggleHint>{settings.enable_voice ? '✅ แสดงปุ่มไมโครโฟน' : '❌ ซ่อนปุ่มไมโครโฟน'}</ToggleHint>
                  </div>
                  <TogglePill $on={settings.enable_voice} onClick={() => handleToggle('enable_voice')} />
                </ToggleRow>
                <Divider />
                <ToggleRow>
                  <div>
                    <ToggleLabel><ImageIcon size={14} /> Image Upload</ToggleLabel>
                    <ToggleHint style={{ color: '#f59e0b' }}>
                      {settings.enable_image ? '⚠️ เปิด — กินโควต้าสูงมาก!' : '❌ ปิด (แนะนำ — ประหยัด quota)'}
                    </ToggleHint>
                  </div>
                  <TogglePill $on={settings.enable_image} onClick={() => handleToggle('enable_image')} />
                </ToggleRow>
              </div>
            )}

            {activeTab === 'prompt' && (
              <div style={{ padding: '20px' }}>
                <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginBottom: 10, lineHeight: 1.5 }}>
                  System prompt ที่ใช้สำหรับ AI chatbot ในหน้าเว็บ (อ่านจาก <code style={{ color: '#a78bfa' }}>chatService.ts</code>)
                </div>
                <SystemPromptArea
                  readOnly
                  value={ADMIN_SYSTEM_PROMPT}
                  rows={6}
                />
                <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <ModelTag><Zap size={11} /> gemini-flash-latest</ModelTag>
                  <Badge $color="#22c55e"><Globe size={10} /> Multi-lang</Badge>
                  <Badge $color="#f59e0b"><Lock size={10} /> Text only</Badge>
                </div>
              </div>
            )}
          </Card>

          {/* Quota info */}
          <Card style={{ padding: '20px' }}>
            <CardHeader style={{ marginBottom: 12 }}>
              <CardTitle><Zap size={15} style={{ color: '#f59e0b' }} /> Session Quota</CardTitle>
              <Badge $color={quotaPct > 80 ? '#ef4444' : '#22c55e'}>~{quotaUsed} tokens</Badge>
            </CardHeader>
            <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginBottom: 6 }}>
              การใช้งาน session นี้ (ตัดเหลือ 5 รอบล่าสุดอัตโนมัติ)
            </div>
            <QuotaBar $pct={quotaPct} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(148,163,184,0.35)', marginTop: 6 }}>
              <span>0</span><span>~2,000 tokens</span>
            </div>
            <ClearBtn style={{ marginTop: 12 }} onClick={clearChat}>
              <Trash2 size={13} /> Clear conversation
            </ClearBtn>
          </Card>
        </LeftPanel>

        {/* ── RIGHT PANEL: Live Chat Preview ───────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>Live Chat Preview</div>
              <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginTop: 2 }}>
                ทดสอบ AI โดยตรง — ใช้ key เดียวกับ production, ตัด history ≤ 10 messages เพื่อประหยัด quota
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Badge $color={activeKeys > 0 ? '#22c55e' : '#ef4444'}>
                {activeKeys > 0 ? <><CheckCircle size={10} /> {activeKeys} keys ready</> : <><AlertCircle size={10} /> No keys</>}
              </Badge>
              <SecondaryBtn onClick={() => window.location.reload()} style={{ padding: '7px 14px', fontSize: 12 }}>
                <RefreshCw size={13} /> Refresh
              </SecondaryBtn>
            </div>
          </Card>

          {/* Chat Window */}
          <ChatWindow>
            <ChatHeader>
              <ChatAvatar>🤖</ChatAvatar>
              <ChatHeaderInfo>
                <ChatName>Labot — ผู้ช่วย AI</ChatName>
                <ChatStatus>ออนไลน์ · LA-GAME</ChatStatus>
              </ChatHeaderInfo>
              <ChatHeaderBtns>
                <ChatHdrBtn onClick={clearChat} title="Clear chat">
                  <Trash2 size={14} />
                </ChatHdrBtn>
              </ChatHeaderBtns>
            </ChatHeader>

            <ChatTabs>
              <ChatTab $active={chatTab === 'ai'} onClick={() => setChatTab('ai')}>
                <Bot size={12} /> AI Chat
              </ChatTab>
              <ChatTab $active={chatTab === 'info'} onClick={() => setChatTab('info')}>
                <Users size={12} /> System Info
              </ChatTab>
            </ChatTabs>

            {chatTab === 'ai' ? (
              <>
                <ChatMessages>
                  {messages.length === 0 && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', flex: 1, gap: 10, opacity: 0.4, padding: '30px 0'
                    }}>
                      <Bot size={40} />
                      <div style={{ fontSize: 13, textAlign: 'center', lineHeight: 1.5, color: 'rgba(148,163,184,0.6)' }}>
                        ทดสอบแชทกับ Labot ได้เลย<br />
                        <span style={{ fontSize: 11 }}>ตัดประวัติ 10 ข้อความล่าสุดอัตโนมัติ</span>
                      </div>
                    </div>
                  )}

                  {messages.map((m, i) => {
                    const isUser = m.role === 'user'
                    const isError = (m as any)._isError
                    return (
                      <MsgWrap key={i} $isUser={isUser}>
                        {!isUser && <MiniAvatar>🤖</MiniAvatar>}
                        <Bubble $role={isError ? 'error' : m.role as any}>
                          {m.content}
                        </Bubble>
                      </MsgWrap>
                    )
                  })}

                  {chatLoading && (
                    <MsgWrap $isUser={false}>
                      <MiniAvatar>🤖</MiniAvatar>
                      <TypingBubble>
                        <Dot $delay={0} /><Dot $delay={150} /><Dot $delay={300} />
                      </TypingBubble>
                    </MsgWrap>
                  )}

                  <div ref={messagesEndRef} />
                </ChatMessages>

                {/* Quick test buttons */}
                {messages.length === 0 && (
                  <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[
                      'มีเกมกี่เกม?',
                      'โหลดเกมยังไง?',
                      'เว็บนี้ปลอดภัยไหม?'
                    ].map(q => (
                      <button
                        key={q}
                        onClick={() => { setInput(q); textareaRef.current?.focus() }}
                        style={{
                          padding: '5px 10px', fontSize: 11.5, border: '1px solid rgba(124,58,237,0.25)',
                          background: 'rgba(124,58,237,0.08)', color: 'rgba(148,163,184,0.8)',
                          borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s', fontFamily: "'Noto Sans Lao', sans-serif"
                        }}
                        onMouseEnter={e => { (e.target as any).style.background = 'rgba(124,58,237,0.18)'; (e.target as any).style.color = '#fff' }}
                        onMouseLeave={e => { (e.target as any).style.background = 'rgba(124,58,237,0.08)'; (e.target as any).style.color = 'rgba(148,163,184,0.8)' }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                <ChatInputArea>
                  <ChatInputRow>
                    <ChatTextarea
                      ref={textareaRef}
                      placeholder="พิมพ์ข้อความ..."
                      value={input}
                      onChange={handleInput}
                      onKeyDown={handleKeyDown}
                      disabled={chatLoading || activeKeys === 0}
                      rows={1}
                    />
                    <SendButton
                      $loading={chatLoading}
                      disabled={chatLoading || !input.trim() || activeKeys === 0}
                      onClick={handleSend}
                    >
                      {chatLoading ? <SpinIcon /> : <Send size={15} />}
                    </SendButton>
                  </ChatInputRow>
                  <ChatFooter>Labot อาจเกิดข้อผิดพลาด กรุณาใช้ด้วยวิจารณญาณ</ChatFooter>
                </ChatInputArea>
              </>
            ) : (
              <ChatMessages>
                {[
                  { label: 'Games in DB', value: gameCount.toString(), color: '#a78bfa' },
                  { label: 'Total Views', value: totalViews.toLocaleString(), color: '#34d399' },
                  { label: 'Active API Keys', value: `${activeKeys} / ${totalKeys}`, color: activeKeys > 0 ? '#22c55e' : '#ef4444' },
                  { label: 'AI Model', value: 'gemini-flash-latest', color: '#67e8f9' },
                  { label: 'Max History', value: '10 messages (5 rounds)', color: '#fcd34d' },
                  { label: 'Max Output Tokens', value: '2,048', color: '#f9a8d4' },
                  { label: 'Image Analysis', value: settings?.enable_image ? 'Enabled ⚠️' : 'Disabled ✅', color: settings?.enable_image ? '#f87171' : '#4ade80' },
                  { label: 'Voice Input', value: settings?.enable_voice ? 'Enabled' : 'Disabled', color: 'rgba(148,163,184,0.6)' },
                ].map((row, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 4px', borderBottom: '1px solid rgba(255,255,255,0.04)',
                    fontSize: 12.5
                  }}>
                    <span style={{ color: 'rgba(148,163,184,0.6)' }}>{row.label}</span>
                    <span style={{ fontWeight: 700, color: row.color, fontFamily: "'JetBrains Mono', monospace" }}>
                      {row.value}
                    </span>
                  </div>
                ))}
                <div style={{
                  marginTop: 16, padding: '12px', borderRadius: 10,
                  background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)',
                  color: '#fcd34d', fontSize: 12, lineHeight: 1.6
                }}>
                  💡 <strong>ประหยัด Quota:</strong> ระบบตัด conversation history เหลือแค่ 10 ข้อความล่าสุดทุกครั้ง
                  และใช้ gemini-flash (เร็ว, ถูก) แทน pro เพื่อลดการใช้โควต้า
                </div>
              </ChatMessages>
            )}
          </ChatWindow>
        </div>
      </PageGrid>
    </AdminPage>
  )
}
