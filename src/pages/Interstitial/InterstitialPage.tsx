import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Shield, ExternalLink, Clock, CheckCircle, Download, Lock } from 'lucide-react'
import { useAdSettings } from '../../context/AdSettingsContext'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { SITE_NAME, BASE_URL } from '../../lib/seo'
import type { AdFormat, AdScriptItem } from '../../lib/supabase'

const Page = styled.div`
  min-height: 100vh; position: relative; padding: 24px;
  display: flex; align-items: center; justify-content: center;
`

const Bg = styled.div`
  position: absolute; inset: 0; z-index: 0;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px;
  padding: 18px;
  pointer-events: auto; /* allow clicks on background ads */
  background: radial-gradient(circle at top left, rgba(124,58,237,0.22), transparent 28%),
              radial-gradient(circle at bottom right, rgba(6,182,212,0.16), transparent 32%),
              rgba(2,6,23,0.88);
  backdrop-filter: blur(12px);
  overflow: hidden;
  @media (max-width: 768px) {
    display: none;
  }
`


const Card = styled.div`
  position: relative; z-index: 1;
  background: rgba(9,10,18,0.97); backdrop-filter: blur(12px);
  border: 1px solid rgba(124,58,237,0.18); border-radius: 24px;
  padding: 24px; max-width: 620px; width: min(100%, 620px); text-align: center;
  box-shadow: 0 16px 54px rgba(0,0,0,0.35);
  animation: fadeIn 0.32s ease;
  @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }

  @media (max-width: 768px) {
    padding: 18px;
    border-radius: 20px;
  }
`

const ModalHeader = styled.div`
  display: flex; align-items: center; gap: 12px; margin-bottom: 12px; text-align: left;
`
const LogoImg = styled.img`
  width: 44px; height: 44px; border-radius: 8px; object-fit: cover; border: 1px solid rgba(255,255,255,0.04);
`
const SiteMeta = styled.div`
  display: flex; flex-direction: column; gap: 2px;
`
const SiteName = styled.div`
  font-weight: 800; font-size: 16px; color: #fff;
`
const SiteUrl = styled.a`
  font-size: 12px; color: rgba(148,163,184,0.6); text-decoration: none;
`
const PreviewAreaWrap = styled.div`
  position: relative; width: 100%; margin: 24px 0;
  @media (max-width: 768px) {
    margin: 18px 0;
  }
`

const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
`

const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

const DownloadPreviewCard = styled.div`
  width: 100%;
  border-radius: 20px;
  background: rgba(20,20,34,0.95);
  border: 1px solid rgba(124,58,237,0.16);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.03);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  min-height: 200px;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      135deg,
      rgba(124,58,237,0.06) 0%,
      transparent 40%,
      transparent 60%,
      rgba(6,182,212,0.06) 100%
    );
    pointer-events: none;
  }
`

const DownloadIcon = styled.div`
  width: 64px; height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.15));
  border: 1px solid rgba(124,58,237,0.25);
  display: flex; align-items: center; justify-content: center;
  animation: ${float} 3s ease-in-out infinite;
`

const UrlBar = styled.div`
  display: flex; align-items: center; gap: 8px;
  padding: 10px 16px;
  border-radius: 12px;
  background: rgba(0,0,0,0.3);
  border: 1px solid rgba(255,255,255,0.06);
  max-width: 100%;
  overflow: hidden;
`

const UrlText = styled.span`
  font-size: 12px;
  color: rgba(148,163,184,0.6);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 350px;
