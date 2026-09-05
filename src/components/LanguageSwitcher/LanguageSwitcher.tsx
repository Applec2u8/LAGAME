// src/components/LanguageSwitcher/LanguageSwitcher.tsx
import { useState, useRef, useEffect } from 'react'
import styled, { keyframes, css } from 'styled-components'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { SUPPORTED_LOCALES, type Locale } from '../../lib/i18n/locales'

// ── Animations ─────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(-6px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`

// ── Styled Components ───────────────────────────────────────────────────────
const Wrap = styled.div`
  position: relative;
  flex-shrink: 0;
`

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 12px;
  border-radius: 10px;
  border: 1px solid rgba(124, 58, 237, 0.25);
  background: rgba(124, 58, 237, 0.08);
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  font-family: 'Noto Sans Lao', sans-serif;

  &:hover {
    background: rgba(124, 58, 237, 0.18);
    border-color: rgba(124, 58, 237, 0.45);
    color: #fff;
  }
`

const ChevronIcon = styled.span<{ $open: boolean }>`
  font-size: 10px;
  opacity: 0.6;
  transition: transform 0.2s;
  ${p => p.$open && css`transform: rotate(180deg);`}
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 160px;
  background: rgba(14, 14, 28, 0.97);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(124, 58, 237, 0.25);
  border-radius: 14px;
  padding: 6px;
  z-index: 999;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(124,58,237,0.1);
  animation: ${fadeIn} 0.18s ease both;
`

const DropdownLabel = styled.div`
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(148, 163, 184, 0.45);
  padding: 6px 10px 8px;
`

const Option = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 10px;
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(226,232,240,0.8)'};
  font-size: 13px;
  font-weight: ${p => p.$active ? 700 : 500};
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Noto Sans Lao', sans-serif;
  text-align: left;

  &:hover {
    background: rgba(124, 58, 237, 0.15);
    color: #fff;
  }
`

const Flag = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 16px;
  border-radius: 4px;
  overflow: hidden;
  flex-shrink: 0;
  background: #11101f;
`

const FlagImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const ActiveDot = styled.span`
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #7c3aed;
  margin-left: auto;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(124,58,237,0.6);
`

// ── Component ───────────────────────────────────────────────────────────────
export default function LanguageSwitcher() {
  const { locale, setLocale, setIsTranslating } = useLanguage()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = SUPPORTED_LOCALES.find(l => l.code === locale)!

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleSelect = (code: Locale) => {
    setLocale(code)
    setOpen(false)
    setIsTranslating(true)

    const domain = window.location.hostname

    const setGoogleTranslateCookie = (value: string | null) => {
      if (value === null) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain}`
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain}`
        return
      }
      document.cookie = `googtrans=${value}; path=/`
      document.cookie = `googtrans=${value}; path=/; domain=${domain}`
      document.cookie = `googtrans=${value}; path=/; domain=.${domain}`
    }

    const triggerWidget = (lang: Locale) => {
      const select = document.querySelector<HTMLSelectElement>('.goog-te-combo')
      if (!select) return
      select.value = lang
      select.dispatchEvent(new Event('change', { bubbles: true }))
      setTimeout(() => {
        select.value = lang
        select.dispatchEvent(new Event('change', { bubbles: true }))
      }, 120)
    }

    if (code === 'en') {
      setGoogleTranslateCookie(null)
      triggerWidget('en')
      setTimeout(() => setIsTranslating(false), 800)
      return
    }

    setGoogleTranslateCookie(`/en/${code}`)
    triggerWidget(code)
    setTimeout(() => setIsTranslating(false), 800)
  }

  return (
    <Wrap ref={ref}>
      <Trigger onClick={() => setOpen(v => !v)} title={current.label}>
        <Flag>
          <FlagImage src={current.flagUrl} alt={`${current.label} flag`} />
        </Flag>
        <ChevronIcon $open={open}>▼</ChevronIcon>
      </Trigger>

      {open && (
        <Dropdown>
          <DropdownLabel>Language</DropdownLabel>
          {SUPPORTED_LOCALES.map(loc => (
            <Option
              key={loc.code}
              $active={locale === loc.code}
              onClick={() => handleSelect(loc.code)}
            >
              <Flag>
                <FlagImage src={loc.flagUrl} alt={`${loc.label} flag`} />
              </Flag>
              {loc.label}
              {locale === loc.code && <ActiveDot />}
            </Option>
          ))}
        </Dropdown>
      )}
    </Wrap>
  )
}
