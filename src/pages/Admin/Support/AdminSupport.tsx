import { useState, useEffect, useRef } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { MessageSquare, Send, RefreshCw, Trash2, Clock, Paperclip, File, Mic, Square, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'

// ── Types ─────────────────────────────────────────────────────────
interface SupportSession {
  id: string
  session_token: string
  user_label: string
  platform: string
  created_at: string
  last_seen: string
  is_read_by_admin: boolean
  message_count: number
}
interface SupportMessage {
  id: string
  session_id: string
  role: 'user' | 'admin'
  content: string
  created_at: string
  attachment_url?: string
  attachment_type?: string
}

// ── Helpers ───────────────────────────────────────────────────────
const PLATFORM_ICON: Record<string, string> = {
  windows: '🪟', macos: '🍎', ios: '📱', android: '🤖', linux: '🐧', other: '🌐'
}
function isActive(lastSeen: string) {
  return Date.now() - new Date(lastSeen).getTime() < 10 * 60 * 1000 // 10 min
}
function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const secs = s % 60
  return `${m}:${secs.toString().padStart(2, '0')}`
}

// ── Animations ────────────────────────────────────────────────────
const fadeIn = keyframes`from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); }`
const pulse = keyframes`0%, 100% { opacity: 1; } 50% { opacity: 0.5; }`

// ── Layout ────────────────────────────────────────────────────────
const Page = styled.div`
  display: grid; grid-template-columns: 320px 1fr; gap: 0; 
  height: calc(100vh - 108px); border-radius: 16px; overflow: hidden; border: 1px solid rgba(124,58,237,0.15);
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`

// ── Left: Session List ─────────────────────────────────────────────
const SessionList = styled.div<{ $hideOnMobile?: boolean }>`
  background: rgba(12,12,22,0.95); border-right: 1px solid rgba(124,58,237,0.12);
  display: flex; flex-direction: column; overflow: hidden;
  @media (max-width: 768px) { display: ${p => p.$hideOnMobile ? 'none' : 'flex'}; border-right: none; }
`
const ListHeader = styled.div`
  padding: 16px; border-bottom: 1px solid rgba(124,58,237,0.1);
  display: flex; align-items: center; justify-content: space-between;
`
const ListTitle = styled.h2`font-family: 'Noto Sans Lao', sans-serif; font-size:15px; font-weight:700; color:#fff; display:flex; align-items:center; gap:8px;`
const RefreshBtn = styled.button`
  background: none; border: 1px solid rgba(124,58,237,0.2); border-radius:8px; color:rgba(148,163,184,0.7);
  padding:6px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all 0.15s;
  &:hover { background:rgba(124,58,237,0.1); color:#fff; }
`
const SessionItems = styled.div`flex:1; overflow-y:auto; &::-webkit-scrollbar { width:3px; } &::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.3); border-radius:2px; }`
const SessionCard = styled.div<{ $active: boolean; $selected: boolean }>`
  padding: 12px 14px; cursor: pointer; transition: background 0.15s;
  border-bottom: 1px solid rgba(124,58,237,0.06);
  background: ${p => p.$selected ? 'rgba(124,58,237,0.15)' : 'transparent'};
  border-left: 3px solid ${p => p.$selected ? '#7c3aed' : 'transparent'};
  &:hover { background: rgba(124,58,237,0.1); }
  animation: ${fadeIn} 0.3s ease;
`
const SessionTop = styled.div`display:flex; align-items:center; gap:8px; margin-bottom:5px;`
const ActiveDot = styled.div<{ $on: boolean }>`
  width: 8px; height: 8px; border-radius: 50%; flex-shrink:0;
  background: ${p => p.$on ? '#22c55e' : 'rgba(148,163,184,0.3)'};
  ${p => p.$on ? css`box-shadow: 0 0 6px #22c55e; animation: ${pulse} 2s ease-in-out infinite;` : ''}
`
const UserName = styled.div`font-size:13px; font-weight:600; color:#e2e8f0; flex:1;`
const UnreadBadge = styled.div`
  width:18px; height:18px; border-radius:50%; background:#7c3aed;
  display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:900; color:#fff;
`
const SessionMeta = styled.div`font-size:11px; color:rgba(148,163,184,0.5); display:flex; align-items:center; gap:6px;`
const EmptyState = styled.div`
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  color:rgba(148,163,184,0.4); font-size:13px; gap:8px; text-align:center; padding:24px;
`

