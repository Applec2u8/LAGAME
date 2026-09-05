import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Plus, Trash2, Loader2, CheckCircle, AlertCircle, Tags, Hash } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Category } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle,
  Card, CardHeader, CardTitle,
  TwoCol, Field, Label, Input, Hint,
  PrimaryBtn, IconBtn,
  Alert, EmptyState, LoadingState,
  Badge
} from '../adminStyles'

const CatRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-radius: 12px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.04);
  margin-bottom: 8px;
  transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.05); border-color: rgba(124,58,237,0.15); }
  &:last-child { margin-bottom: 0; }
`

function slugify(str: string) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function ManageCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    const { data } = await supabase.from('categories').select('*').order('name')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchCategories() }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    const { error } = await supabase.from('categories').insert({ name: newName.trim(), slug: slugify(newName) } as any)
    if (error) setMsg({ type: 'error', text: error.message })
    else { setMsg({ type: 'success', text: `"${newName}" added successfully!` }); setNewName('') }
    setAdding(false)
    fetchCategories()
    setTimeout(() => setMsg(null), 3000)
  }

  const handleDelete = async (id: string) => {
    await supabase.from('categories').delete().eq('id', id)
    fetchCategories()
  }

  return (
    <AdminPage>
      <PageHeader>
        <PageTitle>
          <Tags size={26} style={{ color: '#06b6d4' }} />
          Categories
          <span>{categories.length} total</span>
        </PageTitle>
      </PageHeader>

      <TwoCol>
        {/* Add Form */}
        <Card>
          <CardHeader>
            <CardTitle><Plus size={16} style={{ color: '#7c3aed' }} /> New Category</CardTitle>
          </CardHeader>

          {msg && (
            <Alert $type={msg.type}>
              {msg.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
              {msg.text}
            </Alert>
          )}

          <Field>
            <Label>Category Name</Label>
            <Input
              placeholder="e.g. Action, RPG, Horror..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            {newName && (
              <Hint>
                Slug: <code style={{ color: '#a78bfa' }}>/{slugify(newName)}</code>
              </Hint>
            )}
          </Field>

          <PrimaryBtn
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {adding
              ? <><Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} /> Adding...</>
              : <><Plus size={15} /> Add Category</>
            }
          </PrimaryBtn>
        </Card>

        {/* List */}
        <Card>
          <CardHeader>
            <CardTitle>
              <Hash size={16} style={{ color: '#06b6d4' }} />
              All Categories
            </CardTitle>
            <Badge $color="#06b6d4">{categories.length}</Badge>
          </CardHeader>

          {loading ? (
            <LoadingState>
              <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading...
            </LoadingState>
          ) : categories.length === 0 ? (
            <EmptyState>
              <Tags size={32} style={{ opacity: 0.2 }} />
              <div>No categories yet</div>
            </EmptyState>
          ) : (
            <div>
              {categories.map(cat => (
                <CatRow key={cat.id}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0' }}>{cat.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', marginTop: 2 }}>
                      /{cat.slug}
                    </div>
                  </div>
                  <IconBtn $danger onClick={() => handleDelete(cat.id)} title="Delete">
                    <Trash2 size={14} />
                  </IconBtn>
                </CatRow>
              ))}
            </div>
          )}
        </Card>
      </TwoCol>
    </AdminPage>
  )
}
