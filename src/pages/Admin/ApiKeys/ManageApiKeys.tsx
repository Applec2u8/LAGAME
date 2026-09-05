import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Plus, Trash2, Loader2, Key, CheckCircle, Clock, Eye, EyeOff, Copy, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { GeminiKey } from '../../../lib/gemini'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card, CardHeader, CardTitle,
  Field, Label, Input, Select, Hint,
  PrimaryBtn, SecondaryBtn, IconBtn,
  Badge,
  EmptyState, LoadingState
} from '../adminStyles'

const KeyRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 100px 160px 80px;
  align-items: center; gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.03); }
  &:last-child { border-bottom: none; }
  @media (max-width: 800px) { grid-template-columns: 1fr 80px; }
`
const KeyRowHead = styled(KeyRow)`
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: rgba(148,163,184,0.4);
  background: rgba(124,58,237,0.04);
  &:hover { background: rgba(124,58,237,0.04); }
`

const MonoKey = styled.div`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13px; color: rgba(148,163,184,0.7);
  display: flex; align-items: center; gap: 8px;
`

const AddFormGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1.5fr 2fr 1fr; gap: 16px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`

const HideMobile = styled.div`@media(max-width:800px){display:none}`

export default function ManageApiKeys() {
  const [keys, setKeys] = useState<GeminiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formName, setFormName] = useState('')
  const [formKey, setFormKey] = useState('')
  const [formCategory, setFormCategory] = useState('gemini')
  const [formModel, setFormModel] = useState('gemini-flash-latest')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => { fetchKeys() }, [])

  const fetchKeys = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('gemini_api_keys').select('*').order('created_at', { ascending: true })
    if (!error && data) setKeys(data as GeminiKey[])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!formName.trim() || !formKey.trim()) return
    setSaving(true)
    const { error } = await (supabase as any).from('gemini_api_keys').insert({
      name: formName, api_key: formKey, model: formModel, category: formCategory
    })
    setSaving(false)
    if (!error) {
      setShowForm(false); setFormName(''); setFormKey('')
      fetchKeys()
    } else {
      alert('Error saving key: ' + error.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this API key?')) return
    await (supabase as any).from('gemini_api_keys').delete().eq('id', id)
    fetchKeys()
  }

  const handleToggleActive = async (id: string, current: boolean) => {
    await (supabase as any).from('gemini_api_keys').update({ is_active: !current }).eq('id', id)
    fetchKeys()
  }

  const handleClearCooldown = async (id: string) => {
    await (supabase as any).from('gemini_api_keys').update({ cooldown_until: null }).eq('id', id)
    fetchKeys()
  }

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatCooldown = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (d.getTime() < Date.now()) return null
    return d.toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const maskKey = (key: string) =>
    key.length > 12 ? key.substring(0, 8) + '•••••••' + key.substring(key.length - 4) : '•••••••••'

  return (
    <AdminPage>
      <PageHeader>
        <div>
          <PageTitle>
            <Key size={26} style={{ color: '#f59e0b' }} />
            API Keys Manager
          </PageTitle>
          <PageSubTitle>
            The system auto-rotates between active keys. Keys on cooldown are skipped automatically.
          </PageSubTitle>
        </div>
        <PrimaryBtn onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={15} /> : <Plus size={15} />}
          {showForm ? 'Cancel' : 'Add Key'}
        </PrimaryBtn>
      </PageHeader>

      {/* Add Form */}
      {showForm && (
        <Card style={{ marginBottom: 20, border: '1px solid rgba(124,58,237,0.2)', background: 'rgba(124,58,237,0.06)' }}>
          <CardHeader>
            <CardTitle><Plus size={16} style={{ color: '#7c3aed' }} /> New API Key</CardTitle>
          </CardHeader>
          <AddFormGrid>
            <Field>
              <Label>Category</Label>
              <Select value={formCategory} onChange={e => setFormCategory(e.target.value)}>
                <option value="gemini">Gemini Agent</option>
                <option value="steamgriddb">SteamGridDB</option>
                <option value="other">Other</option>
              </Select>
            </Field>
            <Field>
              <Label>Name / Identifier</Label>
              <Input placeholder="e.g. Account A" value={formName} onChange={e => setFormName(e.target.value)} />
            </Field>
            <Field>
              <Label>API Key</Label>
              <div style={{ position: 'relative' }}>
                <Input
                  type={showKey ? 'text' : 'password'}
                  placeholder="AIza..."
                  value={formKey}
                  onChange={e => setFormKey(e.target.value)}
                  style={{ paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(148,163,184,0.5)' }}
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Hint>Your key is stored securely and never exposed to the frontend.</Hint>
            </Field>
            <Field>
              <Label>Default Model</Label>
              <Select value={formModel} onChange={e => setFormModel(e.target.value)}>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
                <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
                <option value="gemini-pro-latest">gemini-pro-latest</option>
              </Select>
            </Field>
          </AddFormGrid>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <SecondaryBtn onClick={() => setShowForm(false)}>Cancel</SecondaryBtn>
            <PrimaryBtn onClick={handleSave} disabled={saving || !formName || !formKey}>
              {saving
                ? <><Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Saving...</>
                : <><CheckCircle size={14} /> Save Key</>
              }
            </PrimaryBtn>
          </div>
        </Card>
      )}

      {/* Keys Table */}
      <Card style={{ padding: 0 }}>
        {loading ? (
          <LoadingState><Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Loading keys...</LoadingState>
        ) : keys.length === 0 ? (
          <EmptyState>
            <Key size={40} style={{ opacity: 0.2 }} />
            <div>No API keys yet. Add one above.</div>
          </EmptyState>
        ) : (
          <div>
            <KeyRowHead>
              <div>Name & Category</div>
              <HideMobile><div>API Key</div></HideMobile>
              <HideMobile><div>Status</div></HideMobile>
              <HideMobile><div>Cooldown</div></HideMobile>
              <div>Actions</div>
            </KeyRowHead>
            {keys.map(key => {
              const cooldown = formatCooldown(key.cooldown_until)
              return (
                <KeyRow key={key.id}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{key.name}</div>
                    <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', marginTop: 3 }}>
                      {key.category === 'steamgriddb' ? 'SteamGridDB' : key.category === 'other' ? 'Other' : 'Gemini Agent'}
                      {key.model && key.category === 'gemini' ? ` • ${key.model}` : ''}
                    </div>
                  </div>
                  <HideMobile>
                    <MonoKey>
                      {maskKey(key.api_key)}
                      <button
                        onClick={() => handleCopy(key.api_key, key.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied === key.id ? '#4ade80' : 'rgba(148,163,184,0.4)', padding: 4, borderRadius: 4 }}
                        title="Copy key"
                      >
                        {copied === key.id ? <CheckCircle size={13} /> : <Copy size={13} />}
                      </button>
                    </MonoKey>
                  </HideMobile>
                  <HideMobile>
                    <button
                      onClick={() => handleToggleActive(key.id, key.is_active)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <Badge $color={key.is_active ? '#22c55e' : '#94a3b8'}>
                        {key.is_active ? '● Active' : '○ Inactive'}
                      </Badge>
                    </button>
                  </HideMobile>
                  <HideMobile>
                    {cooldown ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Badge $color="#ef4444"><Clock size={11} /> {cooldown}</Badge>
                        <button
                          onClick={() => handleClearCooldown(key.id)}
                          style={{ fontSize: 11, background: 'none', border: '1px solid rgba(255,255,255,0.1)',
                            color: 'rgba(148,163,184,0.6)', padding: '2px 8px', borderRadius: 6, cursor: 'pointer' }}
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <Badge $color="#22c55e"><CheckCircle size={11} /> Ready</Badge>
                    )}
                  </HideMobile>
                  <IconBtn $danger onClick={() => handleDelete(key.id)} title="Delete">
                    <Trash2 size={14} />
                  </IconBtn>
                </KeyRow>
              )
            })}
          </div>
        )}
      </Card>
    </AdminPage>
  )
}