// ── Right: Chat Thread ─────────────────────────────────────────────
const ChatPanel = styled.div<{ $hideOnMobile?: boolean }>`
  background: rgba(8,8,20,0.95); display:flex; flex-direction:column; min-height:0; min-width:0; overflow:hidden;
  @media (max-width: 768px) { display: ${p => p.$hideOnMobile ? 'none' : 'flex'}; }
`
const ChatHeader = styled.div`
  padding: 14px 18px; border-bottom: 1px solid rgba(124,58,237,0.1);
  display: flex; align-items: center; gap: 10px;
  background: rgba(124,58,237,0.06);
`
const ChatTitle = styled.div`font-family: 'Noto Sans Lao', sans-serif; font-size:15px; font-weight:700; color:#fff;`
const ChatMeta = styled.div`font-size:12px; color:rgba(148,163,184,0.6);`
const Messages = styled.div`
  flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:10px;
  scroll-behavior:smooth;
  &::-webkit-scrollbar { width:4px; }
  &::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.3); border-radius:2px; }
`
const Bubble = styled.div<{ $role: 'user' | 'admin' }>`
  max-width:85%; padding:10px 14px; font-size:13.5px; line-height:1.6; white-space:pre-wrap; word-break:break-word;
  align-self: ${p => p.$role === 'admin' ? 'flex-end' : 'flex-start'};
  border-radius: ${p => p.$role === 'admin' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'};
  background: ${p => p.$role === 'admin' ? 'linear-gradient(135deg,#7c3aed,#9d5cf5)' : 'rgba(255,255,255,0.06)'};
  border: ${p => p.$role === 'admin' ? 'none' : '1px solid rgba(124,58,237,0.15)'};
  color: #e2e8f0; animation: ${fadeIn} 0.2s ease;
`
const BubbleLabel = styled.div<{ $admin?: boolean }>`
  font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px;
  color: ${p => p.$admin ? '#c4b5fd' : 'rgba(148,163,184,0.5)'};
  align-self: ${p => p.$admin ? 'flex-end' : 'flex-start'};
`
const BubbleWrap = styled.div<{ $admin?: boolean }>`
  display: flex; align-items: center; gap: 8px; width: 100%;
  justify-content: flex-start;
  flex-direction: ${p => p.$admin ? 'row-reverse' : 'row'};
`
const MsgDeleteBtn = styled.button`
  background: none; border: none; color: rgba(148,163,184,0.3); cursor: pointer; padding: 4px; border-radius: 6px;
  transition: all 0.2s; display: flex; align-items: center; justify-content: center; opacity: 0; flex-shrink: 0;
  &:hover { color: #ef4444; background: rgba(239,68,68,0.1); }
  ${BubbleWrap}:hover & { opacity: 1; }
`
const TimeLabel = styled.div<{ $right?: boolean }>`
  font-size:10px; color:rgba(148,163,184,0.35); margin-top:2px;
  align-self: ${p => p.$right ? 'flex-end' : 'flex-start'};
`
const AttachBtn = styled.button`
  width: 40px; height: 40px; border-radius: 10px; border: none;
  background: rgba(255,255,255,0.05); color: rgba(148,163,184,0.7);
  display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; flex-shrink: 0;
  border: 1px solid rgba(124,58,237,0.2);
  &:hover { background: rgba(124,58,237,0.1); color: #c4b5fd; border-color: rgba(124,58,237,0.4); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`
const AttachmentImage = styled.img`max-width: 100%; border-radius: 8px; margin-top: 6px; cursor: zoom-in;`
const LightboxOverlay = styled.div`
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.85); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: ${fadeIn} 0.18s ease; cursor: zoom-out;
`
const LightboxImg = styled.img`
  max-width: 90vw; max-height: 90vh; border-radius: 12px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.8); cursor: default; object-fit: contain;
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
const InputArea = styled.div`padding:12px 16px; border-top:1px solid rgba(124,58,237,0.1); display:flex; gap:8px; align-items:flex-end;`
const TextArea = styled.textarea`
  flex:1; background:rgba(255,255,255,0.05); border:1px solid rgba(124,58,237,0.2); border-radius:12px;
  color:#e2e8f0; font-size:13.5px; padding:10px 13px; font-family: 'Noto Sans Lao', sans-serif;
  resize:none; outline:none; max-height:120px; min-height:40px; line-height:1.5; transition:border-color 0.2s;
  &::placeholder { color:rgba(148,163,184,0.4); }
  &:focus { border-color:rgba(124,58,237,0.5); }
