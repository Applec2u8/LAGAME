import React, { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useLanguage } from './LanguageContext'

type TranslationsMap = Record<string, string>

interface CategoryTranslatorValue {
  translateCategoryName: (name: string) => string
  translations: TranslationsMap
}

const CategoryTranslatorContext = createContext<CategoryTranslatorValue | null>(null)

async function googleTranslate(text: string, target: string): Promise<string> {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(text)}`
    const res = await fetch(url)
    if (!res.ok) return text
    const data = await res.json()
    // data is an array where first element is array of translations
    if (Array.isArray(data) && Array.isArray(data[0]) && data[0].length > 0 && Array.isArray(data[0][0])) {
      return data[0].map((p: any) => p[0]).join('')
    }
    return text
  } catch (e) {
    return text
  }
}

export function CategoryTranslatorProvider({ children }: { children: ReactNode }) {
  const { locale } = useLanguage()
  const [translations, setTranslations] = useState<TranslationsMap>({})

  const storageKey = `lapack_cat_trans_v1_${locale}`

  // refs to avoid setState during render
  const translationsRef = React.useRef<TranslationsMap>({})
  const pendingNamesRef = React.useRef<Set<string>>(new Set())
  const scheduledRef = React.useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      const parsed = raw ? JSON.parse(raw) : {}
      setTranslations(parsed)
      translationsRef.current = parsed
    } catch (e) {
      setTranslations({})
      translationsRef.current = {}
    }
  }, [storageKey])

  const persist = (map: TranslationsMap) => {
    try { localStorage.setItem(storageKey, JSON.stringify(map)) } catch (e) {}
  }

  const processQueue = async () => {
    scheduledRef.current = false
    const names = Array.from(pendingNamesRef.current)
    pendingNamesRef.current.clear()
    if (names.length === 0) return

    const target = locale === 'th' ? 'th' : locale === 'lo' ? 'lo' : 'en'
    const translationsToAdd: TranslationsMap = {}

    await Promise.all(names.map(async (name) => {
      if (!name) return
      if (translationsRef.current[name]) return
      try {
        const translated = await googleTranslate(name, target)
        translationsToAdd[name] = translated
      } catch (e) {
        // noop
      }
    }))

    if (Object.keys(translationsToAdd).length > 0) {
      setTranslations(prev => {
        const next = { ...prev, ...translationsToAdd }
        translationsRef.current = next
        persist(next)
        return next
      })
    }
  }

  const translateCategoryName = (name: string) => {
    if (!name) return name
    if (locale === 'en') return name
    if (translationsRef.current[name]) return translationsRef.current[name]

    // add to pending set and schedule async processing outside render
    pendingNamesRef.current.add(name)
    if (!scheduledRef.current) {
      scheduledRef.current = true
      setTimeout(processQueue, 0)
    }

    return name
  }

  return (
    <CategoryTranslatorContext.Provider value={{ translateCategoryName, translations }}>
      {children}
    </CategoryTranslatorContext.Provider>
  )
}

export function useCategoryTranslator() {
  const ctx = useContext(CategoryTranslatorContext)
  if (!ctx) throw new Error('useCategoryTranslator must be used within CategoryTranslatorProvider')
  return ctx
}

export default CategoryTranslatorProvider
