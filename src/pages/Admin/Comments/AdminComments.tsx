import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { MessageSquare, Trash2, Eye, EyeOff, Filter, CornerDownRight, Send, Edit2, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card,
  Input, PrimaryBtn, IconBtn,
  Alert
} from '../adminStyles'

const FilterRow = styled.div`display: flex; gap: 10px; margin-bottom: 24px; flex-wrap: wrap;`
const FilterBtn = styled.button<{ $active: boolean }>`
  padding: 8px 16px; border-radius: 8px; border: 1px solid rgba(124,58,237,0.25);
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.03)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.7)'}; font-size: 13px;
  cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.15); }
`
const CommentRow = styled.div<{ $isReply?: boolean, 'data-hidden'?: string }>`
  display: flex; gap: 14px; padding: 16px;
  background: ${p => p.$isReply ? 'transparent' : 'rgba(255,255,255,0.02)'};
  border: 1px solid ${p => p.$isReply ? 'transparent' : 'rgba(255,255,255,0.06)'};
  border-radius: 12px; margin-bottom: 10px;
  margin-left: ${p => p.$isReply ? '52px' : '0'};
  border-left: ${p => p.$isReply ? '2px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.06)'};
  opacity: ${(p: any) => p['data-hidden'] === 'true' ? 0.4 : 1};
`
const Avatar = styled.div`
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 15px; color: #fff;
`
const Meta = styled.div`flex: 1;`
const AuthorRow = styled.div`display: flex; align-items: center; gap: 8px; margin-bottom: 4px;`
const Author = styled.span`font-weight: 600; font-size: 14px;`
const TypeBadge = styled.span<{ $type: string }>`
  font-size: 11px; padding: 2px 8px; border-radius: 20px;
  background: ${p => p.$type === 'game' ? 'rgba(124,58,237,0.2)' : 'rgba(6,182,212,0.2)'};
  color: ${p => p.$type === 'game' ? '#c4b5fd' : '#67e8f9'};
`
const GameTitle = styled.span`font-size: 12px; color: rgba(148,163,184,0.5);`
const CommentText = styled.p`font-size: 13.5px; color: rgba(203,213,225,0.8); margin: 4px 0 0 0; line-height: 1.6;`
const DateText = styled.span`font-size: 11px; color: rgba(148,163,184,0.4); margin-left: auto;`
const Actions = styled.div`display: flex; gap: 6px; align-items: flex-start;`
const StatsRow = styled.div`display: flex; gap: 20px; margin-bottom: 24px; @media (max-width: 600px) { flex-direction: column; gap: 12px; }`
const Stat = styled.div`
  background: rgba(20,20,38,0.7); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06); box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  border-radius: 16px; padding: 18px 24px; flex: 1;
`
const StatNum = styled.div`font-size: 32px; font-weight: 800; color: #fff; font-family: 'Noto Sans Lao', sans-serif;`
const StatLabel = styled.div`font-size: 13px; color: rgba(148,163,184,0.6); margin-top: 4px; font-weight: 500;`

const ReplyForm = styled.div`
  display: flex; gap: 10px; margin: -4px 0 16px 52px;
`

interface Comment {
  id: string
  type: string
  game_id: string | null
  author_name: string
  content: string
  rating: number | null
  is_approved: boolean
  created_at: string
  parent_id: string | null
  game?: { title: string }
  image_url: string | null
}

