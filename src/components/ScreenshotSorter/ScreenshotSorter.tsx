import { useRef, useState, useCallback } from 'react'
import styled from 'styled-components'
import { X } from 'lucide-react'

const List = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  user-select: none;
`

const Thumb = styled.div<{ $isDragging?: boolean; $isOver?: boolean }>`
  position: relative;
  border-radius: 6px;
  opacity: ${p => p.$isDragging ? 0.35 : 1};
  outline: ${p => p.$isOver ? '2px solid #7c3aed' : 'none'};
  outline-offset: 2px;
  transition: opacity 0.15s, outline 0.1s;
  cursor: grab;
  touch-action: none; /* Prevent scrolling on touch devices while dragging */
  &:active { cursor: grabbing; }
`

const Img = styled.img`
  display: block;
  width: 80px;
  height: 52px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid rgba(124,58,237,0.2);
  pointer-events: none;
  user-select: none;
`

const RemoveBtn = styled.button`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 18px;
  height: 18px;
  background: #ef4444;
  border: none;
  border-radius: 50%;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 10px;
  z-index: 10;
`

interface Props {
  screenshots: string[]
  onChange: (next: string[] | ((prev: string[]) => string[])) => void
  onUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

const UploadCard = styled.label`
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 80px; height: 52px; border-radius: 6px;
  background: rgba(124,58,237,0.1); border: 1px dashed rgba(124,58,237,0.4);
  color: #a855f7; cursor: pointer; transition: all 0.2s;
  &:hover { background: rgba(124,58,237,0.2); }
  svg { margin-bottom: 2px; }
  span { font-size: 10px; font-weight: 600; }
`

export default function ScreenshotSorter({ screenshots, onChange, onUpload }: Props) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragFromIdx = useRef<number | null>(null)

  const handleDragStart = useCallback((idx: number) => {
    dragFromIdx.current = idx
    setDraggingIdx(idx)
  }, [])

  const handleDragOver = useCallback((idx: number) => {
    if (dragFromIdx.current === null) return
    setOverIdx(idx)
  }, [])

  const handleDragEnd = useCallback((idx: number | null) => {
    const from = dragFromIdx.current
    dragFromIdx.current = null
    setDraggingIdx(null)
    setOverIdx(null)

    if (from === null || idx === null || from === idx) return

    onChange((prev: string[]) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }, [onChange])

  // Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent, idx: number) => {
    if (e.button !== 0) return
    handleDragStart(idx)
  }
  
  const handleMouseUp = (e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    handleDragEnd(idx)
  }

  const handleGlobalMouseUp = useCallback(() => {
    handleDragEnd(null)
  }, [handleDragEnd])

  // Touch Handlers
  const handleTouchStart = (idx: number) => {
    handleDragStart(idx)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragFromIdx.current === null) return
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const thumbEl = el?.closest('[data-idx]')
    if (thumbEl) {
      const idx = parseInt(thumbEl.getAttribute('data-idx') || '-1', 10)
      if (idx !== -1) handleDragOver(idx)
    } else {
      setOverIdx(null)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const thumbEl = el?.closest('[data-idx]')
    let targetIdx: number | null = null
    if (thumbEl) {
      targetIdx = parseInt(thumbEl.getAttribute('data-idx') || '-1', 10)
      if (targetIdx === -1) targetIdx = null
    }
    handleDragEnd(targetIdx)
  }

  const remove = useCallback((idx: number, e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation()
    onChange((prev: string[]) => prev.filter((_: string, i: number) => i !== idx))
  }, [onChange])

  return (
    <List onMouseLeave={() => setOverIdx(null)} onMouseUp={handleGlobalMouseUp}>
      {onUpload && (
        <UploadCard>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          <span>Upload</span>
          <input type="file" accept="image/*" hidden multiple onChange={onUpload} />
        </UploadCard>
      )}
      {screenshots.map((s, i) => (
        <Thumb
          key={s + i}
          data-idx={i}
          $isDragging={draggingIdx === i}
          $isOver={overIdx === i && draggingIdx !== i}
          onMouseDown={e => handleMouseDown(e, i)}
          onMouseEnter={() => handleDragOver(i)}
          onMouseUp={e => handleMouseUp(e, i)}
          onTouchStart={() => handleTouchStart(i)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <Img
            src={s || undefined}
            alt={`screenshot-${i}`}
            onError={e => { e.currentTarget.style.opacity = '0.3' }}
          />
          <RemoveBtn
            onMouseDown={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onClick={e => remove(i, e)}
          >
            <X size={9} />
          </RemoveBtn>
        </Thumb>
      ))}
    </List>
  )
}
