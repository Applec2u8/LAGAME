// src/lib/i18n/LanguageContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { translate, type Locale } from './locales'

// ── Types ──────────────────────────────────────────────────────────────────
interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  isTranslating: boolean
  setIsTranslating: (val: boolean) => void
  /** Translate a static UI key */
  t: (key: string) => string
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

  return (
    <LanguageContext.Provider value={{ locale, setLocale, isTranslating, setIsTranslating, t }}>
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
