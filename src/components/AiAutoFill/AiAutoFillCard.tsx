import styled, { keyframes } from 'styled-components'
import { Bot, Sparkles, Loader2, Wand2, Check } from 'lucide-react'
import { Input, Select } from '../../pages/Admin/adminStyles'

const glowPulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(124,58,237,0.4); }
  70% { box-shadow: 0 0 0 10px rgba(124,58,237,0); }
  100% { box-shadow: 0 0 0 0 rgba(124,58,237,0); }
`

const AiWrapper = styled.div`
  background: rgba(124,58,237,0.05); border: 1px dashed rgba(124,58,237,0.3); 
  border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;
`
const AiHeader = styled.div`
  display: flex; alignItems: center; justify-content: space-between; 
  margin-bottom: 10px; flex-wrap: wrap; gap: 8px;
`
const AiBadge = styled.span`
  background: rgba(124,58,237,0.15); color: #c084fc; font-size: 10px; 
  font-weight: 800; padding: 4px 8px; border-radius: 20px; text-transform: uppercase; 
  letter-spacing: 0.5px; display: flex; align-items: center; gap: 4px;
`
const AiInputRow = styled.div`
  display: flex; gap: 8px; align-items: center;
  @media (max-width: 640px) { flex-direction: column; align-items: stretch; }
`
const AiOptionRow = styled.div`
  display: flex; gap: 8px; align-items: center;
  @media (max-width: 640px) { width: 100%; flex-wrap: nowrap; }
`
const AiGenerateBtn = styled.button<{ $loading?: boolean }>`
  flex-shrink: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 9px 12px;
  background: ${p => p.$loading ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7c3aed, #a855f7)'};
  border: none; border-radius: 8px; color: #fff; font-size: 13px; font-weight: 700;
  cursor: ${p => p.$loading ? 'not-allowed' : 'pointer'};
  white-space: nowrap; font-family: 'Noto Sans Lao', sans-serif;
  transition: all 0.2s;
  ${p => p.$loading ? '' : '&:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(124,58,237,0.4); }'}
  animation: ${p => p.$loading ? glowPulse : 'none'} 1.5s ease-in-out infinite;
  
  /* Ensure it doesn't overflow */
  min-width: 100px;
  @media (max-width: 400px) {
    padding: 9px 8px;
    font-size: 12px;
  }
`
const AiResultCard = styled.div`
  margin-top: 14px; padding: 16px; background: linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.05));
  border: 1px solid rgba(124,58,237,0.25); border-radius: 12px; font-size: 13px;
  color: rgba(148,163,184,0.8);
`
const AiResultRow = styled.div`display: flex; gap: 8px; margin-bottom: 6px; align-items: flex-start;`
const AiResultKey = styled.span`color: #a855f7; font-weight: 700; min-width: 90px; flex-shrink: 0;`
const AiResultVal = styled.span`color: #e2e8f0; line-height: 1.5;`
const ApplyBtn = styled.button<{ $loading?: boolean }>`
  width: 100%; margin-top: 16px; padding: 12px;
  background: ${p => p.$loading ? 'rgba(16,185,129,0.3)' : '#10b981'};
  color: #fff; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 14px;
  transition: all 0.2s;
  ${p => p.$loading ? '' : '&:hover { background: #059669; transform: translateY(-1px); }'}
`
const CancelBtn = styled.button`
  width: 100%; margin-top: 8px; padding: 10px;
  background: transparent; color: #94a3b8; border: 1px solid rgba(148,163,184,0.2);
  border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px;
  &:hover { background: rgba(148,163,184,0.1); color: #fff; }
`

interface Props {
  aiQuery: string
  setAiQuery: (v: string) => void
  selectedModel: string
  setSelectedModel: (v: string) => void
  aiLoading: boolean
  isApplying: boolean
  aiError: string
  aiPreview: any
  onGenerate: () => void
  onApply: () => void
  onCancel: () => void
}

export default function AiAutoFillCard({
  aiQuery, setAiQuery, selectedModel, setSelectedModel,
  aiLoading, isApplying, aiError, aiPreview,
  onGenerate, onApply, onCancel
}: Props) {
  return (
    <AiWrapper>
      <AiHeader>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Bot size={15} style={{ color: '#a78bfa' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>AI Auto-Fill</span>
        </div>
        <AiBadge><Sparkles size={10} /> Powered by Gemini</AiBadge>
      </AiHeader>
      <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', marginBottom: 12, lineHeight: 1.5 }}>
        พิมพ์ชื่อเกม แล้วกด <strong style={{ color: '#a855f7' }}>Generate</strong> — AI จะช่วยดึงข้อมูลและเติมให้อัตโนมัติ (ชื่อ, คำอธิบาย, ประเภท, System Requirements)
      </p>

      <AiInputRow>
        <Input
          placeholder="Search game..."
          value={aiQuery}
          onChange={e => setAiQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onGenerate()}
          style={{ margin: 0, flex: 1, minWidth: 0 }}
        />
        <AiOptionRow>
          <Select
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ flex: 1, minWidth: 100 }}
          >
            <option value="gemini-flash-latest">Flash (Latest)</option>
            <option value="gemini-2.5-flash">2.5 Flash</option>
            <option value="gemini-2.0-flash">2.0 Flash</option>
            <option value="gemini-pro-latest">Pro (Latest)</option>
          </Select>
          <AiGenerateBtn $loading={aiLoading} onClick={onGenerate} disabled={aiLoading || !aiQuery.trim()}>
            {aiLoading ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Wand2 size={14} />}
            {aiLoading ? 'Generating...' : 'Generate'}
          </AiGenerateBtn>
        </AiOptionRow>
      </AiInputRow>

      {aiError && (
        <p style={{ fontSize: 12, color: '#ef4444', marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: '#ef4444' }} />
          {aiError}
        </p>
      )}

      {aiPreview && (
        <AiResultCard>
          <div style={{ marginBottom: 12, borderBottom: '1px dashed rgba(124,58,237,0.2)', paddingBottom: 12 }}>
            <AiResultRow><AiResultKey>🎮 Title</AiResultKey><AiResultVal>{aiPreview.title}</AiResultVal></AiResultRow>
            <AiResultRow><AiResultKey>🏷️ Genres</AiResultKey><AiResultVal>{(aiPreview.genres || []).join(', ')}</AiResultVal></AiResultRow>
            <AiResultRow><AiResultKey>🕹️ Platform</AiResultKey><AiResultVal>{(aiPreview.platforms || []).join(', ').toUpperCase()}</AiResultVal></AiResultRow>
            <AiResultRow><AiResultKey>💾 Size</AiResultKey><AiResultVal>{aiPreview.file_size}</AiResultVal></AiResultRow>
            <AiResultRow><AiResultKey>📝 Desc</AiResultKey><AiResultVal style={{ maxHeight: 70, overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 60%, transparent)' }}>{aiPreview.description}</AiResultVal></AiResultRow>
          </div>
          <ApplyBtn $loading={isApplying} onClick={onApply} disabled={isApplying}>
            {isApplying ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
            {isApplying ? 'Applying & Fetching Images...' : 'Apply & Fetch Images'}
          </ApplyBtn>
          {!isApplying && <CancelBtn onClick={onCancel}>Cancel</CancelBtn>}
        </AiResultCard>
      )}
    </AiWrapper>
  )
}
