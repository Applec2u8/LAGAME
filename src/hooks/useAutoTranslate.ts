// src/hooks/useAutoTranslate.ts
// Polls for the Google Translate widget (.goog-te-combo) to be ready,
// then automatically triggers the selected locale on every page load/navigation.
// Also exposes a `retrigger()` function for manual re-translation.

import { useEffect, useCallback, useRef } from 'react'
import type { Locale } from '../lib/i18n/locales'

const POLL_INTERVAL = 150   // ms between checks
const POLL_TIMEOUT  = 8000  // give up after 8s

function triggerGoogleTranslate(lang: Locale) {
  const select = document.querySelector<HTMLSelectElement>('.goog-te-combo')
  if (!select) return false

  const targetValue = lang === 'en' ? '' : lang
  select.value = targetValue
  select.dispatchEvent(new Event('change', { bubbles: true }))

  // Fire a second time after a short delay (GT widget sometimes ignores first)
  setTimeout(() => {
    select.value = targetValue
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, 150)
  return true
}

/**
 * Waits for the Google Translate widget to be available in the DOM,
 * then programmatically sets the language to `locale`.
 * On 'en', it restores the original text.
 */
export function useAutoTranslate(locale: Locale) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const didTrigger = useRef(false)

  const doTrigger = useCallback(() => {
    didTrigger.current = false // reset so poll will try

    if (timerRef.current) clearInterval(timerRef.current)

    const start = Date.now()
    timerRef.current = setInterval(() => {
      // Give up after timeout
      if (Date.now() - start > POLL_TIMEOUT) {
        clearInterval(timerRef.current!)
        return
      }

      const ok = triggerGoogleTranslate(locale)
      if (ok) {
        didTrigger.current = true
        clearInterval(timerRef.current!)
      }
    }, POLL_INTERVAL)
  }, [locale])

  // Auto-trigger whenever locale changes or component mounts
  useEffect(() => {
    if (locale === 'en') {
      // Restore original — fire immediately if widget present, else skip
      triggerGoogleTranslate('en')
      return
    }
    doTrigger()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [locale, doTrigger])

  // Returns a function to manually re-trigger translation
  const retrigger = useCallback(() => {
    doTrigger()
  }, [doTrigger])

  return { retrigger }
}
