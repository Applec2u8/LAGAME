import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { Plus, Trash2, Loader2, Key, CheckCircle, Clock, Eye, EyeOff, Copy, X, AlertTriangle, ChevronUp, Activity } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { GeminiKey } from '../../../lib/gemini'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card, CardHeader, CardTitle,
  Field, Label, Input, Select, Hint,
  PrimaryBtn, SecondaryBtn, IconBtn,
  Badge,
  EmptyState, LoadingState
} from '../adminStyles'

const CategorySection = styled.div`
  margin-bottom: 32px;
  &:last-child { margin-bottom: 0; }
`

const CategoryTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #e2e8f0;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding-bottom: 12px;
  padding-top: 20px;
`

const KeyRow = styled.div<{ $hasError?: boolean }>`
  display: grid;
  grid-template-columns: 1.2fr 1fr 100px 160px 120px;
  align-items: center; gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background 0.15s;
  background: ${props => props.$hasError ? 'rgba(239, 68, 68, 0.03)' : 'transparent'};
  &:hover { background: rgba(124,58,237,0.03); }
  &:last-child { border-bottom: none; }
  
  @media (max-width: 900px) {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
    position: relative;
    padding-bottom: 24px;
  }
`

const KeyRowHead = styled(KeyRow)`
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: rgba(148,163,184,0.4);
  background: rgba(124,58,237,0.04);
  padding: 12px 20px;
  &:hover { background: rgba(124,58,237,0.04); }
  @media (max-width: 900px) { display: none; }
`

const MobileRow = styled.div`
  display: contents;
  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    flex-wrap: wrap;
  }
`

const ActionContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  @media (max-width: 900px) {
    position: absolute;
    bottom: 16px;
    right: 20px;
  }
`

const ExpandedDetails = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  padding: 16px 20px;
  font-size: 13px;
  color: #f87171;
  display: flex;
  flex-direction: column;
  gap: 8px;
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
  
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { status: 'success' | 'error', message: string }>>({})
  const [testing, setTesting] = useState<Record<string, boolean>>({})

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
  
  const handleTestKey = async (key: GeminiKey) => {
    if (key.category !== 'gemini') {
      setTestResults(prev => ({...prev, [key.id]: { status: 'success', message: 'Ready' }}))
      return;
    }
    
    setTesting(prev => ({...prev, [key.id]: true}))
    setExpandedKey(key.id)
    
    try {
      const genAI = new GoogleGenerativeAI(key.api_key)
      const model = genAI.getGenerativeModel({ model: key.model || 'gemini-flash-latest' })
      await model.generateContent('ping')
      setTestResults(prev => ({...prev, [key.id]: { status: 'success', message: 'API Key is working perfectly.' }}))
      
      if (key.cooldown_until) {
        await handleClearCooldown(key.id)
      }
    } catch (e: any) {
      setTestResults(prev => ({...prev, [key.id]: { status: 'error', message: e.message || 'Unknown API Error' }}))
    } finally {
      setTesting(prev => ({...prev, [key.id]: false}))
    }
  }

  const formatCooldown = (dateStr: string | null) => {
    if (!dateStr) return null
    const d = new Date(dateStr)
    if (d.getTime() < Date.now()) return null
    return d.toLocaleString('th-TH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const maskKey = (key: string) =>
    key.length > 12 ? key.substring(0, 8) + '•••••••' + key.substring(key.length - 4) : '•••••••••'

  const groupedKeys = keys.reduce((acc, key) => {
    const cat = key.category || 'other';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(key);
    return acc;
  }, {} as Record<string, GeminiKey[]>);
  
  const categories = Object.keys(groupedKeys).sort();

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
            {categories.map((category) => (
              <CategorySection key={category}>
                <CategoryTitle>
                  {category === 'gemini' && <Activity size={18} style={{color: '#8b5cf6'}}/>}
                  {category === 'steamgriddb' && <Key size={18} style={{color: '#10b981'}}/>}
                  {category === 'other' && <Key size={18} style={{color: '#64748b'}}/>}
                  {category === 'steamgriddb' ? 'SteamGridDB' : category === 'other' ? 'Other APIs' : 'Gemini Agent'} Keys
                </CategoryTitle>
                <KeyRowHead>
                  <div>Name</div>
                  <div>API Key</div>
                  <div>Status</div>
                  <div>Cooldown</div>
                  <div>Actions</div>
                </KeyRowHead>
                {groupedKeys[category].map(key => {
                  const cooldown = formatCooldown(key.cooldown_until)
                  const isNotReady = !key.is_active || !!cooldown
                  const testResult = testResults[key.id]
                  const hasError = isNotReady || testResult?.status === 'error'
                  const isExpanded = expandedKey === key.id
                  
                  return (
                    <div key={key.id}>
                      <KeyRow $hasError={hasError}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{key.name}</div>
                          <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.4)', marginTop: 3 }}>
                            {key.model && key.category === 'gemini' ? key.model : 'Standard Key'}
                          </div>
                        </div>
                        <MobileRow>
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
                        </MobileRow>
                        <MobileRow>
                          <button
                            onClick={() => handleToggleActive(key.id, key.is_active)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                          >
                            <Badge $color={key.is_active ? '#22c55e' : '#94a3b8'}>
                              {key.is_active ? '● Active' : '○ Inactive'}
                            </Badge>
                          </button>
                        </MobileRow>
                        <MobileRow>
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
                        </MobileRow>
                        <ActionContainer>
                          {hasError && (
                            <IconBtn 
                              onClick={() => setExpandedKey(isExpanded ? null : key.id)} 
                              title="View Details"
                              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)' }}
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <AlertTriangle size={14} />}
                            </IconBtn>
                          )}
                          {category === 'gemini' && (
                            <IconBtn 
                              onClick={() => handleTestKey(key)} 
                              title="Test API Key"
                              disabled={testing[key.id]}
                            >
                              {testing[key.id] ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Activity size={14} />}
                            </IconBtn>
                          )}
                          <IconBtn $danger onClick={() => handleDelete(key.id)} title="Delete">
                            <Trash2 size={14} />
                          </IconBtn>
                        </ActionContainer>
                      </KeyRow>
                      
                      {isExpanded && hasError && (
                        <ExpandedDetails>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                            <AlertTriangle size={16} /> Key Issue Details
                          </div>
                          {!key.is_active && (
                            <div style={{marginLeft: 24}}>• <strong>Inactive:</strong> This key has been disabled manually or automatically due to an invalid/forbidden status (403).</div>
                          )}
                          {cooldown && (
                            <div style={{marginLeft: 24}}>• <strong>Cooldown:</strong> This key hit a quota limit (429) or service unavailable error (503). It will be available again at {cooldown}.</div>
                          )}
                          {testResult?.status === 'error' && (
                            <div style={{marginLeft: 24}}>
                              • <strong>Latest API Error:</strong> {testResult.message}
                            </div>
                          )}
                        </ExpandedDetails>
                      )}
                    </div>
                  )
                })}
              </CategorySection>
            ))}
          </div>
        )}
      </Card>
    </AdminPage>
  )
}
