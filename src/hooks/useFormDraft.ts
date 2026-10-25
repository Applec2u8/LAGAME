/**
 * useFormDraft.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic hook for auto-saving and restoring form draft state via localStorage.
 * - Debounced auto-save on every state change (600ms)
 * - Supports `autoRestore: true` (for page refresh / edit mode)
 * - Supports `autoRestore: false` (fresh sessions — draft offered via banner)
 * - Exposes `savedDraft`, `hasDraft`, `restoreDraft()`, `clearDraft()`
 *
 * FIX: Eliminated "Maximum update depth exceeded" infinite loop by:
 *   1. Storing state in a ref for the auto-save effect (avoids effect re-run on every keystroke)
 *   2. Using a stable debounce timer that compares serialized state before saving
 *   3. Guarding restore with a flag ref so re-renders from `onRestore` don't re-trigger the effect
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface UseFormDraftOptions<T> {
  /** Unique localStorage key for this form */
  storageKey: string
  /** Current serialisable form state to persist */
  state: T
  /** Called when draft is restored; apply values here */
  onRestore: (draft: T) => void
  /** Debounce delay in ms (default 600) */
  debounceMs?: number
  /**
   * If true (default), draft is automatically applied on mount.
   * If false, draft is placed in `savedDraft` and can be restored manually via `restoreDraft()`.
   */
  autoRestore?: boolean
  /** Optional function to verify if a draft has meaningful user content */
  hasContent?: (draft: T) => boolean
}

export interface UseFormDraftReturn<T> {
  clearDraft: () => void
  restoreDraft: () => void
  savedDraft: T | null
  hasDraft: boolean
  draftRestored: boolean
  dismissDraftPrompt: () => void
}

export function useFormDraft<T extends object>({
  storageKey,
  state,
  onRestore,
  debounceMs = 600,
  autoRestore = true,
  hasContent,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const [savedDraft, setSavedDraft] = useState<T | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  // ── Stable refs (never change identity → never cause effect re-runs) ────────
  const isRestoredRef = useRef(false)
  const isMountedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')        // last JSON we wrote to localStorage
  const onRestoreRef = useRef(onRestore)
  const stateRef = useRef(state)                 // always current, no dep array needed
  const storageKeyRef = useRef(storageKey)

  // Keep refs in sync with latest values on every render (no effect, no deps)
  onRestoreRef.current = onRestore
  stateRef.current = state
  storageKeyRef.current = storageKey

  // ── hasContent helper (stable) ──────────────────────────────────────────────
  const hasContentRef = useRef(hasContent)
  hasContentRef.current = hasContent

  const checkHasContent = useCallback((d: any): boolean => {
    if (!d || typeof d !== 'object') return false
    if (hasContentRef.current) return hasContentRef.current(d)
    return Object.entries(d).some(([, val]) => {
      if (typeof val === 'boolean') return false
      if (typeof val === 'string') return val.trim().length > 0
      if (Array.isArray(val)) {
        if (val.length === 0) return false
        return val.some((item) => {
          if (typeof item === 'string') return item.trim().length > 0
          if (typeof item === 'object' && item !== null) {
            return (item as any).url && (item as any).url.trim().length > 0
          }
          return false
        })
      }
      return false
    })
  }, []) // no deps — reads hasContentRef.current at call-time

  // ── Initial draft check on mount (runs once) ────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as T
        if (checkHasContent(parsed)) {
          lastSavedRef.current = raw
          setSavedDraft(parsed)
          if (autoRestore) {
            onRestoreRef.current(parsed)
            isRestoredRef.current = true
            setDraftRestored(true)
          } else {
            setHasDraft(true)
          }
        }
      }
    } catch {
      localStorage.removeItem(storageKey)
    }
    isMountedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally empty — run once on mount only

  // ── Debounced auto-save using a stable interval ─────────────────────────────
  // This effect does NOT depend on `state` directly — instead it reads stateRef.current
  // inside the timer callback. This breaks the setState → effect → setState loop.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMountedRef.current) return

      // Don't persist while user is viewing the "restore draft?" banner without having
      // made any changes yet (prevents overwriting the displayed savedDraft)
      if (!autoRestore && !isRestoredRef.current) return

      const currentJson = JSON.stringify(stateRef.current)
      if (currentJson === lastSavedRef.current) return // nothing changed

      try {
        localStorage.setItem(storageKeyRef.current, currentJson)
        lastSavedRef.current = currentJson
      } catch {
        /* quota exceeded — silently skip */
      }
    }, debounceMs)

    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounceMs, autoRestore]) // only re-create if these config values change

  // ── Public API ──────────────────────────────────────────────────────────────
  const restoreDraft = useCallback(() => {
    const draft = savedDraft
    if (!draft) return
    // Mark restored BEFORE calling onRestore to prevent any auto-save
    // triggered by the resulting setState calls from writing an empty state
    isRestoredRef.current = true
    onRestoreRef.current(draft)
    setDraftRestored(true)
    setHasDraft(false)
  }, [savedDraft])

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    try { localStorage.removeItem(storageKeyRef.current) } catch { /* ok */ }
    lastSavedRef.current = ''
    setSavedDraft(null)
    setHasDraft(false)
  }, [])

  const dismissDraftPrompt = useCallback(() => {
    setHasDraft(false)
  }, [])

  return {
    clearDraft,
    restoreDraft,
    savedDraft,
    hasDraft,
    draftRestored,
    dismissDraftPrompt,
  }
}
