import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Eye, Gamepad2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Game } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle,
  PrimaryBtnLink, IconBtn,
  TableWrap, TableHead, TableRow,
  Badge, SearchWrap, SearchInput, SearchIcon,
  EmptyState, LoadingState,
  ModalOverlay, ModalCard, DangerBtn, SecondaryBtn
} from '../adminStyles'

const ColGrid = styled.div`
  display: grid;
  grid-template-columns: 60px 1fr 140px 80px 88px;
  align-items: center; gap: 12px;
  @media (max-width: 700px) { grid-template-columns: 60px 1fr 80px; }
`

const Thumb = styled.img`
  width: 52px; height: 36px; object-fit: cover;
  border-radius: 8px; display: block;
`
const ThumbPlaceholder = styled.div`
  width: 52px; height: 36px;
  background: rgba(124,58,237,0.08); border-radius: 8px;
  display: flex; align-items: center; justify-content: center; font-size: 20px;
`

const HideMobile = styled.span`@media(max-width:700px){display:none}`

const Toolbar = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
`

export default function ManageGames() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchGames = async () => {
    setLoading(true)
    let q = supabase.from('games').select('*, category:categories(id,name)').order('created_at', { ascending: false }).limit(500)
    if (search) q = q.ilike('title', `%${search}%`)
    const { data } = await q
    setGames((data as any) || [])
    setLoading(false)
  }

  useEffect(() => { fetchGames() }, [search])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('games').delete().eq('id', deleteId)
    setDeleteId(null); setDeleting(false)
    fetchGames()
  }

  return (
    <AdminPage>
      <PageHeader>
        <PageTitle>
          <Gamepad2 size={26} style={{ color: '#7c3aed' }} />
          Manage Games
          <span>{games.length} total</span>
        </PageTitle>
        <PrimaryBtnLink to="/ap-admin/games/add">
          <Plus size={16} /> Add Game
        </PrimaryBtnLink>
      </PageHeader>

      <Toolbar>
        <SearchWrap>
          <SearchIcon><Search size={15} /></SearchIcon>
          <SearchInput
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </SearchWrap>
      </Toolbar>

      <TableWrap>
        <TableHead>
          <ColGrid>
            <div></div>
            <div>Title</div>
            <HideMobile>Category</HideMobile>
            <HideMobile>Views</HideMobile>
            <div>Actions</div>
          </ColGrid>
        </TableHead>

        {loading ? (
          <LoadingState>
            <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading games...
          </LoadingState>
        ) : games.length === 0 ? (
          <EmptyState>
            <Gamepad2 size={40} style={{ opacity: 0.2 }} />
            <div>No games found</div>
            <Link to="/ap-admin/games/add" style={{ color: '#a78bfa', fontSize: 13 }}>Add your first game →</Link>
          </EmptyState>
        ) : (
          games.map(g => (
            <TableRow key={g.id}>
              <ColGrid>
                {g.cover_image
                  ? <Thumb src={g.cover_image} alt={g.title} />
                  : <ThumbPlaceholder>🎮</ThumbPlaceholder>
                }
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', marginTop: 2 }}>
                    {new Date(g.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <HideMobile>
                  <Badge $color="#7c3aed">{(g as any).category?.name || '—'}</Badge>
                </HideMobile>
                <HideMobile>
                  <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={12} /> {g.view_count || 0}
                  </span>
                </HideMobile>
                <div style={{ display: 'flex', gap: 6 }}>
                  <IconBtn onClick={() => navigate(`/ap-admin/games/edit/${g.id}`)} title="Edit">
                    <Edit2 size={14} />
                  </IconBtn>
                  <IconBtn $danger onClick={() => setDeleteId(g.id)} title="Delete">
                    <Trash2 size={14} />
                  </IconBtn>
                </div>
              </ColGrid>
            </TableRow>
          ))
        )}
      </TableWrap>

      {deleteId && (
        <ModalOverlay>
          <ModalCard>
            <AlertCircle size={40} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
            <h3 style={{ fontFamily: 'Noto Sans Lao', fontWeight: 800, fontSize: 20, color: '#fff', marginBottom: 10, textAlign: 'center' }}>
              Delete this game?
            </h3>
            <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', marginBottom: 24, textAlign: 'center' }}>
              This action cannot be undone. All data associated with this game will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <SecondaryBtn onClick={() => setDeleteId(null)}>Cancel</SecondaryBtn>
              <DangerBtn onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </DangerBtn>
            </div>
          </ModalCard>
        </ModalOverlay>
      )}
    </AdminPage>
  )
}
