import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { Plus, Edit2, Trash2, Search, Loader2, AlertCircle, Eye, Gamepad2, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Game } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle,
  PrimaryBtnLink,
  TableWrap, TableHead, TableRow,
  Badge, SearchWrap, SearchInput, SearchIcon,
  EmptyState, LoadingState,
  ModalOverlay, ModalCard, DangerBtn, SecondaryBtn
} from '../adminStyles'

// ── Styled Components ──────────────────────────────────────────────

const ColGrid = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr 130px 70px 80px;
  align-items: center; gap: 12px;
  @media (max-width: 700px) { grid-template-columns: 44px 1fr 72px; }
`

const Thumb = styled.img`
  width: 44px; height: 30px; object-fit: cover;
  border-radius: 6px; display: block;
`
const ThumbPlaceholder = styled.div`
  width: 44px; height: 30px;
  background: rgba(124,58,237,0.08); border-radius: 6px;
  display: flex; align-items: center; justify-content: center; font-size: 16px;
`

const HideMobile = styled.span`@media(max-width:700px){display:none}`

const Toolbar = styled.div`
  display: flex; align-items: center; gap: 10px;
  flex-wrap: wrap; margin-bottom: 20px;
`

const FilterSelect = styled.select`
  padding: 8px 12px; background: rgba(10,10,20,0.6);
  border: 1px solid rgba(255,255,255,0.08); border-radius: 10px;
  color: #e2e8f0; font-size: 13px; outline: none; cursor: pointer;
  font-family: 'Noto Sans Lao', sans-serif;
  &:focus { border-color: rgba(124,58,237,0.5); }
  option { background: #1a1a2e; }
`

const ActionBtns = styled.div`
  display: flex; gap: 6px;
  @media (max-width: 700px) { gap: 4px; }
`

const SmallIconBtn = styled.button<{ $danger?: boolean }>`
  width: 30px; height: 30px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  background: ${p => p.$danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${p => p.$danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.07)'};
  color: ${p => p.$danger ? '#f87171' : 'rgba(148,163,184,0.7)'};
  cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  &:hover {
    background: ${p => p.$danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'};
    color: ${p => p.$danger ? '#ef4444' : '#fff'};
    transform: scale(1.08);
  }
`

// Pagination
const PaginationRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 0; flex-wrap: wrap; gap: 12px;
`
const PaginationInfo = styled.div`font-size: 13px; color: rgba(148,163,184,0.5);`
const PaginationBtns = styled.div`display: flex; gap: 6px; align-items: center;`
const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 32px; height: 32px; padding: 0 8px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center; gap: 4px;
  font-size: 13px; cursor: pointer; transition: all 0.15s;
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.04)'};
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'};
  color: ${p => p.$active ? '#a78bfa' : 'rgba(148,163,184,0.7)'};
  &:hover:not(:disabled) { background: rgba(124,58,237,0.2); color: #a78bfa; }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
`

// Delete modal — compact, fixed width
const DeleteModal = styled(ModalCard)`
  max-width: 340px;
  padding: 28px 24px;
`

// ── Component ──────────────────────────────────────────────────────

const LIMIT_OPTIONS = [20, 50, 100]

export default function ManageGames() {
  const navigate = useNavigate()

  // Data
  const [games, setGames] = useState<Game[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])

  // Filters
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [sortAZ, setSortAZ] = useState<'newest' | 'az' | 'za'>('newest')
  const [limit, setLimit] = useState(50)
  const [page, setPage] = useState(1)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteTitle, setDeleteTitle] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Fetch categories once
  useEffect(() => {
    supabase.from('categories').select('id,name').order('name').then(({ data }) => {
      if (data) setCategories(data)
    })
  }, [])

  const fetchGames = useCallback(async () => {
    setLoading(true)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let q = supabase
      .from('games')
      .select('id,title,cover_image,created_at,view_count,category:categories(id,name)', { count: 'exact' })

    if (search) q = q.ilike('title', `%${search}%`)
    if (catFilter) q = q.eq('category_id', catFilter)

    if (sortAZ === 'az') q = q.order('title', { ascending: true })
    else if (sortAZ === 'za') q = q.order('title', { ascending: false })
    else q = q.order('created_at', { ascending: false })

    q = q.range(from, to)

    const { data, count } = await q
    setGames((data as any) || [])
    setTotalCount(count || 0)
    setLoading(false)
  }, [search, catFilter, sortAZ, limit, page])

  useEffect(() => { setPage(1) }, [search, catFilter, sortAZ, limit])
  useEffect(() => { fetchGames() }, [fetchGames])

  const totalPages = Math.ceil(totalCount / limit)

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    await supabase.from('games').delete().eq('id', deleteId)
    setDeleteId(null)
    setDeleting(false)
    fetchGames()
  }

  const openDelete = (id: string, title: string) => {
    setDeleteId(id)
    setDeleteTitle(title)
  }

  return (
    <AdminPage>
      <PageHeader>
        <PageTitle>
          <Gamepad2 size={24} style={{ color: '#7c3aed' }} />
          Manage Games
          <span>{totalCount} total</span>
        </PageTitle>
        <PrimaryBtnLink to="/ap-admin/games/add" style={{ padding: '9px 18px', fontSize: 13 }}>
          <Plus size={15} /> Add Game
        </PrimaryBtnLink>
      </PageHeader>

      {/* ── Toolbar ── */}
      <Toolbar>
        {/* Search */}
        <SearchWrap style={{ flex: '1 1 180px', maxWidth: 280 }}>
          <SearchIcon><Search size={14} /></SearchIcon>
          <SearchInput
            placeholder="Search by title..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize: 13, padding: '8px 12px 8px 38px' }}
          />
        </SearchWrap>

        {/* Category Filter */}
        <FilterSelect value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </FilterSelect>

        {/* Sort A-Z */}
        <FilterSelect value={sortAZ} onChange={e => setSortAZ(e.target.value as any)}>
          <option value="newest">Newest First</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </FilterSelect>

        {/* Limit */}
        <FilterSelect value={limit} onChange={e => setLimit(Number(e.target.value))}>
          {LIMIT_OPTIONS.map(n => (
            <option key={n} value={n}>{n} per page</option>
          ))}
        </FilterSelect>
      </Toolbar>

      {/* ── Table ── */}
      <TableWrap>
        <TableHead>
          <ColGrid>
            <div />
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
            <Gamepad2 size={36} style={{ opacity: 0.2 }} />
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', lineHeight: 1.4 }}>{g.title}</div>
                  <div style={{ fontSize: 11, color: 'rgba(148,163,184,0.4)', marginTop: 2 }}>
                    {new Date(g.created_at).toLocaleDateString('th-TH')}
                  </div>
                </div>
                <HideMobile>
                  <Badge $color="#7c3aed" style={{ fontSize: 11 }}>{(g as any).category?.name || '—'}</Badge>
                </HideMobile>
                <HideMobile>
                  <span style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Eye size={11} /> {g.view_count || 0}
                  </span>
                </HideMobile>
                <ActionBtns>
                  <SmallIconBtn onClick={() => navigate(`/ap-admin/games/edit/${g.id}`)} title="Edit">
                    <Edit2 size={13} />
                  </SmallIconBtn>
                  <SmallIconBtn $danger onClick={() => openDelete(g.id, g.title)} title="Delete">
                    <Trash2 size={13} />
                  </SmallIconBtn>
                </ActionBtns>
              </ColGrid>
            </TableRow>
          ))
        )}
      </TableWrap>

      {/* ── Pagination ── */}
      {!loading && totalCount > 0 && (
        <PaginationRow>
          <PaginationInfo>
            Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
          </PaginationInfo>
          <PaginationBtns>
            <PageBtn onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft size={14} />
            </PageBtn>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show pages around current
              const delta = 3
              const start = Math.max(1, page - delta)
              const end = Math.min(totalPages, start + 6)
              const pg = start + i
              if (pg > end) return null
              return (
                <PageBtn key={pg} $active={pg === page} onClick={() => setPage(pg)}>
                  {pg}
                </PageBtn>
              )
            })}
            <PageBtn onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronRight size={14} />
            </PageBtn>
          </PaginationBtns>
        </PaginationRow>
      )}


      {deleteId && createPortal(
        <ModalOverlay onClick={() => setDeleteId(null)}>
          <DeleteModal onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setDeleteId(null)}
              style={{
                position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
                color: 'rgba(148,163,184,0.5)', cursor: 'pointer', padding: 4, borderRadius: 6,
                display: 'flex', alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
            <AlertCircle size={36} style={{ color: '#ef4444', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ fontFamily: 'Noto Sans Lao', fontWeight: 800, fontSize: 17, color: '#fff', marginBottom: 6, textAlign: 'center' }}>
              Delete this game?
            </h3>
            <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', marginBottom: 8, textAlign: 'center', lineHeight: 1.5 }}>
              <span style={{ color: '#a78bfa', fontWeight: 600 }}>"{deleteTitle}"</span>
              <br />will be permanently removed.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
              <SecondaryBtn onClick={() => setDeleteId(null)} style={{ padding: '8px 16px', fontSize: 13 }}>
                Cancel
              </SecondaryBtn>
              <DangerBtn onClick={handleDelete} disabled={deleting} style={{ padding: '8px 16px', fontSize: 13 }}>
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </DangerBtn>
            </div>
          </DeleteModal>
        </ModalOverlay>,
        document.body
      )}
    </AdminPage>
  )
}
