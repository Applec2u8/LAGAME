import { useState, useCallback } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { Check, RotateCcw } from 'lucide-react'

// ─── Animations ───────────────────────────────────────────────────────────────
const fadeIn = keyframes`from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); }`

// ─── Types ────────────────────────────────────────────────────────────────────
export type CoverOrientation = 'portrait' | 'landscape'

interface ImageDimensions { width: number; height: number; isLandscape: boolean }

// ─── Styled Components ────────────────────────────────────────────────────────
const Wrap = styled.div`margin-top: 12px;`

const StatusBadge = styled.span<{ $landscape?: boolean }>`
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 2px 8px; border-radius: 20px;
  background: ${p => p.$landscape ? 'rgba(6,182,212,0.15)' : 'rgba(168,85,247,0.15)'};
  color: ${p => p.$landscape ? '#22d3ee' : '#c084fc'};
  border: 1px solid ${p => p.$landscape ? 'rgba(6,182,212,0.3)' : 'rgba(168,85,247,0.3)'};
`

const PickerGrid = styled.div`
  display: flex; gap: 12px; flex-wrap: wrap; margin-top: 10px;
  @media (max-width: 500px) { gap: 8px; }
`

const OrientCard = styled.button<{ $selected: boolean }>`
  position: relative; border: none; background: none; cursor: pointer;
  padding: 0; border-radius: 10px; transition: all 0.2s;
  outline: 2px solid ${p => p.$selected ? '#7c3aed' : 'rgba(255,255,255,0.08)'};
  outline-offset: 2px;
  box-shadow: ${p => p.$selected ? '0 0 0 3px rgba(124,58,237,0.25)' : 'none'};
  &:hover { outline-color: rgba(124,58,237,0.5); }
  animation: ${css`${fadeIn} 0.2s ease`};
`

const CardImg = styled.img<{ $orient: CoverOrientation }>`
  display: block; border-radius: 8px; object-fit: cover;
  width: ${p => p.$orient === 'portrait' ? '100px' : '178px'};
  height: ${p => p.$orient === 'portrait' ? '140px' : '100px'};
  @media (max-width: 500px) {
    width: ${p => p.$orient === 'portrait' ? '80px' : '142px'};
    height: ${p => p.$orient === 'portrait' ? '112px' : '80px'};
  }
`

const CardLabel = styled.div<{ $selected: boolean }>`
  margin-top: 5px; font-size: 11px; font-weight: 700; text-align: center;
  color: ${p => p.$selected ? '#a78bfa' : 'rgba(148,163,184,0.6)'};
  transition: color 0.2s;
  display: flex; align-items: center; justify-content: center; gap: 4px;
`

const SelectedBadge = styled.div`
  position: absolute; top: 5px; right: 5px;
  width: 18px; height: 18px; border-radius: 50%;
  background: #7c3aed; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 2px 8px rgba(124,58,237,0.5);
`

const SinglePreview = styled.div<{ $orient: CoverOrientation }>`
  border-radius: 10px; overflow: hidden;
  border: 1px solid rgba(124,58,237,0.25);
  display: inline-block;
  width: ${p => p.$orient === 'portrait' ? '120px' : '200px'};
  height: ${p => p.$orient === 'portrait' ? '168px' : '112px'};
`

const PreviewImg = styled.img`
  width: 100%; height: 100%; object-fit: cover; display: block;
`

const DimText = styled.div`
  margin-top: 6px; font-size: 11px; color: rgba(148,163,184,0.5);
  display: flex; align-items: center; gap: 6px;
`

const ErrorBox = styled.div`
  margin-top: 10px; padding: 10px 14px;
  background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25);
  border-radius: 8px; font-size: 12px; color: #f87171;
`

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  src: string
  /** currently saved orientation choice */
  orientation: CoverOrientation
  onOrientationChange: (o: CoverOrientation) => void
}

