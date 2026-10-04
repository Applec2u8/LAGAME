// src/lib/i18n/LanguageContext.tsx
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { translate, type Locale } from './locales'

// ── Types ──────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  isTranslating: boolean
  setIsTranslating: (val: boolean) => void
  /** Translate a static UI key */
  t: (key: string) => string
  /** Manually re-trigger Google Translate for current locale */
  retriggerTranslation: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────
const POLL_INTERVAL = 200
const POLL_TIMEOUT  = 10_000

function fireGoogleTranslate(lang: Locale): boolean {
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (!select) return false
  const val = lang === 'en' ? '' : lang
  select.value = val
  select.dispatchEvent(new Event('change', { bubbles: true }))
  // Double-fire to overcome GT widget debounce
  setTimeout(() => {
    select.value = val
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, 180)
  return true
}

// ── Context ────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextValue | null>(null)

// ── Provider ───────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('lapack_locale')
    return (saved as Locale) ?? 'en'
  })
  
  const [isTranslating, setIsTranslatingState] = useState(() => {
    return localStorage.getItem('lapack_translating') === 'true'
  })

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('lapack_locale', l)
  }, [])

  const setIsTranslating = useCallback((val: boolean) => {
    setIsTranslatingState(val)
    localStorage.setItem('lapack_translating', String(val))
  }, [])

  const t = useCallback(
    (key: string) => translate(locale, key),
    [locale]
  )

  // ── Auto-trigger Google Translate on every locale change / page mount ──
  const triggerWithPoll = useCallback((lang: Locale) => {
    if (pollRef.current) clearInterval(pollRef.current)

    // Try immediately in case widget is already loaded
    if (fireGoogleTranslate(lang)) return

    // Otherwise poll until widget is ready
    const start = Date.now()
    pollRef.current = setInterval(() => {
      if (Date.now() - start > POLL_TIMEOUT) {
        clearInterval(pollRef.current!)
        return
      }
      if (fireGoogleTranslate(lang)) {
        clearInterval(pollRef.current!)
      }
    }, POLL_INTERVAL)
  }, [])

  useEffect(() => {
    if (locale === 'en') {
      // Restore original — fire immediately (widget may already be there)
      fireGoogleTranslate('en')
      return
    }
    triggerWithPoll(locale)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [locale, triggerWithPoll])

  const retriggerTranslation = useCallback(() => {
    triggerWithPoll(locale)
  }, [locale, triggerWithPoll])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, isTranslating, setIsTranslating, t, retriggerTranslation }}>
      {children}
    </LanguageContext.Provider>
  )
}

// ── Hook ───────────────────────────────────────────────────────────────────
export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within <LanguageProvider>')
  return ctx
}
