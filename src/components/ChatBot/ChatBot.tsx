import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { X, Send, Bot, ChevronDown, AlertCircle, MessageCircle, Headphones, File, Trash2, Maximize, Minimize, Mic, Square, Image as ImageIcon, Copy, RotateCcw, Reply, Plus, Check } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sendChatMessage } from '../../lib/chatService'
import type { ChatMessage } from '../../lib/chatService'
import { getActiveModelInfo } from '../../lib/aiProvider'
import { detectPlatform } from '../../lib/analytics'
import { useLanguage } from '../../lib/i18n/LanguageContext'

// ── Keyframes ─────────────────────────────────────────────────────
const slideUp = keyframes`from { opacity: 0; transform: translateY(24px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); }`
const fadeIn = keyframes`from { opacity: 0; } to { opacity: 1; }`
const pulse = keyframes`0%, 100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); } 50% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }`
const pulseRed = keyframes`0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.6; }`
const typing = keyframes`0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-5px); opacity: 1; }`
const spin = keyframes`to { transform: rotate(360deg); }`
const shake = keyframes`0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(6px)}45%{transform:translateX(-4px)}60%{transform:translateX(4px)}75%{transform:translateX(-2px)}90%{transform:translateX(2px)}`

// ── Types ─────────────────────────────────────────────────────────
type AppMode = 'ai' | 'support'
interface SupportMessage { id: string; session_id: string; role: 'user' | 'admin'; content: string; created_at: string; attachment_url?: string; attachment_type?: string }

const SUPPORT_TOKEN_KEY = 'lap_support_token'

// ── Layout ────────────────────────────────────────────────────────
const Wrap = styled.div`
  position: fixed; bottom: 28px; right: 28px; z-index: 9999;
  display: flex; flex-direction: column; align-items: flex-end; gap: 12px;
  @media (max-width: 480px) { bottom: 16px; right: 16px; }
`
const FloatBtn = styled.button<{ $open: boolean }>`
  width: 58px; height: 58px; border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 26px; box-shadow: 0 8px 32px rgba(124,58,237,0.45);
  transition: transform 0.25s, box-shadow 0.25s;
  animation: ${p => p.$open ? 'none' : css`${pulse} 2.5s ease-in-out infinite`};
  &:hover { transform: scale(1.08); box-shadow: 0 12px 40px rgba(124,58,237,0.6); }
  &:active { transform: scale(0.96); }
  position: relative;
  @media (max-width: 480px) {
    display: ${p => p.$open ? 'none' : 'flex'};
  }
`
const UnreadDot = styled.div`
  position: absolute; top: 0px; right: 0px;
  width: 20px; height: 20px; border-radius: 50%;
  background: #ef4444; border: 2px solid #080814;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 900; color: #fff;
  box-shadow: 0 0 10px rgba(239,68,68,0.6);
`
const Window = styled.div<{ $maximized: boolean }>`
  position: relative;
  width: ${p => p.$maximized ? '80vw' : '400px'};
  height: ${p => p.$maximized ? '80vh' : '580px'};
  max-width: 100vw; max-height: 100vh;
  background: rgba(10,10,22,0.98); backdrop-filter: blur(28px);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;
  display: flex; flex-direction: column; overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15);
  animation: ${slideUp} 0.3s cubic-bezier(0.34,1.56,0.64,1) both;
  transition: transform 0.3s ease, opacity 0.3s ease;
  resize: none;
  @media (max-width: 480px) { position: fixed; inset: 0; width: 100% !important; height: 100% !important; border-radius: 0; border: none; resize: none; }
`

// ── New Header (mockup style) ─────────────────────────────────────
const Header = styled.div`
  padding: 11px 14px 10px;
  background: rgba(15,15,30,0.95);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  flex-shrink: 0;
`
const HeaderLeft = styled.div`
  display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0;
`
const AvatarWrap = styled.div`
  width: 34px; height: 34px; border-radius: 50%;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; font-size: 16px; box-shadow: 0 4px 12px rgba(124,58,237,0.4);
`
const HeaderTitleBtn = styled.button`
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; cursor: pointer; padding: 3px 6px; border-radius: 7px;
  transition: background 0.15s;
  &:hover { background: rgba(255,255,255,0.07); }
`
const HeaderName = styled.span`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 14px; font-weight: 700; color: #fff;
`

