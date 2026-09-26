import { useState, useEffect } from 'react'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { CountdownWrap, TimeBox, TimeSection } from './ComingSoonStyles'

export function CountdownTimer({ targetDate, label = 'Starts in' }: { targetDate: string, label?: string }) {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, new Date(targetDate).getTime() - Date.now()))
  const { t } = useLanguage()

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(Math.max(0, new Date(targetDate).getTime() - Date.now()))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  if (timeLeft === 0) return null

  const d = Math.floor(timeLeft / (1000 * 60 * 60 * 24))
  const h = Math.floor((timeLeft / (1000 * 60 * 60)) % 24)
  const m = Math.floor((timeLeft / 1000 / 60) % 60)
  const s = Math.floor((timeLeft / 1000) % 60)

  return (
    <CountdownWrap>
      <div style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <TimeBox>
        <TimeSection><span className="val">{d}</span><span className="val" style={{ margin: '0 2px', opacity: 0.5 }}>:</span><span className="lbl">{t('soon.days')}</span></TimeSection>
        <TimeSection><span className="val">{h.toString().padStart(2, '0')}</span><span className="val" style={{ margin: '0 2px', opacity: 0.5 }}>:</span><span className="lbl">{t('soon.hrs')}</span></TimeSection>
        <TimeSection><span className="val">{m.toString().padStart(2, '0')}</span><span className="val" style={{ margin: '0 2px', opacity: 0.5 }}>:</span><span className="lbl">{t('soon.mins')}</span></TimeSection>
        <TimeSection><span className="val">{s.toString().padStart(2, '0')}</span><span className="lbl">{t('soon.secs')}</span></TimeSection>
      </TimeBox>
    </CountdownWrap>
  )
}
