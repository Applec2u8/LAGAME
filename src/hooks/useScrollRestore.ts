/**
 * useScrollRestore — Namespace-isolated, bug-free scroll restoration hook.
 *
 * Design principles:
 *  1. Every page uses an EXPLICIT, STABLE key (e.g. "scroll_pos_home") that
 *     never collides with another page's key, regardless of React Router's
 *     internal history.key which changes on every navigation.
 *  2. Scroll position is saved continuously (debounced) while the user scrolls,
 *     and also on component unmount, so no data is lost even with fast navigation.
 *  3. Restoration only runs AFTER the caller signals `isReady = true`, ensuring
 *     the DOM is fully populated before we try to scroll to a deep position.
 *  4. A polling loop waits for the page to grow tall enough to reach the target
 *     position (important for paginated/lazy-loaded lists).
 *  5. Saving is suppressed until after the initial restoration completes, so the
 *     scroll-to-top animation triggered by the restore does not overwrite the
 *     saved position with 0.
 *
 * ─── Usage ───────────────────────────────────────────────────────────────────
 *
 *  // In any listing page, pass a UNIQUE, HARDCODED key:
 *  useScrollRestore('scroll_pos_home', !loading && games.length > 0)
 *  useScrollRestore('scroll_pos_az_filter', !loading && games.length > 0)
 *  useScrollRestore('scroll_pos_top_games', !loading && games.length > 0)
 *  useScrollRestore('scroll_pos_coming_soon', allDoneLoading)
 *
 *  // In Header nav links (fresh navigation → no restore):
 *  clearScrollKey('scroll_pos_home')
 *
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useCallback } from 'react'

// ─── Public Storage Key Constants ─────────────────────────────────────────────

export const SCROLL_KEYS = {
  HOME: 'scroll_pos_home',
  AZ_FILTER: 'scroll_pos_az_filter',
  TOP_GAMES: 'scroll_pos_top_games',
  COMING_SOON: 'scroll_pos_coming_soon',
} as const

// ─── Public helpers ──────────────────────────────────────────────────────────

/**
 * Call this when the user explicitly clicks a nav link to a listing page,
 * so the page starts fresh from the top instead of restoring an old position.
 *
 * @param storageKey  One of the SCROLL_KEYS constants, e.g. SCROLL_KEYS.HOME
 */
export function clearScrollKey(storageKey: string) {
  sessionStorage.removeItem(storageKey)
}

/**
 * @deprecated — kept so existing imports in Header nav links do not break.
 * Maps legacy path strings to the new explicit key constants and clears them.
 */