const HeaderRight = styled.div`display: flex; align-items: center; gap: 4px; flex-shrink: 0;`
const ActionBtn = styled.button<{ $danger?: boolean; $primary?: boolean }>`
  height: 28px; border-radius: 7px; border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 5px;
  transition: all 0.15s; font-size: 12px; font-weight: 600;
  ${p => p.$primary ? `
    padding: 0 12px;
    background: #3b82f6; color: #fff;
    &:hover { background: #2563eb; }
  ` : `
    width: 28px; padding: 0;
    background: rgba(255,255,255,0.06);
    color: rgba(148,163,184,0.7);
    &:hover { background: ${p.$danger ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.12)'}; color: ${p.$danger ? '#ef4444' : '#fff'}; }
  `}
`
const StatusDot = styled.div<{ $support?: boolean }>`
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: rgba(148,163,184,0.6); margin-top: 1px;
  &::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: ${p => p.$support ? '#f59e0b' : '#22c55e'};
    box-shadow: 0 0 6px ${p => p.$support ? '#f59e0b' : '#22c55e'};
    animation: ${pulse} 2s ease-in-out infinite; flex-shrink: 0;
  }
`

// ── Mode Tabs ────────────────────────────────────────────────────
const Tabs = styled.div`
  display: flex; border-bottom: 1px solid rgba(124,58,237,0.12); flex-shrink: 0;
`
const Tab = styled.button<{ $active: boolean }>`
  flex: 1; padding: 10px; font-size: 12px; font-weight: 700; border: none; cursor: pointer;
  background: ${p => p.$active ? 'rgba(124,58,237,0.15)' : 'transparent'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.5)'};
  border-bottom: 2px solid ${p => p.$active ? '#7c3aed' : 'transparent'};
  transition: all 0.15s; display: flex; align-items: center; justify-content: center; gap: 5px;
  &:hover { background: rgba(124,58,237,0.1); color: #c4b5fd; }
`

// ── Messages ─────────────────────────────────────────────────────
const Messages = styled.div`
  flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px;
  scroll-behavior: smooth;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.3); border-radius: 2px; }
`
const Bubble = styled.div<{ $role: 'user' | 'assistant' | 'admin' | 'error' | 'system' }>`
  padding: 10px 14px; font-size: 13.5px; line-height: 1.6;
  animation: ${fadeIn} 0.25s ease; white-space: pre-wrap; word-break: break-word;
  border-radius: ${p => p.$role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  align-self: ${p => p.$role === 'user' ? 'flex-end' : 'flex-start'};
  ${p => p.$role === 'user' && css`background: linear-gradient(135deg,#7c3aed,#9d5cf5); color:#fff; box-shadow: 0 4px 16px rgba(124,58,237,0.3);`}
  ${p => (p.$role === 'assistant' || p.$role === 'admin') && css`background: rgba(255,255,255,0.06); border: 1px solid rgba(124,58,237,0.15); color: #e2e8f0;`}
  ${p => p.$role === 'error' && css`background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); color: #fca5a5; display:flex; align-items:flex-start; gap:8px;`}
  ${p => p.$role === 'system' && css`background: rgba(245,158,11,0.08); border: 1px solid rgba(245,158,11,0.2); color: #fcd34d; font-size:12px; align-self:center; text-align:center; border-radius:8px;`}
`
const BubbleWrap = styled.div<{ $isUser: boolean }>`
  display: flex; flex-direction: column; gap: 4px; max-width: 88%;
  align-items: ${p => p.$isUser ? 'flex-end' : 'flex-start'};
  align-self: ${p => p.$isUser ? 'flex-end' : 'flex-start'};
  
  &:hover .msg-actions { opacity: 1; pointer-events: auto; }
`
const MsgActions = styled.div<{ $isUser: boolean }>`
  display: flex; gap: 4px; opacity: 0; pointer-events: none; transition: opacity 0.2s;
  justify-content: ${p => p.$isUser ? 'flex-end' : 'flex-start'};
`
const MsgActionBtn = styled.button<{ $danger?: boolean }>`
  width: 26px; height: 26px; border-radius: 6px; border: none;
  background: rgba(255,255,255,0.05); color: rgba(148,163,184,0.6);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s;
  &:hover { background: ${p => p.$danger ? 'rgba(239,68,68,0.15)' : 'rgba(124,58,237,0.15)'}; color: ${p => p.$danger ? '#ef4444' : '#c4b5fd'}; }
`
const RoleLabel = styled.div<{ $admin?: boolean }>`
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  color: ${p => p.$admin ? '#f59e0b' : 'rgba(148,163,184,0.4)'};
  margin-bottom: 4px;
`
const TypingBubble = styled(Bubble)` display: flex; align-items: center; gap: 5px; padding: 12px 16px; `
const Dot = styled.span<{ $delay: number }>`
  width: 7px; height: 7px; border-radius: 50%; background: rgba(148,163,184,0.6);
  animation: ${typing} 1.2s ease-in-out infinite; animation-delay: ${p => p.$delay}ms;
`
const VoiceIndicator = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2);
  border-radius: 12px; margin: 12px 14px 4px; padding: 12px;
  color: #fca5a5; font-size: 13.5px; font-weight: 600; font-family: 'Inter', sans-serif;
  animation: ${pulseRed} 1.5s infinite;
`
const RecordingDot = styled.div`
  width: 10px; height: 10px; border-radius: 50%; background: #ef4444;
  box-shadow: 0 0 8px rgba(239,68,68,0.8);
`

// ── Welcome / Support Start ───────────────────────────────────────
const WelcomeCard = styled.div`
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 14px; padding: 16px; text-align: center; animation: ${fadeIn} 0.4s ease;
`
const WelcomeEmoji = styled.div`font-size: 36px; margin-bottom: 8px;`
const WelcomeTitle = styled.div`font-family: 'Noto Sans Lao', sans-serif; font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 6px;`
const WelcomeText = styled.div`font-size: 12px; color: rgba(148,163,184,0.7); line-height: 1.5;`
const QuickBtns = styled.div`display: flex; flex-direction: column; gap: 6px; margin-top: 10px;`
const QuickBtn = styled.button`
  padding: 8px 12px; border-radius: 8px;
  background: rgba(124,58,237,0.1); border: 1px solid rgba(124,58,237,0.2);
  color: rgba(148,163,184,0.9); font-size: 12px; cursor: pointer; text-align: left; transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.2); color: #fff; border-color: rgba(124,58,237,0.4); }
`
const SupportChoiceBtn = styled.button`
  display: flex; align-items: flex-start; gap: 0;
  padding: 12px 14px; border-radius: 12px;
  background: rgba(124,58,237,0.06); border: 1px solid rgba(124,58,237,0.15);
  cursor: pointer; text-align: left; transition: all 0.15s;
  width: 100%; flex-direction: column; gap: 4px;
  &:hover { background: rgba(124,58,237,0.12); border-color: rgba(124,58,237,0.3); }
`
const ChoiceTitle = styled.span`
  color: #c4b5fd; font-size: 13.5px; font-weight: 600; font-family: 'Noto Sans Lao', sans-serif;
`
const ChoiceDesc = styled.span`
  color: rgba(148,163,184,0.7); font-size: 11.5px; font-family: 'Noto Sans Lao', sans-serif; line-height: 1.4;
`

const NameForm = styled.div`
  background: rgba(124,58,237,0.08); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 14px; padding: 20px; animation: ${fadeIn} 0.3s ease;
`
const NameInput = styled.input<{ $shake?: boolean }>`
  width: 100%; background: rgba(255,255,255,0.05); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 10px; color: #e2e8f0; font-size: 14px; padding: 10px 13px;
  font-family: 'Noto Sans Lao', sans-serif; outline: none; box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: rgba(148,163,184,0.4); }
  &:focus { border-color: rgba(124,58,237,0.5); }
  ${p => p.$shake && css`
    animation: ${shake} 0.5s ease;
    border-color: rgba(239,68,68,0.7);
    box-shadow: 0 0 0 2px rgba(239,68,68,0.25);
  `}
`

// ── Input Area (mockup style) ─────────────────────────────────────
const InputArea = styled.div`
  padding: 10px 12px 8px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(8,8,20,0.6);
  display: flex; flex-direction: column; gap: 0;
  flex-shrink: 0;
`
const InputBox = styled.div`
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px; overflow: hidden;
  transition: border-color 0.2s;
  &:focus-within { border-color: rgba(124,58,237,0.35); }
`
const TextArea = styled.textarea`
  flex: 1; background: transparent; border: none;
  color: #e2e8f0; font-size: 13.5px; padding: 11px 14px 8px;
  font-family: 'Noto Sans Lao', sans-serif;
  resize: none; outline: none; max-height: 160px; min-height: 38px; line-height: 1.5; width: 100%;
  &::placeholder { color: rgba(148,163,184,0.35); }
`
const InputToolbar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 6px 10px 8px; gap: 6px;
`
const InputToolbarLeft = styled.div`display: flex; align-items: center; gap: 4px;`
const InputToolbarRight = styled.div`display: flex; align-items: center; gap: 6px;`
const ModelPill = styled.button`
  display: flex; align-items: center; gap: 5px;
  background: rgba(124,58,237,0.12); border: 1px solid rgba(124,58,237,0.2);
  border-radius: 8px; padding: 3px 9px 3px 7px;
  color: #c4b5fd; font-size: 11.5px; font-weight: 600; cursor: pointer;
  transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.2); }
`
const ToolbarIconBtn = styled.button`
  width: 28px; height: 28px; border-radius: 7px; border: none;
  background: transparent; color: rgba(148,163,184,0.5);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.15s;
  &:hover { background: rgba(255,255,255,0.08); color: rgba(148,163,184,0.9); }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`
const SendBtn = styled.button<{ $loading?: boolean; $isRecord?: boolean }>`
  width: 34px; height: 34px; border-radius: 50%; border: none;
  background: ${p => p.$isRecord ? '#ef4444' : p.$loading ? 'rgba(59,130,246,0.4)' : '#3b82f6'};
  color: #fff; cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59,130,246,0.35);
  &:hover:not(:disabled) { transform: scale(1.07); box-shadow: 0 4px 14px rgba(59,130,246,0.5); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`
const InputFooterText = styled.div`
  text-align: center; font-size: 10.5px; color: rgba(148,163,184,0.25); padding: 4px 0 2px;
  font-family: 'Noto Sans Lao', sans-serif;
`
const AttachmentImage = styled.img`max-width: 100%; border-radius: 8px; margin-top: 6px; cursor: zoom-in;`
const LightboxOverlay = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: ${fadeIn} 0.18s ease;
  cursor: zoom-out;
`
const LightboxImg = styled.img`
  max-width: 90vw; max-height: 90vh; border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8); cursor: default;
  object-fit: contain;
`
const LightboxClose = styled.button`
  position: fixed; top: 20px; right: 24px;
  background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2);
  color: #fff; border-radius: 50%; width: 40px; height: 40px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; font-size: 20px; backdrop-filter: blur(8px);
  &:hover { background: rgba(255,255,255,0.2); }
`
const AttachmentFile = styled.a`
  display: flex; align-items: center; gap: 8px; padding: 10px 12px; margin-top: 6px;
  background: rgba(0,0,0,0.2); border-radius: 8px; color: #e2e8f0; text-decoration: none; font-size: 12px;
  border: 1px solid rgba(255,255,255,0.1); transition: all 0.15s;
  &:hover { background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.2); }
`
const PreviewWrap = styled.div`
  position: relative; width: 60px; height: 60px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(124,58,237,0.4);
`
const PreviewImg = styled.img`width: 100%; height: 100%; object-fit: cover;`
const RemovePreviewBtn = styled.button`
  position: absolute; top: -4px; right: -4px; background: #ef4444; border: none; border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: white;
  cursor: pointer; font-size: 12px;
`
const Spinner = styled.div`
  width: 16px; height: 16px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.3); border-top-color: #fff;
  animation: ${spin} 0.7s linear infinite;
`
const MentionMenu = styled.ul`
  position: absolute; bottom: 100%; left: 0; right: 0; max-height: 200px;
  background: #1e1e24; border: 1px solid rgba(124,58,237,0.3); border-radius: 12px;
  margin: 0 14px 8px; padding: 4px; overflow-y: auto; list-style: none;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.4); z-index: 10;
  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.5); border-radius: 3px; }
`
const MentionItem = styled.li<{ $active?: boolean }>`
  padding: 8px 12px; border-radius: 8px; cursor: pointer; color: #e2e8f0; font-size: 13px;
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  &:hover { background: rgba(124,58,237,0.1); }
`

// ══════════════════════════════════════════════════════════════════
const ReplyBlock = styled.div`
  background: rgba(0,0,0,0.15); padding: 6px 10px; border-radius: 4px; border-left: 3px solid rgba(255,255,255,0.4);
  font-size: 11px; opacity: 0.85; margin-bottom: 6px;
`

const renderMessageContent = (content: string) => {
  if (!content) return null
  const replyMatch = content.match(/^\[Reply: (.*?)\]\n([\s\S]*)$/)
  if (replyMatch) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <ReplyBlock>
          <span style={{ display: 'block', fontSize: 9, fontWeight: 700, marginBottom: 2 }}>ตอบกลับ:</span>
          {replyMatch[1]}
        </ReplyBlock>
        <div>{replyMatch[2]}</div>
      </div>
    )
  }
  return content
}

