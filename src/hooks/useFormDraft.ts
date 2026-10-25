/**
 * useFormDraft.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Cross-platform form draft persistence with mobile-first lifecycle management.
 *
 * Solves mobile state loss on refresh/tab suspension (iOS Safari & Android Chrome) via:
 * 1. Safe Multi-Tier Storage (localStorage + sessionStorage fallback with quota safety)
 * 2. Real-Time Debounced Saving (saves as user types, not just on timer)
 * 3. Immediate Synchronous Flush on Mobile Lifecycle Events (pagehide, visibilitychange:hidden, beforeunload)
 * 4. Reliable Hydration on Mount with safe JSON parsing and content validation
 * 5. Infinite Loop Prevention using stable refs and state diffing
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/** Safe storage wrapper with dual localStorage/sessionStorage persistence and quota handling */
export const safeStorage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    // 1. Try localStorage
    try {
      const local = window.localStorage.getItem(key)
      if (local) return JSON.parse(local) as T
    } catch {}

    // 2. Fallback: sessionStorage (e.g. mobile Safari private mode)
    try {
      const session = window.sessionStorage.getItem(key)
      if (session) return JSON.parse(session) as T
    } catch {}

    return null
  },

  set: <T>(key: string, value: T): boolean => {
    if (typeof window === 'undefined') return false
    let serialized: string
    try {
      serialized = JSON.stringify(value)
    } catch (e) {
      console.warn('[useFormDraft] Serialization failed:', e)
      return false
    }

    let saved = false
    // 1. Write to localStorage
    try {
      window.localStorage.setItem(key, serialized)
      saved = true
    } catch (e) {
      console.warn('[useFormDraft] localStorage.setItem failed (quota/private mode):', e)
    }

    // 2. Also write to sessionStorage for redundancy on mobile web views
    try {
      window.sessionStorage.setItem(key, serialized)
      saved = true
    } catch {}

    return saved
  },

  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    try { window.localStorage.removeItem(key) } catch {}
    try { window.sessionStorage.removeItem(key) } catch {}
  }
}

export interface UseFormDraftOptions<T> {
  /** Unique storage key for this form */
  storageKey: string
  /** Current serialisable form state to persist */
  state: T
  /** Called when draft is restored; apply values here */
  onRestore: (draft: T) => void
  /** Debounce delay in ms (default 300ms for fast mobile persistence) */
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
  debounceMs = 300,
  autoRestore = true,
  hasContent,
}: UseFormDraftOptions<T>): UseFormDraftReturn<T> {
  const [savedDraft, setSavedDraft] = useState<T | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  // ── Stable refs to prevent effect re-trigger cycles ───────────────────────
  const isRestoredRef = useRef(false)
  const isMountedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')
  const onRestoreRef = useRef(onRestore)
  const stateRef = useRef(state)
  const storageKeyRef = useRef(storageKey)
  const autoRestoreRef = useRef(autoRestore)

  // Update refs synchronously on every render
  onRestoreRef.current = onRestore
  stateRef.current = state
  storageKeyRef.current = storageKey
  autoRestoreRef.current = autoRestore

  // ── Stable hasContent checker ─────────────────────────────────────────────
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
  }, [])

  // ── Synchronous flush to storage ──────────────────────────────────────────
  const saveNow = useCallback(() => {
    const currentState = stateRef.current
    const key = storageKeyRef.current

    // Safety: Never overwrite an existing draft if the current state is empty and un-restored
    if (!checkHasContent(currentState) && !isRestoredRef.current) {
      return
    }

    const currentJson = JSON.stringify(currentState)
    if (currentJson === lastSavedRef.current) return // No changes

    const success = safeStorage.set(key, currentState)
    if (success) {
      lastSavedRef.current = currentJson
    }
  }, [checkHasContent])

  // ── Initial draft check on mount (Hydration) ──────────────────────────────
  useEffect(() => {
    const parsed = safeStorage.get<T>(storageKey)
    if (parsed && checkHasContent(parsed)) {
      lastSavedRef.current = JSON.stringify(parsed)
      setSavedDraft(parsed)
      if (autoRestoreRef.current) {
        isRestoredRef.current = true
        onRestoreRef.current(parsed)
        setDraftRestored(true)
      } else {
        setHasDraft(true)
      }
    }
    isMountedRef.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Mount-only

  // ── Real-time debounced save as user interacts/types ──────────────────────
  useEffect(() => {
    if (!isMountedRef.current) return

    // Don't save empty state before user restores or inputs content
    if (!checkHasContent(state) && !isRestoredRef.current) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      saveNow()
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [state, debounceMs, checkHasContent, saveNow])

  // ── Mobile Lifecycle Hooks (Immediate Flush before refresh / tab switch) ───
  useEffect(() => {
    const handleVisibilityChange = () => {
      // visibilitychange (hidden) is the most reliable event on iOS Safari & Android Chrome
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        saveNow()
      }
    }

    const handlePageHide = () => {
      // pagehide fires reliably on mobile browsers when refreshing or navigating away
      saveNow()
    }

    const handleBeforeUnload = () => {
      // desktop fallback
      saveNow()
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', handlePageHide)
      window.addEventListener('beforeunload', handleBeforeUnload)
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('pagehide', handlePageHide)
        window.removeEventListener('beforeunload', handleBeforeUnload)
      }
    }
  }, [saveNow])

  // ── Public API ────────────────────────────────────────────────────────────
  const restoreDraft = useCallback(() => {
    const draft = savedDraft
    if (!draft) return
    isRestoredRef.current = true
    onRestoreRef.current(draft)
    setDraftRestored(true)
    setHasDraft(false)
  }, [savedDraft])

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    safeStorage.remove(storageKeyRef.current)
    lastSavedRef.current = ''
    setSavedDraft(null)
    setHasDraft(false)
    isRestoredRef.current = false
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