export default function AdminComments() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'game' | 'website'>('all')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [toasts, setToasts] = useState<{id: number, msg: string, type: 'success' | 'error'}[]>([])

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3000)
  }

  const loadComments = async () => {
    setLoading(true)
    const { data } = await (supabase as any)
      .from('comments')
      .select('*, game:games(title)')
      .order('created_at', { ascending: false })
    setComments(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadComments()
    
    // Mark all unread comments as read when admin visits the page
    const markAsRead = async () => {
      await (supabase as any).from('comments').update({ is_read: true }).eq('is_read', false)
    }
    markAsRead()
  }, [])

  const toggleApprove = async (c: Comment) => {
    const { error } = await (supabase as any).from('comments').update({ is_approved: !c.is_approved }).eq('id', c.id)
    if (error) {
      showToast('เกิดข้อผิดพลาด: ' + error.message, 'error')
    } else {
      showToast(c.is_approved ? 'ซ่อนคอมเมนต์แล้ว' : 'แสดงคอมเมนต์แล้ว')
      loadComments()
    }
  }

  const deleteComment = async (id: string) => {
    if (!confirm('ลบ Comment นี้?')) return
    const { error } = await (supabase as any).from('comments').delete().eq('id', id)
    if (error) {
      showToast('ลบไม่สำเร็จ: ' + error.message, 'error')
    } else {
      showToast('ลบสำเร็จ')
      loadComments()
    }
  }

  const submitReply = async (parentComment: Comment) => {
    if (!replyContent.trim()) return
    setSubmittingReply(true)
    try {
      const payload = {
        type: parentComment.type,
        game_id: parentComment.game_id,
        author_name: 'Admin',
        content: replyContent.trim(),
        parent_id: parentComment.id,
        is_approved: true
      }
      const { error } = await (supabase as any)
        .from('comments')
        .insert(payload)
        .select('*, game:games(title)')
        .single()
      
      if (error) throw error
      showToast('ตอบกลับสำเร็จ')
      setReplyingTo(null)
      setReplyContent('')
      loadComments()
    } catch (e: any) {
      showToast('ตอบกลับไม่สำเร็จ: ' + e.message, 'error')
    } finally {
      setSubmittingReply(false)
    }
  }

  const handleEditSubmit = async (id: string) => {
    if (!editContent.trim()) return
    try {
      const { error } = await (supabase as any).from('comments').update({ content: editContent.trim() }).eq('id', id)
      if (error) throw error
      showToast('แก้ไขสำเร็จ')
      setEditingId(null)
      setEditContent('')
      loadComments()
    } catch (e: any) {
      showToast('แก้ไขไม่สำเร็จ: ' + e.message, 'error')
    }
  }

  const filtered = filter === 'all' ? comments : comments.filter(c => c.type === filter)
  const gameCount = comments.filter(c => c.type === 'game').length
  const siteCount = comments.filter(c => c.type === 'website').length
  
  const topLevelComments = filtered.filter(c => !c.parent_id)
  const replies = filtered.filter(c => c.parent_id)

  const renderComment = (c: Comment, isReply = false) => (
    <div key={c.id}>
      <CommentRow $isReply={isReply} data-hidden={String(!c.is_approved)}>
        <Avatar>{c.author_name.charAt(0).toUpperCase()}</Avatar>
        <Meta>
          <AuthorRow>
            <Author>{c.author_name}</Author>
            <TypeBadge $type={c.type}>{c.type === 'game' ? '🎮 เกม' : '💬 เว็บ'}</TypeBadge>
            {c.parent_id && <TypeBadge $type="reply" style={{ background: 'rgba(234,179,8,0.2)', color: '#fde047' }}>↪ ตอบกลับ</TypeBadge>}
            {c.game && <GameTitle>→ {(c.game as any).title}</GameTitle>}
            {c.rating && !c.parent_id && <span style={{ fontSize: 13 }}>{'⭐'.repeat(c.rating)}</span>}
            <DateText>{new Date(c.created_at).toLocaleString('th-TH')}</DateText>
          </AuthorRow>
          {editingId === c.id ? (
            <div style={{ marginTop: 8 }}>
              <Input
                as="textarea"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                style={{ width: '100%', minHeight: 60, marginBottom: 8, padding: '8px 12px' }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <PrimaryBtn onClick={() => handleEditSubmit(c.id)} style={{ padding: '6px 12px', fontSize: 13 }}>บันทึก</PrimaryBtn>
                <button onClick={() => setEditingId(null)} style={{ background: 'none', border: 'none', color: '#f87171', fontSize: 13, cursor: 'pointer', padding: '6px 12px' }}>ยกเลิก</button>
              </div>
            </div>
          ) : (
            <CommentText>{c.content}</CommentText>
          )}
          {c.image_url && (
            <div style={{ marginTop: 8 }}>
              <a href={c.image_url} target="_blank" rel="noreferrer">
                <img src={c.image_url} alt="Attached" style={{ maxWidth: 200, maxHeight: 150, borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', objectFit: 'contain', background: 'rgba(0,0,0,0.2)' }} />
              </a>
            </div>
          )}
        </Meta>
        <Actions>
          {!c.parent_id && (
            <IconBtn onClick={() => {
              setReplyingTo(replyingTo === c.id ? null : c.id)
              setReplyContent('')
            }} title="ตอบกลับ" style={replyingTo === c.id ? { background: 'rgba(124,58,237,0.2)', color: '#c4b5fd', borderColor: 'rgba(124,58,237,0.4)' } : undefined}>
              <CornerDownRight size={16} />
            </IconBtn>
          )}
          <IconBtn onClick={() => { setEditingId(c.id); setEditContent(c.content); }} title="แก้ไข">
            <Edit2 size={16} />
          </IconBtn>
          <IconBtn onClick={() => toggleApprove(c)} title={c.is_approved ? 'ซ่อน' : 'แสดง'}>
            {c.is_approved ? <Eye size={16} /> : <EyeOff size={16} />}
          </IconBtn>
          <IconBtn $danger onClick={() => deleteComment(c.id)} title="ลบ">
            <Trash2 size={16} />
          </IconBtn>
        </Actions>
      </CommentRow>
      {replyingTo === c.id && !isReply && (
        <ReplyForm>
          <Input 
            autoFocus
            placeholder={`ตอบกลับ ${c.author_name}...`}
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submitReply(c)
              }
            }}
            style={{ padding: '8px 12px' }}
          />
          <PrimaryBtn onClick={() => submitReply(c)} disabled={!replyContent.trim() || submittingReply} style={{ padding: '8px 16px', fontSize: 13 }}>
            <Send size={14} /> {submittingReply ? 'กำลังส่ง...' : 'ส่ง'}
          </PrimaryBtn>
        </ReplyForm>
      )}
    </div>
  )

  return (
    <AdminPage $maxWidth="960px">
      <div style={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
        {toasts.map(t => (
          <Alert key={t.id} $type={t.type} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.2)', backdropFilter: 'blur(8px)', animation: 'fadeUp 0.3s ease-out', margin: 0, padding: '12px 24px' }}>
            {t.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
            {t.msg}
          </Alert>
        ))}
      </div>

      <PageHeader>
        <div>
          <PageTitle><MessageSquare size={26} style={{ color: '#06b6d4' }} /> Comments Manager</PageTitle>
          <PageSubTitle>จัดการ Comment เกมและ Comment เว็บไซต์ทั้งหมด</PageSubTitle>
        </div>
      </PageHeader>

      <StatsRow>
        <Stat>
          <StatNum>{comments.length}</StatNum>
          <StatLabel>ทั้งหมด</StatLabel>
        </Stat>
        <Stat>
          <StatNum>{gameCount}</StatNum>
          <StatLabel>รีวิวเกม</StatLabel>
        </Stat>
        <Stat>
          <StatNum>{siteCount}</StatNum>
          <StatLabel>Guestbook</StatLabel>
        </Stat>
        <Stat>
          <StatNum>{comments.filter(c => !c.is_approved).length}</StatNum>
          <StatLabel>ซ่อนอยู่</StatLabel>
        </Stat>
      </StatsRow>

      <FilterRow>
        <Filter size={16} style={{ color: 'rgba(148,163,184,0.5)', alignSelf: 'center' }} />
        {(['all', 'game', 'website'] as const).map(f => (
          <FilterBtn key={f} $active={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? 'ทั้งหมด' : f === 'game' ? '🎮 รีวิวเกม' : '💬 Guestbook'}
            <span style={{ marginLeft: 6, opacity: 0.6 }}>
              ({f === 'all' ? comments.length : f === 'game' ? gameCount : siteCount})
            </span>
          </FilterBtn>
        ))}
      </FilterRow>

      {loading ? (
        <Card style={{ padding: 60, textAlign: 'center', color: 'rgba(148,163,184,0.5)' }}>กำลังโหลด...</Card>
      ) : filtered.length === 0 ? (
        <Card style={{ padding: 60, textAlign: 'center', color: 'rgba(148,163,184,0.5)' }}>
          ยังไม่มี Comment
        </Card>
      ) : (
        topLevelComments.map(c => (
          <div key={c.id}>
            {renderComment(c, false)}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {replies.filter(r => r.parent_id === c.id).reverse().map(reply => renderComment(reply, true))}
            </div>
          </div>
        ))
      )}
    </AdminPage>
  )
}
