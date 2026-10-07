/**
 * useFormDraft.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic hook for auto-saving and restoring form draft state via localStorage.
 * - Debounced auto-save on every state change (500ms)
 * - Restores draft on mount; returns `draftRestored` flag for UI toasts
 * - `clearDraft()` removes the key — call on successful submit or manual reset
 */

import { useEffect, useRef, useCallback } from 'react'

interface UseFormDraftOptions<T> {
  /** Unique localStorage key for this form */
  storageKey: string
  /** Current serialisable form state to persist */
  state: T
  /** Called once on mount if a saved draft was found; apply the values here */
  onRestore: (draft: T) => void
  /** Debounce delay in ms (default 600) */
  debounceMs?: number
}

interface UseFormDraftReturn {
  clearDraft: () => void
  draftRestored: boolean
}

export function useFormDraft<T extends object>({
  storageKey,
  state,
  onRestore,
  debounceMs = 600,
}: UseFormDraftOptions<T>): UseFormDraftReturn {
  const draftRestoredRef = useRef(false)
  const isFirstRender = useRef(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onRestoreRef = useRef(onRestore)
  onRestoreRef.current = onRestore

  // ── Restore on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as T
        onRestoreRef.current(parsed)
        draftRestoredRef.current = true
      }
    } catch {
      // Corrupt data — remove it
      localStorage.removeItem(storageKey)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // ── Debounced auto-save on state change ───────────────────────────────────
  useEffect(() => {
    // Skip the very first render (avoid overwriting a just-restored draft
    // with the initial empty state before onRestore has applied values)
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(state))
      } catch { /* quota exceeded — silently skip */ }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // We intentionally spread state as a serialized key to detect deep changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, JSON.stringify(state)])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [storageKey])

  return { clearDraft, draftRestored: draftRestoredRef.current }
}