`

const ShimmerBar = styled.div`
  width: 80%; height: 4px;
  border-radius: 2px;
  background: linear-gradient(
    90deg,
    rgba(124,58,237,0.1) 25%,
    rgba(124,58,237,0.35) 50%,
    rgba(124,58,237,0.1) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 2s linear infinite;
`

/* ── iframe layer sits on top of the preview card ── */
const IframeScroller = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 20px;
  -webkit-overflow-scrolling: touch;
`

const PreviewIframe = styled.iframe`
  width: 100%;
  height: 5000px;
  border: none;
  background: transparent;
  pointer-events: none;
  display: block;
`

const CountdownRing = styled.div`
  width: 80px; height: 80px; margin: 0 auto 16px;
  position: relative; display: flex; align-items: center; justify-content: center;
`

const CountdownNum = styled.div`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 28px; font-weight: 800; color: #fff;
  position: absolute;
`

const ProceedBtn = styled.button`
  display: flex; align-items: center; gap: 10px; justify-content: center;
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; border-radius: 12px; color: #fff;
  font-size: 16px; font-weight: 700; cursor: pointer;
  font-family: 'Noto Sans Lao', sans-serif;
  transition: opacity 0.2s, transform 0.2s;
  animation: popIn 0.3s ease;
  @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
  &:hover { opacity: 0.9; transform: scale(1.02); }
`

const SkipNote = styled.p`font-size: 12px; color: rgba(148,163,184,0.4); margin-top: 14px;`

const AD_FORMATS: AdFormat[] = ['Popunder', 'Smartlink', 'Native Banner', 'Social Bar', 'Banner']

const resolveAdScriptItems = (raw: any, fallbackUrl?: string | null): AdScriptItem[] => {
  if (Array.isArray(raw)) {
    return raw
      .map((item: any) => {
        if (typeof item === 'string') {
          return { code: item.trim(), format: 'Banner' as AdFormat }
        }

        const code = String(item?.code || item?.script || item?.url || '').trim()
        const candidate = String(item?.format || 'Banner') as AdFormat
        const format: AdFormat = AD_FORMATS.includes(candidate) ? candidate : 'Banner'
        return { code, format }
      })
      .filter(item => item.code)
  }
  if (fallbackUrl) {
    return [{ code: fallbackUrl.trim(), format: 'Banner' }]
  }
  return []
}

export default function InterstitialPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { adSettings, loading } = useAdSettings()
  const { t } = useLanguage()
  const targetUrl = params.get('url') ? decodeURIComponent(params.get('url')!) : null
  const cloudName = params.get('cloud') ? decodeURIComponent(params.get('cloud')!) : 'Cloud'
  const adAttempted = params.get('ad') === '1'
  const [countdown, setCountdown] = useState(10)
  const [ready, setReady] = useState(false)
  const [adOpened, setAdOpened] = useState<boolean>(adAttempted)
  const adScriptItems = useMemo(
    () => resolveAdScriptItems((adSettings as any)?.ad_scripts, adSettings?.ad_url || null),
    [adSettings?.ad_scripts, adSettings?.ad_url]
  )

  const isFullScript = (s: string) => /<script[\s\S]*?>[\s\S]*?<\/script>/i.test(s) || /function\s+adsterra|adsterra\.com|adsterra/i.test(s)
  const isNumericId = (s: string) => /^[0-9]{4,}$/.test(s)

  const totalSeconds = adSettings?.countdown_seconds || 10

  useEffect(() => {
    if (!targetUrl) { navigate('/'); return }
    if (loading) return

    setCountdown(totalSeconds)
    setReady(false)

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval)
          setReady(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [targetUrl, loading, totalSeconds])

  // ── Inject ad scripts into document.body (background ads) ──
  useEffect(() => {
    if (!adScriptItems || adScriptItems.length === 0) return
    const injectedEls: HTMLElement[] = []
    const timeouts: ReturnType<typeof setTimeout>[] = []

    const injectToBody = (el: HTMLElement) => {
      document.body.appendChild(el)
      injectedEls.push(el)
    }

    console.log(`[LA-GAME Ads] Injecting ${adScriptItems.length} ad script(s)…`)

    adScriptItems.forEach(({ code: adContent, format }, idx) => {
      if (!adContent) return

      console.log(`[LA-GAME Ads] Script #${idx + 1} — format: ${format}, length: ${adContent.length}`)

      if (isFullScript(adContent)) {
        try {
          const temp = document.createElement('div')
          temp.innerHTML = adContent
          const scriptElements = Array.from(temp.querySelectorAll('script'))

          scriptElements.forEach(scriptEl => {
            const newScript = document.createElement('script')
            if (scriptEl.src) {
              newScript.src = scriptEl.src
              newScript.async = true
            } else {
              newScript.text = scriptEl.innerHTML || ''
            }
            if (scriptEl.type) newScript.type = scriptEl.type

            const tid = setTimeout(() => {
              injectToBody(newScript)
              console.log(`[LA-GAME Ads] ✅ Injected script #${idx + 1} (${format}) into <body>`)
            }, idx * 150)
            timeouts.push(tid)
          })

          setAdOpened(true)
        } catch (err) {
          console.warn('[LA-GAME Ads] ❌ Failed to inject ad script', err)
        }
        return
      }

      if (isNumericId(adContent)) {
        try {
          const script = document.createElement('script')
          script.setAttribute('data-adsterra-loader', `1-${idx}`)
          script.type = 'text/javascript'
          script.text = `window._adsterra_zone='${adContent}'; (function(){var s=document.createElement('script');s.async=true;s.src='https://a.adsterra.com/loader.js';var e=document.getElementsByTagName('script')[0];e.parentNode.insertBefore(s,e);})();`
          const tid = setTimeout(() => injectToBody(script), idx * 150)
          timeouts.push(tid)
          setAdOpened(true)
        } catch (err) {
          console.warn('[LA-GAME Ads] ❌ Failed to insert adsterra loader with id', err)
        }
        return
      }

      if (/^https?:\/\//i.test(adContent)) {
        try {
          const script = document.createElement('script')
          script.src = adContent
          script.async = true
          const tid = setTimeout(() => injectToBody(script), idx * 150)
          timeouts.push(tid)
          setAdOpened(true)
        } catch (err) {
          console.warn('[LA-GAME Ads] ❌ Failed to inject external script url', err)
        }
        return
      }

      // fallback: plain text
      try {
        const wrapper = document.createElement('div')
        wrapper.innerText = adContent
        document.body.appendChild(wrapper)
        injectedEls.push(wrapper)
      } catch (err) {
        console.warn('[LA-GAME Ads] ❌ Failed to inject ad fallback content', err)
      }
    })

    return () => {
      timeouts.forEach(tid => clearTimeout(tid))
      injectedEls.forEach(el => { if (el && el.parentNode) el.parentNode.removeChild(el) })
    }
  }, [adScriptItems])

  const openAdFallback = () => {
    if (!adSettings?.ad_url) return
    try {
      const w = window.open('about:blank', `ad_fallback_${Date.now()}`)
      if (w) {
        w.location.href = adSettings.ad_url
        setAdOpened(true)
      }
    } catch (err) {
      console.warn('Ad open fallback failed', err)
    }
  }

  const proceed = () => {
    if (!ready || !targetUrl) return
    window.open(targetUrl, '_blank', 'noopener')
    setTimeout(() => navigate(-1), 300)
  }

  const pct = ((totalSeconds - countdown) / totalSeconds) * 100
  const circumference = 2 * Math.PI * 34
  const dash = circumference - (pct / 100) * circumference

  if (!targetUrl) return null

  return (
    <Page>
      <Bg />
      <Card>
        <ModalHeader>
          <LogoImg src="/LOGO.png" alt={SITE_NAME} />
          <SiteMeta>
            <SiteName>{SITE_NAME}</SiteName>
            <SiteUrl href={BASE_URL} target="_blank" rel="noopener noreferrer">{BASE_URL.replace(/^https?:\/\//, '')}</SiteUrl>
          </SiteMeta>
        </ModalHeader>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
          <Shield size={16} style={{ color: '#7c3aed' }} />
          <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.75)', fontWeight: 600 }}>{t('dl.modal.preparing')}</span>
        </div>

        <h2 style={{ fontFamily: 'Noto Sans Lao', fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          {t('dl.modal.heading').replace('{cloud}', cloudName)}
        </h2>
        <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)', marginBottom: 12 }}>
          {t('dl.modal.wait_message')}
        </p>
        <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.6)', marginBottom: 16, fontWeight: 600 }}>
          {t('dl.modal.safe_notice')}
        </p>

        {/* ── Download Preview: iframe on top, fallback card behind ── */}
        <PreviewAreaWrap>
          <DownloadPreviewCard>
            {/* Fallback layer: always visible as background */}
            <DownloadIcon>
              <Download size={28} style={{ color: '#a78bfa' }} />
            </DownloadIcon>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 4, fontFamily: 'Noto Sans Lao' }}>
                {cloudName}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)' }}>
                {t('dl.modal.wait_message')}
              </div>
            </div>
            <UrlBar>
              <Lock size={12} style={{ color: '#22c55e', flexShrink: 0 }} />
              <UrlText>{targetUrl}</UrlText>
            </UrlBar>
            <ShimmerBar />

            {/* iframe layer: loads on top — if site blocks, fallback card shows through */}
            <IframeScroller>
              <PreviewIframe
                src={targetUrl}
                sandbox="allow-scripts allow-same-origin"
                title="Download Link Preview"
                loading="lazy"
              />
            </IframeScroller>
          </DownloadPreviewCard>
        </PreviewAreaWrap>

        {/* Countdown */}
        {!ready ? (
          <>
            <CountdownRing>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)', position: 'absolute' }}>
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(124,58,237,0.15)" strokeWidth="5" />
                <circle cx="40" cy="40" r="34" fill="none" stroke="#7c3aed" strokeWidth="5"
                  strokeDasharray={circumference} strokeDashoffset={dash}
                  style={{ transition: 'stroke-dashoffset 1s linear' }} />
              </svg>
              <CountdownNum>{countdown}</CountdownNum>
            </CountdownRing>
            <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)' }}>
              <Clock size={13} style={{ verticalAlign: 'middle' }} /> {t('dl.modal.available_in').replace('{s}', String(countdown))}
            </p>
            {!adOpened && adSettings?.ad_url && (
              <div style={{ marginTop: 12 }}>
                <ProceedBtn onClick={openAdFallback} style={{ width: 'auto', padding: '8px 12px' }}>
                  {t('dl.modal.open_ad_fallback')}
                </ProceedBtn>
              </div>
            )}
          </>
        ) : (
          <ProceedBtn onClick={proceed}>
            <CheckCircle size={20} />
            {t('dl.modal.proceed')}
            <ExternalLink size={16} />
          </ProceedBtn>
        )}

        <SkipNote>{t('dl.modal.ad_revenue_note')}</SkipNote>
      </Card>
    </Page>
  )
}