`
const SendBtn = styled.button`
  padding:10px 18px; border-radius:10px; border:none; background:linear-gradient(135deg,#7c3aed,#06b6d4);
  color:#fff; font-weight:700; font-size:13px; cursor:pointer; display:flex; align-items:center; gap:6px;
  transition:opacity 0.2s; flex-shrink:0;
  &:hover:not(:disabled) { opacity:0.9; }
  &:disabled { opacity:0.4; cursor:not-allowed; }
`
const DeleteBtn = styled.button`
  background:none; border:1px solid rgba(239,68,68,0.2); border-radius:8px;
  color:rgba(239,68,68,0.6); padding:6px 10px; cursor:pointer; font-size:12px; display:flex; align-items:center; gap:4px;
  transition:all 0.15s; &:hover { background:rgba(239,68,68,0.1); color:#ef4444; }
`
const NoSession = styled.div`
  flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center;
  color:rgba(148,163,184,0.4); font-size:14px; gap:10px;
`

// ── Notification Settings ─────────────────────────────────────────
const SettingsRow = styled.div`
  display: grid;
  grid-template-columns: auto 2fr auto; 
  align-items:center; gap:8px;
  @media (max-width: 600px) {
    grid-template-columns: 2fr;
  }
`
const EmailInput = styled.input`
  flex:1; background:rgba(15,23,42,0.6); border:1px solid rgba(255,255,255,0.1); border-radius:8px;
  color:#fff; padding:8px 12px; font-size:13px; outline:none;
  &:focus { border-color:#7c3aed; }
`
const SaveBtn = styled.button`
  padding:8px 14px; background:linear-gradient(135deg,#7c3aed,#06b6d4); border:none; border-radius:8px;
  color:#fff; font-size:12px; font-weight:700; cursor:pointer; white-space:nowrap;
  &:hover { opacity:0.9; }
`
const PreviewWrap = styled.div`
  position: relative; width: 60px; height: 60px; border-radius: 8px; overflow: hidden; border: 1px solid rgba(124,58,237,0.4);
`
const PreviewImg = styled.img`width: 100%; height: 100%; object-fit: cover;`
const RemovePreviewBtn = styled.button`
  position: absolute; top: -4px; right: -4px; background: #ef4444; border: none; border-radius: 50%;
  width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; color: white;
  cursor: pointer; font-size: 12px; z-index: 10;
`
const VoiceIndicator = styled.div`
  flex: 1; padding: 10px 14px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3);
  border-radius: 12px; color: #fca5a5; font-size: 13.5px; display: flex; align-items: center; gap: 8px;
  animation: ${pulse} 2s infinite;
`
const MentionMenu = styled.ul`
  position: absolute; bottom: 100%; left: 0; right: 0; max-height: 200px;
  background: #1e1e24; border: 1px solid rgba(124,58,237,0.3); border-radius: 12px;
  margin: 0 14px 8px; padding: 4px; overflow-y: auto; list-style: none;
  box-shadow: 0 -4px 12px rgba(0,0,0,0.4); z-index: 10;
`
const MentionItem = styled.li<{ $active?: boolean }>`
  padding: 8px 12px; font-size: 13px; color: #e2e8f0; cursor: pointer; border-radius: 8px;
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  &:hover { background: rgba(124,58,237,0.2); }
`

// ══════════════════════════════════════════════════════════════════
export default function AdminSupport() {
  const [sessions, setSessions] = useState<SupportSession[]>([])
  const [selected, setSelected] = useState<SupportSession | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [replyInput, setReplyInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notifyEmail, setNotifyEmail] = useState('peun955@gmail.com')
  const [notifyEnabled, setNotifyEnabled] = useState(true)
  const [savingEmail, setSavingEmail] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const realtimeRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [games, setGames] = useState<{ id: string, name: string }[]>([])
  const [showMention, setShowMention] = useState(false)
  const [mentionFilter, setMentionFilter] = useState('')
  const [mentionIndex, setMentionIndex] = useState(0)

  const [attachments, setAttachments] = useState<{ id: string, file?: File, blob?: Blob, url: string, type: 'image' | 'audio' | 'file', name?: string }[]>([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const timerRef = useRef<number | null>(null)

  // ── Fetch sessions ───────────────────────────────────────────────
  const fetchSessions = async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('support_sessions').select('*').order('last_seen', { ascending: false })
    setSessions(data || [])
    setLoading(false)
  }

  // ── Fetch notification settings ──────────────────────────────────
  const fetchNotifySettings = async () => {
    const { data } = await (supabase as any).from('notification_settings').select('*').limit(1).single()
    if (data) { setNotifyEmail(data.notify_email); setNotifyEnabled(data.notify_enabled) }
  }

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('id, name')
    if (data) setGames(data)
  }

  useEffect(() => { fetchSessions(); fetchNotifySettings(); fetchGames() }, [])

  // ── Subscribe to new sessions ────────────────────────────────────
  useEffect(() => {
    const ch = (supabase as any)
      .channel('admin_support_sessions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_sessions' }, () => {
        fetchSessions()
      })
      .subscribe()
    return () => ch.unsubscribe()
  }, [])

  // ── Open session ─────────────────────────────────────────────────
  const openSession = async (session: SupportSession) => {
    setSelected(session)
    setReplyInput('')

    // Load messages
    const { data: msgs } = await (supabase as any)
      .from('support_messages').select('*').eq('session_id', session.id).order('created_at', { ascending: true })
    setMessages(msgs || [])

    // Mark as read
    await (supabase as any).from('support_sessions').update({ is_read_by_admin: true }).eq('id', session.id)
    setSessions(prev => prev.map(s => s.id === session.id ? { ...s, is_read_by_admin: true } : s))

    // Subscribe to new messages in this session
    if (realtimeRef.current) realtimeRef.current.unsubscribe()
    realtimeRef.current = (supabase as any)
      .channel(`admin_msgs_${session.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'support_messages',
        filter: `session_id=eq.${session.id}`
      }, (payload: any) => {
        setMessages(prev => prev.find(m => m.id === payload.new.id) ? prev : [...prev, payload.new])
      })
      .subscribe()
  }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  // ── Send reply ───────────────────────────────────────────────────
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const att = prev.find(a => a.id === id)
      if (att) URL.revokeObjectURL(att.url)
      return prev.filter(a => a.id !== id)
    })
  }

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) clearInterval(timerRef.current)
    } else {
      if (attachments.length >= 6) { alert('แนบได้สูงสุด 6 ไฟล์'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        mediaRecorderRef.current = new MediaRecorder(stream)
        audioChunksRef.current = []
        setRecordingTime(0)
        
        mediaRecorderRef.current.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data)
        }
        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const url = URL.createObjectURL(audioBlob)
          setAttachments(prev => [...prev, {
            id: Math.random().toString(36).slice(2, 11),
            blob: audioBlob,
            url,
            type: 'audio'
          }])
          stream.getTracks().forEach(track => track.stop())
        }
        
        mediaRecorderRef.current.start()
        setIsRecording(true)
        timerRef.current = window.setInterval(() => setRecordingTime(prev => prev + 1), 1000)
      } catch (e) {
        alert('ไม่สามารถเข้าถึงไมโครโฟนได้')
      }
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (attachments.length >= 6) { alert('แนบได้สูงสุด 6 ไฟล์'); return }
    
    filesArray.slice(0, 6 - attachments.length).forEach(file => {
      if (file.size > 5 * 1024 * 1024) { alert('ไฟล์มีขนาดเกิน 5MB'); return }
      const url = URL.createObjectURL(file)
      setAttachments(prev => [...prev, {
        id: Math.random().toString(36).slice(2, 11),
        file,
        url,
        type: file.type.startsWith('image/') ? 'image' : 'file',
        name: file.name
      }])
    })
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (attachments.length >= 6) return
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) {
          const url = URL.createObjectURL(file)
          setAttachments(prev => [...prev, {
            id: Math.random().toString(36).slice(2, 11),
            file,
            url,
            type: 'image',
            name: file.name
          }])
        }
        break
      }
    }
  }

  // Mention logic
  const filteredGames = games.filter(g => g.name.toLowerCase().includes(mentionFilter.toLowerCase()))
  
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setReplyInput(val)
    
    const lastAtPos = val.lastIndexOf('@')
    if (lastAtPos !== -1) {
      const textAfterAt = val.substring(lastAtPos + 1)
      if (!textAfterAt.includes(' ')) {
        setShowMention(true)
        setMentionFilter(textAfterAt)
        setMentionIndex(0)
        return
      }
    }
    setShowMention(false)
  }

  const insertMention = (game: { id: string, name: string }) => {
    const lastAtPos = replyInput.lastIndexOf('@')
    if (lastAtPos !== -1) {
      const newVal = replyInput.substring(0, lastAtPos) + game.name + ' '
      setReplyInput(newVal)
    }
    setShowMention(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMention) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex(p => Math.min(p + 1, filteredGames.length - 1)) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex(p => Math.max(p - 1, 0)) }
      else if (e.key === 'Enter') { e.preventDefault(); insertMention(filteredGames[mentionIndex]) }
      else if (e.key === 'Escape') { setShowMention(false) }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply() }
  }

  const sendReply = async () => {
    const content = replyInput.trim()
    if (!selected || (!content && attachments.length === 0) || sending) return
    setReplyInput('')
    setSending(true)

    // Send text
    if (content) {
      const { data: msg } = await (supabase as any)
        .from('support_messages').insert({ session_id: selected.id, role: 'admin', content }).select('*').single()
      if (msg) setMessages(prev => [...prev, msg])
    }

    // Upload attachments
    for (const att of attachments) {
      let uploadFile: Blob | null = att.file ?? null
      if (!uploadFile && att.blob) {
        uploadFile = att.blob
      }
      if (!uploadFile) continue
      const uploadName = att.file?.name ?? `voice_${Date.now()}.webm`

      const fileExt = uploadName.split('.').pop()
      const fileName = `${selected.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`

      const { error } = await supabase.storage.from('chat_attachments').upload(fileName, uploadFile, {
        contentType: att.type === 'audio' ? 'audio/webm' : (uploadFile as any).type
      })
      if (error) { alert('อัปโหลดไฟล์ไม่สำเร็จ'); continue }
      
      const { data: urlData } = supabase.storage.from('chat_attachments').getPublicUrl(fileName)
      const type = att.type === 'audio' ? 'audio' : (uploadFile.type.startsWith('image/') ? 'image' : 'file')

      const { data: msg } = await (supabase as any)
        .from('support_messages').insert({
          session_id: selected.id,
          role: 'admin',
          content: att.type === 'audio' ? '🎤 Voice Message' : `แนบไฟล์: ${uploadName}`,
          attachment_url: urlData.publicUrl,
          attachment_type: type
        }).select('*').single()

      if (msg) setMessages(prev => [...prev, msg])
    }

    attachments.forEach(att => URL.revokeObjectURL(att.url))
    setAttachments([])

    await (supabase as any).from('support_sessions').update({
      last_seen: new Date().toISOString(),
      is_read_by_admin: true,
      message_count: (selected.message_count || 0) + 1
    }).eq('id', selected.id)
    
    fetchSessions()
    setSending(false)
  }

  // ── Delete session ───────────────────────────────────────────────
  const deleteSession = async (sessionId: string) => {
    if (!confirm('ลบ session นี้? ข้อความทั้งหมดจะหายไป')) return
    await (supabase as any).from('support_sessions').delete().eq('id', sessionId)
    if (selected?.id === sessionId) { setSelected(null); setMessages([]) }
    fetchSessions()
  }

  // ── Delete individual message ────────────────────────────────────
  const deleteMessage = async (msgId: string) => {
    if (!confirm('ลบข้อความนี้ใช่ไหม?')) return
    const deletedText = '🚫 ข้อความนี้ถูกลบแล้ว'

    await (supabase as any).from('support_messages').update({
      content: deletedText,
      attachment_url: null,
      attachment_type: null
    }).eq('id', msgId)

    setMessages(prev => prev.map(m => m.id === msgId ? {
      ...m,
      content: deletedText,
      attachment_url: undefined,
      attachment_type: undefined
    } : m))
  }

  // ── Save notification settings ───────────────────────────────────
  const saveNotifySettings = async () => {
    setSavingEmail(true)
    await (supabase as any).from('notification_settings').update({ notify_email: notifyEmail, notify_enabled: notifyEnabled, updated_at: new Date().toISOString() })
    setSavingEmail(false)
  }

  const unreadCount = sessions.filter(s => !s.is_read_by_admin).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h1 style={{ fontFamily: 'Noto Sans Lao', fontSize: 22, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageSquare size={22} style={{ color: '#7c3aed' }} />
          Support Chat
          {unreadCount > 0 && (
            <span style={{ padding: '2px 10px', background: '#7c3aed', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {unreadCount} ใหม่
            </span>
          )}
        </h1>
        <RefreshBtn onClick={fetchSessions} title="Refresh"><RefreshCw size={14} /></RefreshBtn>
      </div>

      {/* Notification Settings */}
      <div style={{ background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
          📧 การแจ้งเตือน Email
        </div>
        <SettingsRow>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#e2e8f0', cursor: 'pointer', flexShrink: 0 }}>
            <input type="checkbox" checked={notifyEnabled} onChange={e => setNotifyEnabled(e.target.checked)} />
            เปิดแจ้งเตือน
          </label>
          <EmailInput
            type="email"
            placeholder="อีเมลที่จะรับการแจ้งเตือน"
            value={notifyEmail}
            onChange={e => setNotifyEmail(e.target.value)}
            disabled={!notifyEnabled}
          />
          <SaveBtn onClick={saveNotifySettings} disabled={savingEmail}>
            {savingEmail ? 'กำลังบันทึก...' : 'บันทึก'}
          </SaveBtn>
        </SettingsRow>
      </div>

      <Page>
        {/* ── Left: Session List ── */}
        <SessionList $hideOnMobile={!!selected}>
          <ListHeader>
            <ListTitle><MessageSquare size={14} /> Sessions ({sessions.length})</ListTitle>
          </ListHeader>
          <SessionItems>
            {loading && <EmptyState>กำลังโหลด...</EmptyState>}
            {!loading && sessions.length === 0 && (
              <EmptyState>
                <MessageSquare size={32} style={{ opacity: 0.3 }} />
                ยังไม่มีผู้ใช้ติดต่อมา
              </EmptyState>
            )}
            {sessions.map(session => (
              <SessionCard
                key={session.id}
                $active={isActive(session.last_seen)}
                $selected={selected?.id === session.id}
                onClick={() => openSession(session)}
              >
                <SessionTop>
                  <ActiveDot $on={isActive(session.last_seen)} title={isActive(session.last_seen) ? 'Active' : 'Offline'} />
                  <UserName>{session.user_label}</UserName>
                  {!session.is_read_by_admin && <UnreadBadge>!</UnreadBadge>}
                </SessionTop>
                <SessionMeta>
                  <span>{PLATFORM_ICON[session.platform] || '🌐'} {session.platform}</span>
                  <span>·</span>
                  <span>{session.message_count} ข้อความ</span>
                  <span>·</span>
                  <span><Clock size={9} /> {fmtTime(session.last_seen)}</span>
                </SessionMeta>
              </SessionCard>
            ))}
          </SessionItems>
        </SessionList>

        {/* ── Right: Chat Thread ── */}
        <ChatPanel $hideOnMobile={!selected}>
          {!selected ? (
            <NoSession>
              <MessageSquare size={40} style={{ opacity: 0.2 }} />
              <div>เลือก session จากด้านซ้ายเพื่อดูข้อความ</div>
            </NoSession>
          ) : (
            <>
              <ChatHeader>
                <>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                    <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', marginRight: 12, padding: 4, display: 'flex' }} className="mobile-only-back">
                      <span style={{ fontSize: 20 }}>←</span>
                    </button>
                    <style>{`@media (min-width: 769px) { .mobile-only-back { display: none !important; } }`}</style>
                    <div>
                      <ChatTitle>
                        {PLATFORM_ICON[selected.platform]} {selected.user_label}
                        {isActive(selected.last_seen) && (
                          <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 600, color: '#22c55e' }}>● Online</span>
                        )}
                      </ChatTitle>
                      <ChatMeta>เริ่ม {fmtTime(selected.created_at)} · {selected.message_count} ข้อความ</ChatMeta>
                    </div>
                  </div>
                  <DeleteBtn onClick={() => deleteSession(selected.id)}>
                    <Trash2 size={12} /> ลบ
                  </DeleteBtn>
                </>
              </ChatHeader>

              <Messages>
                {messages.length === 0 && (
                  <div style={{ color: 'rgba(148,163,184,0.4)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
                    ยังไม่มีข้อความในห้องนี้
                  </div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'admin' ? 'flex-end' : 'flex-start' }}>
                    <BubbleLabel $admin={msg.role === 'admin'}>
                      {msg.role === 'admin' ? '👨‍💼 Admin (คุณ)' : `👤 ${selected.user_label}`}
                    </BubbleLabel>
                    <BubbleWrap $admin={msg.role === 'admin'}>
                      <Bubble $role={msg.role}>
                        {msg.content && msg.attachment_type !== 'audio' && msg.content}
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
                            <File size={14} /> ดาวน์โหลดไฟล์
                          </AttachmentFile>
                        )}
                      </Bubble>
                      <MsgDeleteBtn onClick={() => deleteMessage(msg.id)} title="ลบข้อความ">
                        <Trash2 size={13} />
                      </MsgDeleteBtn>
                    </BubbleWrap>
                    <TimeLabel $right={msg.role === 'admin'}>{fmtTime(msg.created_at)}</TimeLabel>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </Messages>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 16px', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                  {attachments.map(att => (
                    att.type === 'image' ? (
                      <PreviewWrap key={att.id} style={{ flexShrink: 0 }}>
                        <PreviewImg src={att.url} />
                        <RemovePreviewBtn onClick={() => removeAttachment(att.id)}><X size={12} /></RemovePreviewBtn>
                      </PreviewWrap>
                    ) : (
                      <div key={att.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(0,0,0,0.4)', padding: '4px 10px', borderRadius: 12, minWidth: 0, position: 'relative', maxWidth: 200 }}>
                        <audio controls src={att.url} style={{ height: 30, flex: 1, minWidth: 0 }} />
                        <RemovePreviewBtn style={{ top: -6, right: -6 }} onClick={() => removeAttachment(att.id)}><Trash2 size={12} /></RemovePreviewBtn>
                      </div>
                    )
                  ))}
                </div>
              )}
              <InputArea style={{ position: 'relative' }}>
                {showMention && filteredGames.length > 0 && (
                  <MentionMenu>
                    {filteredGames.map((g, i) => (
                      <MentionItem key={g.id} $active={i === mentionIndex} onClick={() => insertMention(g)}>
                        🎮 {g.name}
                      </MentionItem>
                    ))}
                  </MentionMenu>
                )}
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} multiple />
                <AttachBtn onClick={() => fileInputRef.current?.click()} disabled={sending || attachments.length >= 6} title="แนบไฟล์ (สูงสุด 6 ไฟล์)">
                  <Paperclip size={18} />
                </AttachBtn>
                <AttachBtn onClick={toggleRecording} disabled={sending || attachments.length >= 6} title={isRecording ? 'หยุดอัด' : 'อัดเสียง'}>
                  <Mic size={18} color={isRecording ? '#ef4444' : 'currentColor'} />
                </AttachBtn>
                {isRecording ? (
                  <VoiceIndicator>กำลังอัดเสียง... {formatTime(recordingTime)}</VoiceIndicator>
                ) : (
                  <TextArea
                    placeholder="พิมพ์คำตอบในฐานะ Admin..."
                    value={replyInput}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    rows={1}
                    onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
                    disabled={sending}
                  />
                )}
                <SendBtn onClick={isRecording ? toggleRecording : sendReply} disabled={sending || (!replyInput.trim() && attachments.length === 0 && !isRecording)}>
                  {sending ? 'ส่ง...' : isRecording ? <Square size={14} /> : <Send size={14} />}
                </SendBtn>
              </InputArea>
            </>
          )}
        </ChatPanel>
      </Page>
      {lightboxUrl && (
        <LightboxOverlay onClick={() => setLightboxUrl(null)}>
          <LightboxClose onClick={() => setLightboxUrl(null)}>✕</LightboxClose>
          <LightboxImg src={lightboxUrl} onClick={e => e.stopPropagation()} />
        </LightboxOverlay>
      )}
    </div>
  )
}
