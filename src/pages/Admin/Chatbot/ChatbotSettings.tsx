import { useState, useEffect } from 'react'
import { Bot, Save, Loader2, CheckCircle, AlertCircle, Type, Mic, Image as ImageIcon } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import {
  AdminPage, PageHeader, PageTitle, PageSubTitle,
  Card, CardHeader, CardTitle,
  TwoCol, PrimaryBtn, Alert, Divider,
  ToggleRow, ToggleLabel, ToggleHint, TogglePill
} from '../adminStyles'

export default function ChatbotSettings() {
  const [settings, setSettings] = useState<{ id: string, enable_text: boolean, enable_voice: boolean, enable_image: boolean } | null>(null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await (supabase as any).from('chatbot_settings').select('*').limit(1).single()
      if (data) setSettings(data)
    }
    fetchSettings()
  }, [])

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
    else setMsg({ type: 'success', text: 'Chatbot settings saved successfully!' })
    
    setSaving(false)
    setTimeout(() => setMsg(null), 3000)
  }

  return (
    <AdminPage $maxWidth="800px">
      <PageHeader>
        <div>
          <PageTitle>
            <Bot size={26} style={{ color: '#06b6d4' }} />
            Chatbot Features
          </PageTitle>
          <PageSubTitle>Configure AI Chatbot multimodal capabilities (Text, Voice, Image) to manage quota.</PageSubTitle>
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

      {settings && (
        <TwoCol>
          <Card style={{ gridColumn: '1 / -1' }}>
            <CardHeader>
              <CardTitle><Bot size={16} style={{ color: '#06b6d4' }} /> Features Configuration</CardTitle>
            </CardHeader>

            <ToggleRow>
              <div>
                <ToggleLabel><Type size={14}/> Text Chat</ToggleLabel>
                <ToggleHint>
                  {settings.enable_text ? '✅ Enabled — Users can type messages.' : '❌ Disabled — Typing disabled.'}
                </ToggleHint>
              </div>
              <TogglePill $on={settings.enable_text} onClick={() => handleToggle('enable_text')} />
            </ToggleRow>

            <Divider />

            <ToggleRow>
              <div>
                <ToggleLabel><Mic size={14}/> Voice Recording</ToggleLabel>
                <ToggleHint>
                  {settings.enable_voice ? '✅ Enabled — Microphone button visible.' : '❌ Disabled — Microphone hidden.'}
                </ToggleHint>
              </div>
              <TogglePill $on={settings.enable_voice} onClick={() => handleToggle('enable_voice')} />
            </ToggleRow>

            <Divider />

            <ToggleRow>
              <div>
                <ToggleLabel><ImageIcon size={14}/> Image Upload</ToggleLabel>
                <ToggleHint>
                  {settings.enable_image ? '✅ Enabled — Users can attach images for AI analysis.' : '❌ Disabled — Image upload hidden.'}
                </ToggleHint>
              </div>
              <TogglePill $on={settings.enable_image} onClick={() => handleToggle('enable_image')} />
            </ToggleRow>
          </Card>
        </TwoCol>
      )}
    </AdminPage>
  )
}