const ResizeHandleTop = styled.div`
  position: absolute; top: 0; left: 0; right: 0; height: 6px; cursor: ns-resize; z-index: 10;
`
const ResizeHandleLeft = styled.div`
  position: absolute; top: 0; bottom: 0; left: 0; width: 6px; cursor: ew-resize; z-index: 10;
`
const ResizeHandleTopLeft = styled.div`
  position: absolute; top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; z-index: 11;
`

export default function ChatBot() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [mode, setMode] = useState<AppMode>('ai')
  const [hasUnread, setHasUnread] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [activeModelLabel, setActiveModelLabel] = useState<string>('gemini-flash')

  // ── Features toggles ──
  const [features, setFeatures] = useState({ enable_text: true, enable_voice: false, enable_image: false })

  useEffect(() => {
    getActiveModelInfo('chatbot').then(info => {
      // Create a nice human readable name or just use the model name
      let name = info.model;
      if (name.includes('gpt-oss')) name = 'gpt-oss (groq)';
      else if (name.includes('flash')) name = 'gemini-flash';
      setActiveModelLabel(name);
    }).catch(console.error)
  }, [])

  // ── AI Chat state ───
  const [aiMessages, setAiMessages] = useState<ChatMessage[]>([])
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  // Attachments for AI
  const [aiAttachments, setAiAttachments] = useState<{ id: string, type: 'image' | 'audio', url: string, blob?: Blob, base64?: string, mimeType: string }[]>([])
  const aiFileInputRef = useRef<HTMLInputElement>(null)

  // Voice recording
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const recognitionRef = useRef<any>(null)
  const timerRef = useRef<number | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  const [gameCount, setGameCount] = useState(0)
  const [totalViews, setTotalViews] = useState(0)

  // ── Support Chat state ───
  const [supportPhase, setSupportPhase] = useState<'init' | 'naming' | 'chatting'>('init')
  const [supportSessionId, setSupportSessionId] = useState<string | null>(null)
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([])
  const [supportInput, setSupportInput] = useState('')
  const [supportSending, setSupportSending] = useState(false)
  const [supportReplyingTo, setSupportReplyingTo] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  // Support Chat attachments queue (images + audio previewed before send)
  const [supportAttachments, setSupportAttachments] = useState<{ id: string; file?: File; blob?: Blob; url: string; type: 'image' | 'audio'; name?: string }[]>([])
  const [isSupportRecording, setIsSupportRecording] = useState(false)
  const [supportRecordingTime, setSupportRecordingTime] = useState(0)
  const supportMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const supportAudioChunksRef = useRef<Blob[]>([])
  const supportTimerRef = useRef<number | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const aiTextRef = useRef<HTMLTextAreaElement>(null)
  const supportTextRef = useRef<HTMLTextAreaElement>(null)
  const realtimeRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [nameInputShake, setNameInputShake] = useState(false)

  // Detect mobile/touch device — pointer:coarse = finger/stylus (mobile/tablet), pointer:fine = mouse (desktop)
  const isMobile = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

  // Localized quick questions
  const QUICK_QUESTIONS = [t('chat.quick_q1'), t('chat.quick_q2'), t('chat.quick_q3')]

  // Games list for @mention
  const [gamesList, setGamesList] = useState<string[]>([])
  const [mentionQuery, setMentionQuery] = useState<string | null>(null)
  const [mentionIndex, setMentionIndex] = useState(0)
  const [cursorPos, setCursorPos] = useState(0)

  // ── Window Resizing ──
  const [winSize, setWinSize] = useState({ w: 400, h: 580 })
  const isResizing = useRef<'top'|'left'|'tl'|null>(null)
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 })

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      let newW = startPos.current.w
      let newH = startPos.current.h
      if (isResizing.current === 'left' || isResizing.current === 'tl') {
        const dx = startPos.current.x - e.clientX
        newW = Math.max(320, Math.min(window.innerWidth - 60, startPos.current.w + dx))
      }
      if (isResizing.current === 'top' || isResizing.current === 'tl') {
        const dy = startPos.current.y - e.clientY
        newH = Math.max(400, Math.min(window.innerHeight - 100, startPos.current.h + dy))
      }
      setWinSize({ w: newW, h: newH })
    }
    const handleUp = () => { 
      isResizing.current = null
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
    }
  }, [])

  const startResize = (type: 'top'|'left'|'tl') => (e: React.MouseEvent) => {
    e.preventDefault()
    isResizing.current = type
    startPos.current = { x: e.clientX, y: e.clientY, w: winSize.w, h: winSize.h }
    document.body.style.userSelect = 'none'
  }

  // ── Initialization ───────────────────────────────────────────────
  useEffect(() => {
    const fetchStatsAndSettings = async () => {
      const [{ count: gc }, { data: gd }, { data: settings }, { data: titles }] = await Promise.all([
        supabase.from('games').select('id', { count: 'exact', head: true }),
        supabase.from('games').select('view_count'),
        (supabase as any).from('chatbot_settings').select('*').limit(1).single(),
        supabase.from('games').select('title')
      ])
      setGameCount(gc || 0)
      setTotalViews((gd || []).reduce((s: number, g: any) => s + (g.view_count || 0), 0))

      if (titles) {
        setGamesList(titles.map((t: any) => t.title).filter(Boolean))
      }

      if (settings) {
        setFeatures({ enable_text: settings.enable_text, enable_voice: settings.enable_voice, enable_image: settings.enable_image })
      }
    }
    fetchStatsAndSettings()
  }, [])

  // ── Init support session from localStorage ───────────────────────
  useEffect(() => {
    const initSupport = async () => {
      const token = localStorage.getItem(SUPPORT_TOKEN_KEY)
      if (!token) { setSupportPhase('naming'); return }

      const { data: session } = await (supabase as any)
        .from('support_sessions').select('id').eq('session_token', token).single()
      if (!session) { localStorage.removeItem(SUPPORT_TOKEN_KEY); setSupportPhase('naming'); return }

      setSupportSessionId(session.id)
      const { data: msgs } = await (supabase as any)
        .from('support_messages').select('*').eq('session_id', session.id).order('created_at', { ascending: true })
      setSupportMessages(msgs || [])
      setSupportPhase('chatting')
      subscribeSupport(session.id)
    }
    initSupport()

    return () => {
      if (realtimeRef.current) {
        try {
          if ((supabase as any).removeChannel) (supabase as any).removeChannel(realtimeRef.current)
          else if (realtimeRef.current.unsubscribe) realtimeRef.current.unsubscribe()
        } catch (e) { }
      }
    }
  }, [])

  // ── Realtime subscription for support ────────────────────────────
  const subscribeSupport = (sessionId: string) => {
    try {
      if (realtimeRef.current) {
        try {
          if ((supabase as any).removeChannel) (supabase as any).removeChannel(realtimeRef.current)
          else if (realtimeRef.current.unsubscribe) realtimeRef.current.unsubscribe()
        } catch (e) { }
        realtimeRef.current = null
      }

      const ch = (supabase as any)
        .channel(`support_${sessionId}_${Math.random().toString(36).substring(7)}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'support_messages',
          filter: `session_id=eq.${sessionId}`
        }, (payload: any) => {
          setSupportMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev
            if (payload.new.role === 'admin' && !open) setHasUnread(true)
            return [...prev, payload.new]
          })
        })

      ch.subscribe()
      realtimeRef.current = ch
    } catch (e) {
      console.warn('subscribeSupport failed', e)
    }
  }

  useEffect(() => { if (open && mode === 'support') setHasUnread(false) }, [open, mode])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [aiMessages, supportMessages, aiLoading, supportPhase])
  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  // ── Support Actions ───────────────────────────────────────────────
  const startSupportSession = async (firstMessage: string) => {
    const platform = detectPlatform()
    const token = crypto.randomUUID()
    const label = nameInput.trim() || 'ผู้ใช้ไม่ระบุตัวตน'

    const { data: session } = await (supabase as any)
      .from('support_sessions')
      .insert({ session_token: token, user_label: label, platform })
      .select('id').single()
    if (!session) return

    localStorage.setItem(SUPPORT_TOKEN_KEY, token)
    setSupportSessionId(session.id)

    const { data: msg } = await (supabase as any)
      .from('support_messages').insert({ session_id: session.id, role: 'user', content: firstMessage }).select('*').single()
    if (msg) setSupportMessages([msg])

    await (supabase as any).from('support_sessions').update({ message_count: 1, last_seen: new Date().toISOString() }).eq('id', session.id)

    fetch('/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userLabel: label, firstMessage, platform, sessionId: session.id })
    }).catch(() => { })

    setSupportPhase('chatting')
    subscribeSupport(session.id)
  }

  const sendSupportMessage = async (textParam?: string | React.MouseEvent | React.FormEvent) => {
    const isText = typeof textParam === 'string'
    const rawContent = isText ? (textParam as string).trim() : supportInput.trim()
    if (!rawContent && supportAttachments.length === 0) return
    if (supportSending) return
    if (supportTextRef.current) supportTextRef.current.style.height = 'auto'

    let content = rawContent
    if (supportReplyingTo && rawContent) {
      content = `[Reply: ${supportReplyingTo.substring(0, 80)}${supportReplyingTo.length > 80 ? '...' : ''}]\n${rawContent}`
    }

    if (supportPhase === 'naming' || !supportSessionId) {
      if (!content) { alert(t('chat.send_first_before_attach')); return }
      // Require name before first send
      if (!nameInput.trim()) {
        setNameInputShake(true)
        nameInputRef.current?.focus()
        setTimeout(() => setNameInputShake(false), 600)
        return
      }
      // Only clear input after validation passes
      if (!isText) setSupportInput('')
      setSupportSending(true)
      await startSupportSession(content)
      setSupportSending(false)
      return
    }

    // Normal chat phase
    if (!isText) setSupportInput('')

    setSupportSending(true)

    // Send text message if any
    if (content) {
      const { data: msg } = await (supabase as any)
        .from('support_messages').insert({ session_id: supportSessionId, role: 'user', content }).select('*').single()
      if (msg) setSupportMessages(prev => [...prev, msg])
    }

    // Upload each attachment one by one
    for (const att of supportAttachments) {
      let uploadFile: Blob | null = att.file ?? null
      if (!uploadFile && att.blob) {
        uploadFile = att.blob
      }
      if (!uploadFile) continue
      const uploadName = att.file?.name ?? `voice_${Date.now()}.webm`

      const fileExt = uploadName.split('.').pop()
      const fileName = `${supportSessionId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error } = await supabase.storage.from('chat_attachments').upload(fileName, uploadFile, {
        contentType: att.type === 'audio' ? 'audio/webm' : (uploadFile as any).type
      })
      if (error) { alert(t('chat.upload_failed')); continue }
      const { data: urlData } = supabase.storage.from('chat_attachments').getPublicUrl(fileName)
      const type = att.type === 'audio' ? 'audio' : (uploadFile.type.startsWith('image/') ? 'image' : 'file')

      const { data: msg } = await (supabase as any)
        .from('support_messages').insert({
          session_id: supportSessionId,
          role: 'user',
          content: att.type === 'audio' ? '🎤 Voice Message' : `📎 ${uploadName}`,
          attachment_url: urlData.publicUrl,
          attachment_type: type
        }).select('*').single()

      if (msg) setSupportMessages(prev => [...prev, msg])
    }

    // Clear attachment queue
    supportAttachments.forEach(att => URL.revokeObjectURL(att.url))
    setSupportAttachments([])
    setSupportReplyingTo(null)

    await updateSupportLastSeen(supportSessionId)
    setSupportSending(false)
  }

  const updateSupportLastSeen = async (id: string) => {
    await (supabase as any).from('support_sessions').update({
      last_seen: new Date().toISOString(),
      is_read_by_admin: false
    }).eq('id', id)
  }

  const handleSupportFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files) // capture before clearing
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (supportAttachments.length >= 6) { alert('Maximum 6 attachments per message.'); return }

    filesArray.slice(0, 6 - supportAttachments.length).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { alert(t('chat.file_too_large')); return }
      const url = URL.createObjectURL(file)
      setSupportAttachments(prev => [...prev, {
        id: Math.random().toString(36).slice(2, 11),
        file,
        url,
        type: 'image',
        name: file.name
      }])
    })
  }

  const handleSupportPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    if (supportAttachments.length >= 6) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const url = URL.createObjectURL(file)
          setSupportAttachments(prev => [...prev, {
            id: Math.random().toString(36).slice(2, 11),
            file,
            url,
            type: 'image',
            name: `pasted_image_${Date.now()}.png`
          }])
        }
        break
      }
    }
  }

  const removeSupportAttachment = (id: string) => {
    setSupportAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att) URL.revokeObjectURL(att.url)
      return prev.filter(a => a.id !== id)
    })
  }

  const toggleSupportRecording = async () => {
    if (isSupportRecording) {
      if (supportMediaRecorderRef.current) supportMediaRecorderRef.current.stop()
      setIsSupportRecording(false)
      if (supportTimerRef.current) clearInterval(supportTimerRef.current)
    } else {
      if (supportAttachments.length >= 6) { alert('Maximum 6 attachments per message.'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        supportMediaRecorderRef.current = new MediaRecorder(stream)
        supportAudioChunksRef.current = []
        setSupportRecordingTime(0)

        supportMediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) supportAudioChunksRef.current.push(e.data)
        }
        supportMediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(supportAudioChunksRef.current, { type: 'audio/webm' })
          const url = URL.createObjectURL(audioBlob)
          setSupportAttachments(prev => [...prev, {
            id: Math.random().toString(36).slice(2, 11),
            blob: audioBlob,
            url,
            type: 'audio'
          }])
          stream.getTracks().forEach(track => track.stop())
        }

        supportMediaRecorderRef.current.start()
        setIsSupportRecording(true)
        supportTimerRef.current = window.setInterval(() => setSupportRecordingTime(prev => prev + 1), 1000)
      } catch (e) {
        alert('Microphone access denied or not available.')
      }
    }
  }

  const deleteSupportMessage = async (id: string) => {
    if (!confirm(t('chat.delete_confirm'))) return
    setSupportMessages(prev => prev.filter(m => m.id !== id))
    await supabase.from('support_messages').delete().eq('id', id)
  }

  const resetSupport = () => {
    if (!confirm(t('chat.reset_confirm'))) return
    localStorage.removeItem(SUPPORT_TOKEN_KEY)
    if (realtimeRef.current) realtimeRef.current.unsubscribe()
    setSupportSessionId(null); setSupportMessages([]); setNameInput(''); setSupportPhase('naming')
  }

  // ── Support @Mention ──────────────────────────────────────────────
  const [supportMentionQuery, setSupportMentionQuery] = useState<string | null>(null)
  const [supportMentionIndex, setSupportMentionIndex] = useState(0)
  const [supportCursorPos, setSupportCursorPos] = useState(0)

  const filteredGamesSupport = useMemo(() => {
    if (supportMentionQuery === null) return []
    const q = supportMentionQuery.toLowerCase()
    return gamesList.filter(g => g.toLowerCase().includes(q)).slice(0, 10)
  }, [supportMentionQuery, gamesList])

  const handleSupportInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setSupportInput(val)
    autoResize(e.target)
    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/)
    if (match) {
      setSupportMentionQuery(match[1])
      setSupportCursorPos(cursor)
      setSupportMentionIndex(0)
    } else {
      setSupportMentionQuery(null)
    }
  }

  const insertSupportMention = (game: string) => {
    if (supportMentionQuery === null) return
    const textBefore = supportInput.slice(0, supportCursorPos - supportMentionQuery.length - 1)
    const textAfter = supportInput.slice(supportCursorPos)
    const newText = textBefore + game + ' ' + textAfter
    setSupportInput(newText)
    setSupportMentionQuery(null)
    setTimeout(() => {
      if (supportTextRef.current) {
        const newCursor = textBefore.length + game.length + 1
        supportTextRef.current.setSelectionRange(newCursor, newCursor)
        supportTextRef.current.focus()
      }
    }, 0)
  }

  const handleSupportKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (supportMentionQuery !== null && filteredGamesSupport.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSupportMentionIndex(prev => (prev + 1) % filteredGamesSupport.length); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSupportMentionIndex(prev => (prev - 1 + filteredGamesSupport.length) % filteredGamesSupport.length); return }
      if (e.key === 'Enter') { e.preventDefault(); insertSupportMention(filteredGamesSupport[supportMentionIndex]); return }
      if (e.key === 'Escape') { e.preventDefault(); setSupportMentionQuery(null); return }
    }
    if (e.key === 'Enter' && !e.shiftKey && !isMobile) { e.preventDefault(); sendSupportMessage() }
  }

  // ── AI Actions ────────────────────────────────────────────────────
  const removeAiAttachment = (id: string) => {
    setAiAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att && att.type === 'audio') {
        URL.revokeObjectURL(att.url)
      }
      return prev.filter(a => a.id !== id)
    })
  }

  const handleAiImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    if (aiFileInputRef.current) aiFileInputRef.current.value = ''

    if (aiAttachments.length >= 4) { alert('Maximum 4 attachments allowed per message.'); return }

    filesArray.slice(0, 4 - aiAttachments.length).forEach(file => {
      if (file.size > 4 * 1024 * 1024) { alert('Image size must be less than 4MB'); return }
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setAiAttachments(prev => [...prev, {
          id: Math.random().toString(36).slice(2, 11),
          type: 'image',
          url: dataUrl,
          base64: dataUrl.split(',')[1],
          mimeType: file.type
        }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return
    if (aiAttachments.length >= 4) return // Skip if limit reached

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image/') !== -1) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            setAiAttachments(prev => [...prev, {
              id: Math.random().toString(36).slice(2, 11),
              type: 'image',
              url: dataUrl,
              base64: dataUrl.split(',')[1],
              mimeType: file.type
            }])
          }
          reader.readAsDataURL(file)
        }
        break // only paste one image per paste action to avoid duplicates from multi-format clipboards
      }
    }
  }

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert(t('chat.speech_unsupported') || 'Speech Recognition is not supported in this browser. Please use Chrome.')
      return
    }

    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'th-TH' // Default to Thai

      let finalTranscript = aiInput
      if (finalTranscript && !finalTranscript.endsWith(' ')) {
        finalTranscript += ' '
      }

      recognition.onresult = (e: any) => {
        let interimTranscript = ''
        let currentFinal = ''
        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            currentFinal += e.results[i][0].transcript
          } else {
            interimTranscript += e.results[i][0].transcript
          }
        }
        finalTranscript += currentFinal
        setAiInput(finalTranscript + interimTranscript)

        // Auto-resize the text area
        if (aiTextRef.current) {
          aiTextRef.current.style.height = 'auto'
          aiTextRef.current.style.height = Math.min(aiTextRef.current.scrollHeight, 200) + 'px'
        }
      }

      recognition.onerror = (e: any) => {
        console.error('Speech recognition error', e.error)
        setIsRecording(false)
        if (timerRef.current) clearInterval(timerRef.current)
        if (e.error === 'not-allowed') alert('Microphone access denied.')
      }

      recognition.onend = () => {
        setIsRecording(false)
        if (timerRef.current) clearInterval(timerRef.current)
      }

      recognitionRef.current = recognition
      try {
        recognition.start()
        setIsRecording(true)
        setRecordingTime(0)
        timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000)
      } catch (err) {
        console.error(err)
      }
    }
  }

  const sendAiMessage = useCallback(async (text?: string) => {
    if (mentionQuery !== null) setMentionQuery(null) // Close mention dropdown on send
    const content = (text ?? aiInput).trim()
    if (!content && aiAttachments.length === 0) return

    setAiLoading(true)
    abortControllerRef.current = new AbortController()

    // Process attachments to get base64
    const processedAttachments = await Promise.all(aiAttachments.map(async (att) => {
      if (att.type === 'audio' && att.blob) {
        return new Promise<any>((resolve) => {
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            resolve({ type: 'audio', data: dataUrl.split(',')[1], mimeType: 'audio/webm' })
          }
          reader.readAsDataURL(att.blob!)
        })
      }
      return { type: att.type, data: att.base64, mimeType: att.mimeType }
    }))

    const userMsg: ChatMessage = {
      role: 'user',
      content: content || (processedAttachments.every(a => a.type === 'image') ? '[Image Only]' : processedAttachments.every(a => a.type === 'audio') ? '[Voice Message]' : '[Attachments]'),
      attachments: processedAttachments.length > 0 ? processedAttachments : undefined
    }

    const validMessages = aiMessages.filter(m => !(m as any)._isError)
    const newMessages = [...validMessages, userMsg]

    setAiMessages([...aiMessages, userMsg])
    if (!text) setAiInput('')

    // clear attachments
    aiAttachments.forEach(att => {
      if (att.type === 'audio') URL.revokeObjectURL(att.url)
    })
    setAiAttachments([])

    if (aiTextRef.current) aiTextRef.current.style.height = 'auto'

    try {
      const reply = await sendChatMessage(newMessages, { gameCount, totalViews, abortSignal: abortControllerRef.current.signal })
      setAiMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e: any) {
      if (e.name === 'AbortError' || abortControllerRef.current?.signal.aborted) {
        // User aborted, do nothing else
      } else {
        const isQuota = e.message?.includes('QUOTA_EXCEEDED')
        setAiMessages(prev => [...prev, { role: 'assistant' as any, content: isQuota ? t('chat.ai_quota') : t('chat.ai_error'), _isError: true } as any])
      }
    } finally {
      abortControllerRef.current = null
      setAiLoading(false)
    }
  }, [aiInput, aiMessages, aiLoading, gameCount, totalViews, aiAttachments, t])

  const handleStopAi = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setAiLoading(false)
    }
  }

  const autoResize = (el: HTMLTextAreaElement) => { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px' }

  // Auto-resize when supportInput is set programmatically (e.g. from choice buttons)
  useEffect(() => {
    if (!supportTextRef.current) return
    const el = supportTextRef.current
    requestAnimationFrame(() => {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 200) + 'px'
    })
  }, [supportInput])

  // ── @Mention Logic ──
  const filteredGames = useMemo(() => {
    if (mentionQuery === null) return []
    const q = mentionQuery.toLowerCase()
    return gamesList.filter(g => g.toLowerCase().includes(q)).slice(0, 10)
  }, [mentionQuery, gamesList])

  const handleAiInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setAiInput(val)
    autoResize(e.target)

    const cursor = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursor)
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s]*)$/)

    if (match) {
      setMentionQuery(match[1])
      setCursorPos(cursor)
      setMentionIndex(0)
    } else {
      setMentionQuery(null)
    }
  }

  const insertMention = (game: string) => {
    if (mentionQuery === null) return
    const textBefore = aiInput.slice(0, cursorPos - mentionQuery.length - 1)
    const textAfter = aiInput.slice(cursorPos)
    const newText = textBefore + game + ' ' + textAfter
    setAiInput(newText)
    setMentionQuery(null)

    setTimeout(() => {
      if (aiTextRef.current) {
        const newCursor = textBefore.length + game.length + 1
        aiTextRef.current.setSelectionRange(newCursor, newCursor)
        aiTextRef.current.focus()
      }
    }, 0)
  }

  const handleAiInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredGames.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setMentionIndex(prev => (prev + 1) % filteredGames.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setMentionIndex(prev => (prev - 1 + filteredGames.length) % filteredGames.length)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        insertMention(filteredGames[mentionIndex])
        return
      }
      if (e.key === 'Escape') {
        e.preventDefault()
        setMentionQuery(null)
        return
      }
    }

    if (e.key === 'Enter' && !e.shiftKey && !isMobile) {
      e.preventDefault()
      sendAiMessage()
    }
  }

  const deleteAiMessage = (index: number) => {
    if (!confirm(t('chat.delete_confirm'))) return
    setAiMessages(prev => prev.filter((_, i) => i !== index))
  }

  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text || '')
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  const replyToSupportMessage = (content: string) => {
    setSupportReplyingTo(content)
    if (supportTextRef.current) supportTextRef.current.focus()
  }

  const regenerateAiMessage = (index: number) => {
    // Regenerate from the user message right before it
    const messagesToKeep = aiMessages.slice(0, index)
    const newMessages = messagesToKeep.filter(m => !(m as any)._isError)

    setAiMessages(messagesToKeep)
    setAiLoading(true)
    abortControllerRef.current = new AbortController()

    sendChatMessage(newMessages, { gameCount, totalViews, abortSignal: abortControllerRef.current.signal })
      .then(reply => {
        setAiMessages(prev => [...prev, { role: 'assistant', content: reply }])
      })
      .catch(e => {
        if (e.name !== 'AbortError' && !abortControllerRef.current?.signal.aborted) {
          const isQuota = e.message?.includes('QUOTA_EXCEEDED')
          setAiMessages(prev => [...prev, { role: 'assistant' as any, content: isQuota ? t('chat.ai_quota') : t('chat.ai_error'), _isError: true } as any])
        }
      })
      .finally(() => {
        abortControllerRef.current = null
        setAiLoading(false)
      })
  }

  const startNewAiChat = () => {
    if (aiMessages.length > 0 && confirm('Are you sure you want to start a new chat?')) {
      setAiMessages([])
      setAiInput('')
    }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <Wrap>
      {open && (
        <Window $maximized={maximized} style={!maximized && !isMobile ? { width: winSize.w, height: winSize.h } : undefined}>
          {!maximized && !isMobile && (
            <>
              <ResizeHandleTop onMouseDown={startResize('top')} />
              <ResizeHandleLeft onMouseDown={startResize('left')} />
              <ResizeHandleTopLeft onMouseDown={startResize('tl')} />
            </>
          )}
          {/* Header — mockup style */}
          <Header>
            <HeaderLeft>
              <AvatarWrap>{mode === 'support' ? '🎧' : '🤖'}</AvatarWrap>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <HeaderTitleBtn>
                  <HeaderName>{mode === 'support' ? t('chat.support_title') : t('chat.ai_title')}</HeaderName>
                  <ChevronDown size={13} style={{ color: 'rgba(148,163,184,0.5)', flexShrink: 0 }} />
                </HeaderTitleBtn>
                <StatusDot $support={mode === 'support'} style={{ paddingLeft: 8 }}>
                  {mode === 'support' ? t('chat.status_support') : t('chat.status_online')} · LA-GAME
                </StatusDot>
              </div>
            </HeaderLeft>
            <HeaderRight>
              {mode === 'ai' && (
                <ActionBtn onClick={startNewAiChat} title="Start new chat">
                  <Plus size={14} />
                </ActionBtn>
              )}
              <ActionBtn onClick={() => setMaximized(!maximized)} title={maximized ? 'Restore' : 'Maximize'}>
                {maximized ? <Minimize size={14} /> : <Maximize size={14} />}
              </ActionBtn>
              <ActionBtn onClick={() => setOpen(false)} $danger title={t('chat.close_window')}>
                <X size={14} />
              </ActionBtn>
            </HeaderRight>
          </Header>

          {/* Mode Tabs */}
          <Tabs>
            <Tab $active={mode === 'ai'} onClick={() => setMode('ai')}>
              <Bot size={13} /> {t('chat.tab_ai')}
            </Tab>
            <Tab $active={mode === 'support'} onClick={() => { setMode('support'); setHasUnread(false) }}>
              <Headphones size={13} /> {t('chat.tab_support')}
              {hasUnread && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />}
            </Tab>
          </Tabs>

          {/* ── AI Chat Mode ── */}
          {mode === 'ai' && (
            <>
              <Messages>
                {aiMessages.length === 0 && (
                  <WelcomeCard>
                    <WelcomeEmoji>🎮</WelcomeEmoji>
                    <WelcomeTitle>{t('chat.welcome_title')}</WelcomeTitle>
                    <WelcomeText dangerouslySetInnerHTML={{ __html: t('chat.welcome_text').replace(/\n/g, '<br/>') }} />
                    <QuickBtns>
                      {QUICK_QUESTIONS.map(q => <QuickBtn key={q} onClick={() => sendAiMessage(q)}>{q}</QuickBtn>)}
                    </QuickBtns>
                  </WelcomeCard>
                )}
                {aiMessages.map((msg, i) => (
                  <BubbleWrap key={i} $isUser={msg.role === 'user'}>
                    <Bubble $role={(msg as any)._isError ? 'error' : msg.role}>
                      {(msg as any)._isError && <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 2 }} />}
                      {msg.attachments?.map((att, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>
                          {att.type === 'image' && (
                            <AttachmentImage src={`data:${att.mimeType};base64,${att.data}`} onClick={() => setLightboxUrl(`data:${att.mimeType};base64,${att.data}`)} />
                          )}
                          {att.type === 'audio' && (
                            <audio controls src={`data:${att.mimeType};base64,${att.data}`} style={{ height: 36, maxWidth: 220 }} />
                          )}
                        </div>
                      ))}
                      {msg.content !== '[Image Only]' && msg.content !== '[Voice Message]' && msg.content !== '[Attachments]' && msg.content}
                    </Bubble>
                    <MsgActions className="msg-actions" $isUser={msg.role === 'user'}>
                      <MsgActionBtn
                        onClick={() => handleCopy(msg.content, `ai-${i}`)}
                        title={copiedId === `ai-${i}` ? 'Copied!' : 'Copy message'}
                        style={copiedId === `ai-${i}` ? { color: '#4ade80', background: 'rgba(74,222,128,0.1)' } : {}}
                      >
                        {copiedId === `ai-${i}` ? <Check size={13} /> : <Copy size={13} />}
                      </MsgActionBtn>
                      {msg.role === 'user' && (
                        <MsgActionBtn $danger onClick={() => deleteAiMessage(i)} title={t('chat.delete_confirm')}>
                          <Trash2 size={13} />
                        </MsgActionBtn>
                      )}
                      {msg.role === 'assistant' && !(msg as any)._isError && (
                        <MsgActionBtn onClick={() => regenerateAiMessage(i)} title="Regenerate">
                          <RotateCcw size={13} />
                        </MsgActionBtn>
                      )}
                    </MsgActions>
                  </BubbleWrap>
                ))}
                {aiLoading && <TypingBubble $role="assistant"><Dot $delay={0} /><Dot $delay={200} /><Dot $delay={400} /></TypingBubble>}
                <div ref={messagesEndRef} />
              </Messages>

              <InputArea>
                {/* Attachment previews */}
                {aiAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 8 }}>
                    {aiAttachments.map(att => (
                      att.type === 'image' ? (
                        <PreviewWrap key={att.id} style={{ flexShrink: 0 }}>
                          <PreviewImg src={att.url} />
                          <RemovePreviewBtn onClick={() => removeAiAttachment(att.id)}><X size={12} /></RemovePreviewBtn>
                        </PreviewWrap>
                      ) : (
                        <div key={att.id} style={{ flexShrink: 0, width: 220, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 12, minWidth: 0, position: 'relative' }}>
                          <audio controls src={att.url} style={{ height: 32, flex: 1, minWidth: 0, width: '100%' }} />
                          <RemovePreviewBtn style={{ top: -6, right: -6 }} onClick={() => removeAiAttachment(att.id)}><Trash2 size={12} /></RemovePreviewBtn>
                        </div>
                      )
                    ))}
                  </div>
                )}

                {/* New mockup-style input box */}
                <InputBox>
                  {isRecording && (
                    <VoiceIndicator>
                      <RecordingDot /> Recording... {formatTime(recordingTime)}
                    </VoiceIndicator>
                  )}
                  {!isRecording && features.enable_text ? (
                    <div style={{ position: 'relative' }}>
                      {mentionQuery !== null && filteredGames.length > 0 && (
                        <MentionMenu>
                          {filteredGames.map((g, i) => (
                            <MentionItem key={g} $active={i === mentionIndex} onClick={() => insertMention(g)}>{g}</MentionItem>
                          ))}
                        </MentionMenu>
                      )}
                      <TextArea
                        ref={aiTextRef}
                        placeholder={t('chat.input_placeholder_ai')}
                        value={aiInput}
                        onChange={handleAiInputChange}
                        onKeyDown={handleAiInputKeyDown}
                        onPaste={handlePaste}
                        rows={1}
                        disabled={aiLoading}
                      />
                    </div>
                  ) : null}

                  <InputToolbar>
                    <InputToolbarLeft>
                      <ModelPill>
                        <span style={{ fontSize: 13 }}>✦</span>
                        {activeModelLabel}
                      </ModelPill>
                      {features.enable_image && (
                        <>
                          <input type="file" accept="image/*" multiple ref={aiFileInputRef} style={{ display: 'none' }} onChange={handleAiImageSelect} />
                          <ToolbarIconBtn onClick={() => aiFileInputRef.current?.click()} disabled={aiLoading || isRecording || aiAttachments.length >= 4} title="Attach Image">
                            <ImageIcon size={15} />
                          </ToolbarIconBtn>
                        </>
                      )}
                      <ToolbarIconBtn title="More options">
                        <span style={{ fontSize: 14, letterSpacing: 1 }}>···</span>
                      </ToolbarIconBtn>
                    </InputToolbarLeft>
                    <InputToolbarRight>
                      {features.enable_voice && !isRecording && (
                        <ToolbarIconBtn
                          onClick={toggleRecording}
                          disabled={aiLoading || (!isRecording && aiAttachments.length >= 4)}
                          title="Record Voice"
                        >
                          <Mic size={15} />
                        </ToolbarIconBtn>
                      )}
                      {(features.enable_text || aiAttachments.length > 0) && !isRecording && (
                        <SendBtn
                          onClick={() => aiLoading ? handleStopAi() : sendAiMessage()}
                          disabled={(!aiInput.trim() && aiAttachments.length === 0 && !aiLoading)}
                          $loading={false}
                        >
                          {aiLoading ? <Square size={14} fill="currentColor" /> : <Send size={14} />}
                        </SendBtn>
                      )}
                      {isRecording && (
                        <SendBtn onClick={toggleRecording} $isRecord title="Stop Recording">
                          <Square size={14} fill="#fff" />
                        </SendBtn>
                      )}
                    </InputToolbarRight>
                  </InputToolbar>
                </InputBox>
                <InputFooterText>Labot อาจเกิดข้อผิดพลาด กรุณาใช้ด้วยวิจารณญาณ</InputFooterText>
              </InputArea>
            </>
          )}

          {/* ── Support Chat Mode ── */}
          {mode === 'support' && (
            <>
              <Messages>
                {/* Naming Phase */}
                {supportPhase === 'naming' && (
                  <NameForm>
                    <WelcomeEmoji>🎧</WelcomeEmoji>
                    <WelcomeTitle>{t('chat.support_title')}</WelcomeTitle>
                    <WelcomeText style={{ marginBottom: 14 }} dangerouslySetInnerHTML={{ __html: t('chat.welcome_text').replace(/\n/g, '<br/>') }} />
                    <NameInput
                      ref={nameInputRef}
                      placeholder={t('chat.name_placeholder')}
                      value={nameInput}
                      onChange={e => setNameInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') supportTextRef.current?.focus() }}
                      $shake={nameInputShake}
                    />
                    <QuickBtns style={{ marginTop: 16 }}>
                      <SupportChoiceBtn onClick={() => {
                        setSupportInput(t('chat.admin_template1'))
                        setTimeout(() => {
                          const el = supportTextRef.current
                          if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
                        }, 50)
                      }}>
                        <ChoiceTitle>{t('chat.admin_c1_title')}</ChoiceTitle>
                        <ChoiceDesc>{t('chat.admin_c1_desc')}</ChoiceDesc>
                      </SupportChoiceBtn>
                      <SupportChoiceBtn onClick={() => {
                        setSupportInput(t('chat.admin_template2'))
                        setTimeout(() => {
                          const el = supportTextRef.current
                          if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
                        }, 50)
                      }}>
                        <ChoiceTitle>{t('chat.admin_c2_title')}</ChoiceTitle>
                        <ChoiceDesc>{t('chat.admin_c2_desc')}</ChoiceDesc>
                      </SupportChoiceBtn>
                      <SupportChoiceBtn onClick={() => {
                        setSupportInput(t('chat.admin_template3'))
                        setTimeout(() => {
                          const el = supportTextRef.current
                          if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 200) + 'px'; el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
                        }, 50)
                      }}>
                        <ChoiceTitle>{t('chat.admin_c3_title')}</ChoiceTitle>
                        <ChoiceDesc>{t('chat.admin_c3_desc')}</ChoiceDesc>
                      </SupportChoiceBtn>
                    </QuickBtns>
                  </NameForm>
                )}

                {/* Chat messages */}
                {supportPhase === 'chatting' && supportMessages.length === 0 && (
                  <Bubble $role="system">{t('chat.system_waiting')}</Bubble>
                )}
                {supportMessages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'admin' && <RoleLabel $admin>Admin</RoleLabel>}
                    <BubbleWrap $isUser={msg.role === 'user'}>
                      <Bubble $role={msg.role}>
                        {/* Debug info */}
                        {msg.content && renderMessageContent(msg.content)}
                        {msg.attachment_url && msg.attachment_type === 'image' && (
                          <AttachmentImage src={msg.attachment_url} onClick={() => setLightboxUrl(msg.attachment_url!)} />
                        )}
                        {msg.attachment_url && msg.attachment_type === 'audio' && (
                          <div style={{ marginTop: 4 }}>
                            <audio controls src={msg.attachment_url} style={{ width: '100%', minWidth: 200, maxWidth: 240, height: 36, display: 'block' }} />
                          </div>
                        )}
                        {msg.attachment_url && msg.attachment_type === 'file' && (
                          <AttachmentFile href={msg.attachment_url} target="_blank" rel="noopener noreferrer">
                            <File size={14} /> {t('chat.download_file')}
                          </AttachmentFile>
                        )}
                      </Bubble>
                      <MsgActions className="msg-actions" $isUser={msg.role === 'user'}>
                        <MsgActionBtn
                          onClick={() => handleCopy(msg.content || msg.attachment_url || '', `sup-${msg.id}`)}
                          title={copiedId === `sup-${msg.id}` ? 'Copied!' : 'Copy'}
                          style={copiedId === `sup-${msg.id}` ? { color: '#4ade80', background: 'rgba(74,222,128,0.1)' } : {}}
                        >
                          {copiedId === `sup-${msg.id}` ? <Check size={13} /> : <Copy size={13} />}
                        </MsgActionBtn>
                        <MsgActionBtn onClick={() => replyToSupportMessage(msg.content || 'Attachment')} title="Reply">
                          <Reply size={13} />
                        </MsgActionBtn>
                        {msg.role === 'user' && (
                          <MsgActionBtn $danger onClick={() => deleteSupportMessage(msg.id)} title={t('chat.delete_confirm')}>
                            <Trash2 size={13} />
                          </MsgActionBtn>
                        )}
                      </MsgActions>
                    </BubbleWrap>
                  </div>
                ))}
                {supportPhase === 'chatting' && <div ref={messagesEndRef} />}
                {supportPhase === 'naming' && <div ref={messagesEndRef} />}

                {/* Reset button */}
                {supportPhase === 'chatting' && (
                  <button onClick={resetSupport} style={{ alignSelf: 'center', marginTop: 4, padding: '5px 12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: 'rgba(148,163,184,0.4)', fontSize: 11, cursor: 'pointer' }}>
                    {t('chat.reset_button')}
                  </button>
                )}
              </Messages>

              <InputArea style={{ flexDirection: 'column', gap: 0, padding: 0 }}>
                {supportReplyingTo && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(124,58,237,0.1)', padding: '8px 16px', borderBottom: '1px solid rgba(124,58,237,0.2)', width: '100%', fontSize: 12, color: '#c4b5fd' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <strong style={{ opacity: 0.8 }}>ตอบกลับ:</strong> {supportReplyingTo}
                    </div>
                    <button onClick={() => setSupportReplyingTo(null)} style={{ background: 'none', border: 'none', color: '#c4b5fd', cursor: 'pointer', padding: 4 }}><X size={14}/></button>
                  </div>
                )}
                <div style={{ padding: '12px 16px', width: '100%', display: 'flex', flexDirection: 'column' }}>
                  {supportAttachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 8 }}>
                    {supportAttachments.map(att => (
                      att.type === 'image' ? (
                        <PreviewWrap key={att.id} style={{ flexShrink: 0 }}>
                          <PreviewImg src={att.url} />
                          <RemovePreviewBtn onClick={() => removeSupportAttachment(att.id)}><X size={12} /></RemovePreviewBtn>
                        </PreviewWrap>
                      ) : (
                        <div key={att.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.2)', padding: '4px 10px', borderRadius: 12, minWidth: 0, position: 'relative', maxWidth: 200 }}>
                          <audio controls src={att.url} style={{ height: 30, flex: 1, minWidth: 0 }} />
                          <RemovePreviewBtn style={{ top: -6, right: -6 }} onClick={() => removeSupportAttachment(att.id)}><Trash2 size={12} /></RemovePreviewBtn>
                        </div>
                      )
                    ))}
                  </div>
                )}

                <input type="file" accept="image/*" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={handleSupportFileUpload} />

                <InputBox>
                  {isSupportRecording && (
                    <VoiceIndicator>
                      <RecordingDot /> Recording... {formatTime(supportRecordingTime)}
                    </VoiceIndicator>
                  )}
                  {!isSupportRecording && (
                    <div style={{ position: 'relative' }}>
                      {supportMentionQuery !== null && filteredGamesSupport.length > 0 && (
                        <MentionMenu>
                          {filteredGamesSupport.map((g, i) => (
                            <MentionItem key={g} $active={i === supportMentionIndex} onClick={() => insertSupportMention(g)}>{g}</MentionItem>
                          ))}
                        </MentionMenu>
                      )}
                      <TextArea
                        ref={supportTextRef}
                        placeholder={supportPhase === 'naming' ? t('chat.input_placeholder_support_naming') : t('chat.input_placeholder_ai')}
                        value={supportInput}
                        onChange={handleSupportInputChange}
                        onKeyDown={handleSupportKeyDown}
                        onPaste={handleSupportPaste}
                        rows={1}
                        disabled={supportSending}
                      />
                    </div>
                  )}
                  <InputToolbar>
                    <InputToolbarLeft>
                      <ToolbarIconBtn
                        onClick={() => fileInputRef.current?.click()}
                        disabled={supportSending || isSupportRecording || supportAttachments.length >= 6}
                        title="Attach Image"
                      >
                        <ImageIcon size={15} />
                      </ToolbarIconBtn>
                      {features.enable_voice && !isSupportRecording && (
                        <ToolbarIconBtn
                          onClick={toggleSupportRecording}
                          disabled={supportSending || (!isSupportRecording && supportAttachments.length >= 6)}
                          title="Voice Message"
                        >
                          <Mic size={15} />
                        </ToolbarIconBtn>
                      )}
                    </InputToolbarLeft>
                    <InputToolbarRight>
                      <SendBtn
                        onClick={isSupportRecording ? toggleSupportRecording : sendSupportMessage}
                        $loading={supportSending}
                        $isRecord={isSupportRecording}
                        disabled={supportSending || (!supportInput.trim() && supportAttachments.length === 0 && !isSupportRecording)}
                        title={isSupportRecording ? "Stop Recording" : "Send"}
                      >
                        {supportSending ? <Spinner /> : isSupportRecording ? <Square size={14} fill="#fff" /> : <Send size={14} />}
                      </SendBtn>
                    </InputToolbarRight>
                  </InputToolbar>
                </InputBox>
                <InputFooterText>Labot อาจเกิดข้อผิดพลาด กรุณาใช้ด้วยวิจารณญาณ</InputFooterText>
                </div>
              </InputArea>
            </>
          )}
        </Window>
      )}

      {/* Floating Button */}
      <FloatBtn $open={open} onClick={() => setOpen(v => !v)} title={open ? t('chat.chat_button_close') : t('chat.chat_button_open')}>
        {open ? <ChevronDown size={24} /> : <MessageCircle size={24} />}
        {!open && hasUnread && <UnreadDot>!</UnreadDot>}
      </FloatBtn>

      {/* Lightbox */}
      {lightboxUrl && (
        <LightboxOverlay onClick={() => setLightboxUrl(null)}>
          <LightboxClose onClick={() => setLightboxUrl(null)}>✕</LightboxClose>
          <LightboxImg src={lightboxUrl} onClick={e => e.stopPropagation()} />
        </LightboxOverlay>
      )}
    </Wrap>
  )
}
