/**
 * Cross-platform Audio & MediaStream utilities for robust mobile recording.
 * Provides MIME type detection (supporting iOS Safari MP4/AAC and Chrome WebM)
 * and guaranteed MediaStream track termination.
 */

/**
 * Detects the most optimal audio MIME type supported by the current browser.
 * Safari / iOS requires 'audio/mp4' or 'audio/aac', whereas Chrome / Firefox
 * prefer 'audio/webm;codecs=opus'.
 */
export const getSupportedAudioMimeType = (): string => {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') return ''

  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg;codecs=opus'
  ]

  for (const type of types) {
    if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }

  return ''
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
