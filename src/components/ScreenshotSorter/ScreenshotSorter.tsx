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
  touch-action: none;
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
}

export default function ScreenshotSorter({ screenshots, onChange }: Props) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const dragFromIdx = useRef<number | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent, idx: number) => {
    // Only left click, ignore remove button clicks
    if (e.button !== 0) return
    dragFromIdx.current = idx
    setDraggingIdx(idx)
  }, [])

  const handleMouseEnter = useCallback((idx: number) => {
    if (dragFromIdx.current === null) return
    setOverIdx(idx)
  }, [])

  const handleMouseUp = useCallback((e: React.MouseEvent, idx: number) => {
    e.preventDefault()
    const from = dragFromIdx.current
    if (from === null) return

    dragFromIdx.current = null
    setDraggingIdx(null)
    setOverIdx(null)

    if (from === idx) return

    onChange((prev: string[]) => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(idx, 0, moved)
      return next
    })
  }, [onChange])

  const handleMouseLeaveAll = useCallback(() => {
    // If mouse leaves the entire list without dropping, cancel
    if (dragFromIdx.current !== null) {
      setOverIdx(null)
    }
  }, [])

  const handleGlobalMouseUp = useCallback(() => {
    // Catch mouse-up outside thumbs (e.g., user releases over gap)
    dragFromIdx.current = null
    setDraggingIdx(null)
    setOverIdx(null)
  }, [])

  const remove = useCallback((idx: number, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange((prev: string[]) => prev.filter((_: string, i: number) => i !== idx))
  }, [onChange])

  return (
    <List onMouseLeave={handleMouseLeaveAll} onMouseUp={handleGlobalMouseUp}>
      {screenshots.map((s, i) => (
        <Thumb
          key={s + i}
          $isDragging={draggingIdx === i}
          $isOver={overIdx === i && draggingIdx !== i}
          onMouseDown={e => handleMouseDown(e, i)}
          onMouseEnter={() => handleMouseEnter(i)}
          onMouseUp={e => handleMouseUp(e, i)}
        >
          <Img
            src={s || undefined}
            alt={`screenshot-${i}`}
            onError={e => { e.currentTarget.style.opacity = '0.3' }}
          />
          <RemoveBtn
            onMouseDown={e => e.stopPropagation()}
            onClick={e => remove(i, e)}
          >
            <X size={9} />
          </RemoveBtn>
        </Thumb>
      ))}
    </List>
  )
}