export default function CoverImagePicker({ src, orientation, onOrientationChange }: Props) {
  const [dims, setDims] = useState<ImageDimensions | null>(null)
  const [imgSrc, setImgSrc] = useState(src)
  const [error, setError] = useState(false)

  // Reset when src changes
  if (imgSrc !== src) { setImgSrc(src); setDims(null); setError(false) }

  const handleLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    const w = img.naturalWidth
    const h = img.naturalHeight
    const isLandscape = w > h
    setDims({ width: w, height: h, isLandscape })
    setError(false)

    // Auto-set orientation: portrait-ish images → portrait, landscape → portrait (default)
    // Keep current choice if already chosen; only auto-set on first load (dims was null)
    if (!dims) {
      onOrientationChange(isLandscape ? 'portrait' : 'portrait')
    }
  }, [dims, onOrientationChange])

  const handleError = useCallback(() => {
    const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent(src)}`
    if (imgSrc !== proxy) { setImgSrc(proxy) }
    else { setError(true) }
  }, [src, imgSrc])

  if (!src) return null

  if (error) {
    return (
      <ErrorBox>⚠️ ไม่สามารถโหลดรูปได้ — ลองใช้ปุ่ม "เลือกไฟล์" หรือวาง URL อื่นแทนครับ</ErrorBox>
    )
  }

  return (
    <Wrap>
      {/* ── Hidden img for dimension detection ── */}
      <img
        src={imgSrc}
        style={{ display: 'none' }}
        onLoad={handleLoad}
        onError={handleError}
        alt=""
      />

      {dims && (
        <DimText>
          <StatusBadge $landscape={dims.isLandscape}>
            {dims.isLandscape ? '⬛ Landscape' : '🖼 Portrait'}
          </StatusBadge>
          <span>{dims.width} × {dims.height}</span>
        </DimText>
      )}

      {dims?.isLandscape ? (
        /* ── Landscape source → show 2 variants to pick ── */
        <>
          <div style={{ marginTop: 8, fontSize: 12, color: 'rgba(148,163,184,0.6)' }}>
            รูปเป็น <strong style={{ color: '#22d3ee' }}>แนวนอน</strong> — เลือกรูปแบบที่จะบันทึก:
          </div>
          <PickerGrid>
            {/* Portrait (cropped) */}
            <div>
              <OrientCard
                $selected={orientation === 'portrait'}
                onClick={() => onOrientationChange('portrait')}
                title="บันทึกแบบ Portrait (แนวตั้ง)"
              >
                {orientation === 'portrait' && (
                  <SelectedBadge><Check size={10} color="#fff" /></SelectedBadge>
                )}
                <CardImg src={imgSrc} $orient="portrait" alt="portrait" />
              </OrientCard>
              <CardLabel $selected={orientation === 'portrait'}>
                {orientation === 'portrait' && <Check size={10} />}
                🖼 แนวตั้ง
              </CardLabel>
            </div>

            {/* Landscape (full) */}
            <div>
              <OrientCard
                $selected={orientation === 'landscape'}
                onClick={() => onOrientationChange('landscape')}
                title="บันทึกแบบ Landscape (แนวนอน)"
              >
                {orientation === 'landscape' && (
                  <SelectedBadge><Check size={10} color="#fff" /></SelectedBadge>
                )}
                <CardImg src={imgSrc} $orient="landscape" alt="landscape" />
              </OrientCard>
              <CardLabel $selected={orientation === 'landscape'}>
                {orientation === 'landscape' && <Check size={10} />}
                ⬛ แนวนอน
              </CardLabel>
            </div>
          </PickerGrid>
          <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(148,163,184,0.4)' }}>
            <RotateCcw size={10} style={{ display: 'inline', marginRight: 4 }} />
            บันทึกในรูปแบบ: <strong style={{ color: orientation === 'portrait' ? '#a78bfa' : '#22d3ee' }}>
              {orientation === 'portrait' ? 'แนวตั้ง (Portrait)' : 'แนวนอน (Landscape)'}
            </strong>
          </div>
        </>
      ) : (
        /* ── Portrait source → show as-is ── */
        <SinglePreview $orient="portrait" style={{ marginTop: 8 }}>
          <PreviewImg
            src={imgSrc}
            alt="Cover"
            onError={handleError}
          />
        </SinglePreview>
      )}
    </Wrap>
  )
}
