/**
 * Cross-platform Audio & MediaStream utilities for robust mobile recording.
 * Handles iOS Safari (audio/mp4, audio/aac) and Android/Chrome (audio/webm;codecs=opus).
 * Includes permission checking to prevent permission re-prompts on page refresh.
 */

/**
 * Detects the most optimal audio MIME type supported by the current browser.
 * Priority: webm/opus (Chrome) → mp4 (iOS Safari) → aac → ogg → fallback empty.
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
 * iOS/Safari uses mp4 container, Chrome/Android uses webm.
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
        console.warn('Error stopping audio track:', err)
      }
    })
  } catch (err) {
    console.warn('Error getting tracks from stream:', err)
  }
}

/**
 * Checks the current microphone permission status WITHOUT triggering a permission prompt.
 * Returns 'granted' | 'denied' | 'prompt' | 'unknown'.
 *
 * On browsers that do not support navigator.permissions (e.g. some older iOS WebView)
 * this returns 'unknown', and the caller should proceed to getUserMedia normally.
 */
export const checkMicrophonePermission = async (): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> => {
  if (typeof navigator === 'undefined' || !navigator.permissions) return 'unknown'
  try {
    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    return result.state as 'granted' | 'denied' | 'prompt'
  } catch {
    // Older Safari / Firefox may throw for 'microphone' query
    return 'unknown'
  }
}

/**
 * Requests getUserMedia for audio only if the permission has been granted or is unknown.
 * Avoids re-prompting on page refresh if permission is already 'prompt' (not yet decided).
 *
 * @param forcePrompt - Set true only when the user explicitly taps the mic button.
 *   On mobile you MUST call this from a direct user-gesture event handler (onClick/onTouchEnd).
 */
export const requestMicrophoneAccess = async (forcePrompt = true): Promise<MediaStream | null> => {
  const permStatus = await checkMicrophonePermission()

  // If permission is explicitly denied — bail immediately, no prompt.
  if (permStatus === 'denied') {
    console.warn('[audioUtils] Microphone permission is denied by the user.')
    return null
  }

  // If forcePrompt is false and permission hasn't been decided, skip silently.
  // This prevents automatic permission modals on page load / refresh.
  if (!forcePrompt && permStatus === 'prompt') {
    return null
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 44100,
      }
    })
    return stream
  } catch (err: any) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      console.warn('[audioUtils] Microphone access denied by user.')
    } else {
      console.error('[audioUtils] getUserMedia error:', err)
    }
    return null
  }
}
