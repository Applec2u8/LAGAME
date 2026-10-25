/**
 * Cross-platform Audio & MediaStream utilities for robust mobile recording.
 * Handles iOS Safari (audio/mp4, audio/aac) and Android/Chrome (audio/webm;codecs=opus).
 *
 * Implements persistent permission checking and session-level caching to prevent
 * native permission popups on page reloads/refreshes, and guarantees clean track
 * teardown on pagehide/beforeunload.
 */

const SESSION_MIC_KEY = 'lagame_mic_permission_status'

/** Registry of active media streams to guarantee hardware release on unload */
const activeMediaStreams = new Set<MediaStream>()

/**
 * Cleanly stops all tracks across all tracked active streams.
 * Crucial on mobile iOS Safari & Android WebView to release hardware audio sessions
 * before page refresh or navigation.
 */
export const stopAllActiveMediaStreams = (): void => {
  activeMediaStreams.forEach((stream) => {
    stopMediaStreamTracks(stream)
  })
  activeMediaStreams.clear()
}

// Automatically release all microphone hardware when navigating away or refreshing
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', stopAllActiveMediaStreams)
  window.addEventListener('beforeunload', stopAllActiveMediaStreams)
}

/**
 * Detects the most optimal audio MIME type supported by the current browser.
 * Priority: webm/opus (Chrome/Android) → mp4 (iOS Safari) → aac → ogg → fallback empty.
 */
export const getSupportedAudioMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus',
  ]

  for (const type of types) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
}

/**
 * Returns a safe file extension for an audio MIME type string.
 * iOS/Safari uses mp4/m4a container, Chrome/Android uses webm.
 */
export const getAudioFileExtension = (mimeType: string): string => {
  if (!mimeType) return 'webm'
  if (mimeType.includes('mp4') || mimeType.includes('aac') || mimeType.includes('m4a')) return 'm4a'
  if (mimeType.includes('ogg')) return 'ogg'
  return 'webm'
}

/**
 * Safely stops all tracks on a MediaStream and nullifies their references.
 * Essential for mobile browsers (iOS Safari, Android Chrome/WebView) to
 * release hardware audio sessions and prevent microphone lockups or repeated
 * permission prompts.
 */
export const stopMediaStreamTracks = (stream: MediaStream | null | undefined): void => {
  if (!stream) return
  try {
    const tracks = stream.getTracks()
    tracks.forEach(track => {
      try {
        track.stop()
      } catch (err) {
        console.warn('[audioUtils] Error stopping audio track:', err)
      }
    })
  } catch (err) {
    console.warn('[audioUtils] Error getting tracks from stream:', err)
  } finally {
    activeMediaStreams.delete(stream)
  }
}

/**
 * Checks the current microphone permission status WITHOUT triggering a permission prompt.
 * Uses navigator.permissions.query where supported (Chrome/Android/Firefox).
 * On iOS Safari (where permissions.query({ name: 'microphone' }) throws a TypeError),
 * falls back to session-level caching (sessionStorage) so refresh doesn't reprompt.
 */
export const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'unknown'

  // 1. Try native permissions API (Chromium, Firefox, Desktop Safari 16+)
  if (navigator.permissions && typeof navigator.permissions.query === 'function') {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      const state = result.state as 'granted' | 'denied' | 'prompt'

      // Synchronize session storage cache
      try {
        sessionStorage.setItem(SESSION_MIC_KEY, state)
      } catch {}

      // Keep cache updated if user changes permission in browser settings
      result.onchange = () => {
        try {
          sessionStorage.setItem(SESSION_MIC_KEY, result.state)
        } catch {}
      }

      return state
    } catch {
      // iOS Safari throws TypeError: 'microphone' is not a valid PermissionName
    }
  }

  // 2. Fallback: check session-level memory for iOS / unsupported browsers
  try {
    const cachedState = sessionStorage.getItem(SESSION_MIC_KEY)
    if (cachedState === 'granted' || cachedState === 'denied' || cachedState === 'prompt') {
      return cachedState
    }
  } catch {}

  return 'unknown'
}

/**
 * Requests getUserMedia for audio only if the permission has been granted or is requested
 * via direct user interaction (onClick/onTouchEnd).
 *
 * Avoids re-prompting on page refresh by:
 * 1. Checking permission state beforehand.
 * 2. Never executing passive requests if permission hasn't been granted.
 * 3. Tracking active streams in activeMediaStreams for instant cleanup on beforeunload.
 *
 * @param forcePrompt - Set true ONLY when user explicitly taps a mic button.
 */
export const requestMicrophoneAccess = async (forcePrompt = true): Promise<MediaStream | null> => {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    console.warn('[audioUtils] getUserMedia is not supported in this environment.')
    return null
  }

  const permStatus = await checkMicrophonePermission()

  // If permission is explicitly denied — bail immediately, never trigger native prompt.
  if (permStatus === 'denied') {
    console.warn('[audioUtils] Microphone permission is denied by the user.')
    return null
  }

  // If forcePrompt is false and permission hasn't already been granted, skip silently.
  // This prevents automatic permission modals on page load / refresh.
  if (!forcePrompt && permStatus !== 'granted') {
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    })

    // Track stream for automated teardown on page refresh
    activeMediaStreams.add(stream)

    // Mark as granted for current session
    try {
      sessionStorage.setItem(SESSION_MIC_KEY, 'granted')
    } catch {}

    // Automatically remove from activeMediaStreams when any track ends
    stream.getTracks().forEach(track => {
      track.addEventListener('ended', () => {
        if (!stream.active) {
          activeMediaStreams.delete(stream)
        }
      }, { once: true })
    })

    return stream
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      console.warn('[audioUtils] Microphone access denied by user.')
      try {
        sessionStorage.setItem(SESSION_MIC_KEY, 'denied')
      } catch {}
    } else {
      console.error('[audioUtils] getUserMedia error:', err)
    }
    return null
  }
}

/**
 * Formats a duration in seconds into M:SS (e.g. 0:05, 1:23).
 */
export const formatAudioDuration = (seconds: number): string => {
  if (!seconds || isNaN(seconds) || seconds < 0 || !isFinite(seconds)) return '0:00'
  const rounded = Math.round(seconds)
  const m = Math.floor(rounded / 60)
  const s = rounded % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Extracts duration in seconds from a voice message content string,
 * e.g. "🎤 Voice Message (0:04)" -> 4 seconds.
 * Returns null if no duration format is found.
 */
export const parseVoiceMessageDuration = (content?: string): number | null => {
  if (!content) return null
  const match = content.match(/\((\d+):(\d{2})\)/)
  if (!match) return null
  const mins = parseInt(match[1], 10)
  const secs = parseInt(match[2], 10)
  return mins * 60 + secs
}