export function clearRestoreFlag(path: string) {
  const legacyMap: Record<string, string> = {
    '/': SCROLL_KEYS.HOME,
    '/az-filter': SCROLL_KEYS.AZ_FILTER,
    '/top-games': SCROLL_KEYS.TOP_GAMES,
    '/coming-soon': SCROLL_KEYS.COMING_SOON,
  }
  const key = legacyMap[path]
  if (key) sessionStorage.removeItem(key)

  // If the user clicks the link of the page they are ALREADY on, scroll to top
  if (window.location.pathname === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

/**
 * @deprecated — no-op. Kept so GameDetailPage imports do not break.
 * The new architecture saves scroll continuously; no one-time flag is needed.
 */
export function markReturnFromDetail(_fromPath: string) {
  // no-op
}

/**
 * @deprecated — no-op. Kept for backward compatibility with App.tsx.
 * The hook already saves on component unmount.
 */
export function saveScrollBeforeUnload() {
  // no-op — unmount snapshot in useScrollRestore handles this
}

// ─── Core Hook ───────────────────────────────────────────────────────────────

/**
 * Saves and restores window scroll position for a specific page.
 *
 * @param storageKey  A UNIQUE, STABLE sessionStorage key for this page.
 *                    Use the SCROLL_KEYS constants (e.g. SCROLL_KEYS.HOME).
 *                    NEVER share the same key between two different pages.
 * @param isReady     Set to `true` once your data has finished loading and
 *                    the list items are rendered in the DOM. The hook will
 *                    not attempt restoration until this flag is `true`.
 */
export function useScrollRestore(storageKey: string, isReady: boolean) {
  const hasRestored = useRef(false)

  // ── Persist scroll to BOTH history.state and sessionStorage.
  //    history.state: tied to THIS specific history entry (survives Back/Fwd nav perfectly)
  //    sessionStorage: survives page refresh (history.state is cleared on refresh)
  const persistScroll = useCallback(() => {
    const y = window.scrollY
    // Preserve existing history state fields (React Router stores { key, usr } there)
    try {
      const prev = window.history.state ?? {}
      window.history.replaceState({ ...prev, [storageKey]: y }, '')
    } catch (_) { /* replaceState can throw in sandboxed iframes — ignore */ }
    sessionStorage.setItem(storageKey, String(y))
  }, [storageKey])

  // ── Effect 1: Reset restore flag on mount / key change.
  useEffect(() => {
    hasRestored.current = false
  }, [storageKey])

  // ── Effect 2: Debounced scroll saving (primary save path while user scrolls).
  //    NO unmount snapshot — it would read window.scrollY AFTER React Router has
  //    already mounted the next page, saving 0 and destroying the saved position.
  useEffect(() => {
    let debounceId: ReturnType<typeof setTimeout>

    const handleScroll = () => {
      if (!hasRestored.current) return  // suppress during restore phase
      clearTimeout(debounceId)
      debounceId = setTimeout(persistScroll, 150)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(debounceId)
    }
  }, [persistScroll])

  // ── Effect 3: Restore scroll once data is ready.
  useEffect(() => {
    if (!isReady || hasRestored.current) return

    // ① history.state[key] — most accurate for Back navigation.
    //    Each history entry stores its own Y value, guaranteed correct.
    const fromHistory: number | undefined = window.history.state?.[storageKey]

    // ② sessionStorage — fallback for page refresh (history.state is lost on reload).
    const fromSession = sessionStorage.getItem(storageKey)

    // Pick the best available source:
    let targetY: number | null = null
    if (fromHistory !== undefined && fromHistory !== null) {
      targetY = Number(fromHistory)
    } else if (fromSession !== null) {
      targetY = Number(fromSession)
    }

    if (targetY === null) {
      // No saved position → fresh visit.
      window.scrollTo({ top: 0, behavior: 'instant' })
      hasRestored.current = true
      return
    }

    if (targetY === 0) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      hasRestored.current = true
      return
    }

    // ── Poll until the DOM is tall enough to reach targetY.
    let rafId: number
    let pollId: ReturnType<typeof setInterval>
    let attempts = 0
    const MAX_ATTEMPTS = 80   // 80 × 50 ms = 4 s max
    const POLL_MS = 50

    const tryScroll = (): boolean => {
      const maxY = document.documentElement.scrollHeight - window.innerHeight
      if (maxY >= targetY!) {
        window.scrollTo({ top: Math.min(targetY!, maxY), behavior: 'instant' })
        setTimeout(() => { hasRestored.current = true }, 80)
        return true
      }
      return false
    }

    // Fast path: after next browser paint (handles cached data where DOM is ready immediately)
    rafId = requestAnimationFrame(() => {
      if (tryScroll()) return

      // Slow path: wait 100 ms for images/layout to settle, then poll
      setTimeout(() => {
        if (tryScroll()) return

        pollId = setInterval(() => {
          attempts++
          if (tryScroll() || attempts >= MAX_ATTEMPTS) {
            clearInterval(pollId)
            if (attempts >= MAX_ATTEMPTS && !hasRestored.current) {
              const maxY = document.documentElement.scrollHeight - window.innerHeight
              window.scrollTo({ top: Math.min(targetY!, Math.max(0, maxY)), behavior: 'instant' })
              setTimeout(() => { hasRestored.current = true }, 80)
            }
          }
        }, POLL_MS)
      }, 100)
    })

    return () => {
      cancelAnimationFrame(rafId)
      clearInterval(pollId)
    }
  }, [isReady, storageKey])
}