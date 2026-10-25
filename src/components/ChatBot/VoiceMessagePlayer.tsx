import React, { useState, useRef, useEffect, useCallback } from 'react'
import styled from 'styled-components'
import { Play, Pause, Trash2, AlertCircle } from 'lucide-react'
import { formatAudioDuration } from '../../lib/audioUtils'

interface VoiceMessagePlayerProps {
  src: string
  initialDuration?: number
  onDelete?: () => void
  isAdmin?: boolean
  compact?: boolean
  className?: string
}

const PlayerContainer = styled.div<{ $isAdmin?: boolean; $compact?: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${p => p.$isAdmin ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.35)'};
  backdrop-filter: blur(8px);
  padding: ${p => p.$compact ? '6px 10px' : '8px 12px'};
  border-radius: 14px;
  border: 1px solid ${p => p.$isAdmin ? 'rgba(255, 255, 255, 0.2)' : 'rgba(124, 58, 237, 0.25)'};
  width: 100%;
  min-width: 180px;
  max-width: ${p => p.$compact ? '220px' : '260px'};
  box-sizing: border-box;
  user-select: none;
`

const PlayBtn = styled.button<{ $isPlaying: boolean; $isAdmin?: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: ${p => p.$isAdmin ? '#ffffff' : '#7c3aed'};
  color: ${p => p.$isAdmin ? '#7c3aed' : '#ffffff'};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);

  &:hover {
    transform: scale(1.05);
    background: ${p => p.$isAdmin ? '#f1f5f9' : '#8b5cf6'};
  }

  &:active {
    transform: scale(0.95);
  }
`

const TrackArea = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  gap: 4px;
  min-width: 0;
`

const ProgressBarWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  cursor: pointer;
  touch-action: none;
`

const ProgressBarFill = styled.div<{ $progress: number; $isAdmin?: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${p => Math.min(100, Math.max(0, p.$progress))}%;
  background: ${p => p.$isAdmin ? '#ffffff' : '#a78bfa'};
  border-radius: 999px;
  transition: width 0.08s linear;
`

const TimeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.85);
  line-height: 1;
`

const DurationText = styled.span<{ $isAdmin?: boolean }>`
  font-weight: 600;
  color: ${p => p.$isAdmin ? '#ffffff' : '#c4b5fd'};
`

const DeleteBtn = styled.button`
  background: none;
  border: none;
  color: rgba(248, 113, 113, 0.85);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s ease;
  flex-shrink: 0;

  &:hover {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
  }
`

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  src,
  initialDuration = 0,
  onDelete,
  isAdmin = false,
  compact = false,
  className
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState<number>(initialDuration || 0)
  const [error, setError] = useState(false)

  // Sync initial duration if updated from parent
  useEffect(() => {
    if (initialDuration > 0 && (!duration || duration === 0)) {
      setDuration(initialDuration)
    }
  }, [initialDuration, duration])

  // Pause and cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.src = ''
      }
    }
  }, [])

  const togglePlay = useCallback(async () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      setError(false)
      try {
        await audioRef.current.play()
        setIsPlaying(true)
      } catch (err) {
        console.warn('[VoiceMessagePlayer] Play error (user interaction needed):', err)
        setIsPlaying(false)
        setError(true)
      }
    }
  }, [isPlaying])

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    const d = audioRef.current.duration
    // Some browsers report Infinity for streaming WebM/Ogg before seeking
    if (d && isFinite(d) && !isNaN(d) && d > 0) {
      setDuration(Math.round(d))
    } else if (initialDuration > 0) {
      setDuration(initialDuration)
    }
  }

  const handleEnded = () => {
    setIsPlaying(false)
    setCurrentTime(0)
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !duration || duration <= 0) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percent = Math.max(0, Math.min(1, clickX / rect.width))
    const newTime = percent * duration
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0
  const displayDuration = formatAudioDuration(isPlaying ? currentTime : (duration || initialDuration || 0))

  return (
    <PlayerContainer $isAdmin={isAdmin} $compact={compact} className={className}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setError(true)}
      />

      <PlayBtn
        type="button"
        onClick={togglePlay}
        $isPlaying={isPlaying}
        $isAdmin={isAdmin}
        title={isPlaying ? 'Pause' : 'Play voice message'}
      >
        {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" style={{ marginLeft: 2 }} />}
      </PlayBtn>

      <TrackArea>
        <ProgressBarWrapper onClick={handleSeek}>
          <ProgressBarFill $progress={progressPercent} $isAdmin={isAdmin} />
        </ProgressBarWrapper>
        <TimeRow>
          <DurationText $isAdmin={isAdmin}>
            {isPlaying ? `${displayDuration} / ${formatAudioDuration(duration || initialDuration)}` : displayDuration}
          </DurationText>
          {error && (
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10 }}>
              <AlertCircle size={10} /> Error
            </span>
          )}
        </TimeRow>
      </TrackArea>

      {onDelete && (
        <DeleteBtn type="button" onClick={onDelete} title="Remove audio">
          <Trash2 size={14} />
        </DeleteBtn>
      )}
    </PlayerContainer>
  )
}
export default VoiceMessagePlayer
