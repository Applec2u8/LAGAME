import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Monitor, Cpu, ExternalLink, Loader2, Play, AlignLeft, Apple, ChevronLeft, ChevronRight, Languages, Share2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game, DownloadLink, Category } from '../../lib/supabase'
import { useCategoryTranslator } from '../../lib/i18n/CategoryTranslator'
import { useAdSettings } from '../../context/AdSettingsContext'
import { trackGameView } from '../../lib/analytics'
import CommentSection from '../../components/CommentSection/CommentSection'
import PCSpecChecker from '../../components/PCSpecChecker/PCSpecChecker'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import { markReturnFromDetail } from '../../hooks/useScrollRestore';
import Seo from '../../components/Seo'
import { getPageUrl, DEFAULT_IMAGE } from '../../lib/seo'
import {
  Page, Back, Hero, CoverImg, CoverPlaceholder, Info, CategoryBadge, Title,
  Description, Section, SectionTitle, DownloadBtn, CloudName, DownArrow, SpecGrid,
  SpecCard, SpecTitle, GalleryWrap, GalleryScroll, Screenshot, Lightbox,
  LightboxNav, LightboxCounter, LoadingPage, ComingSoonBadge, ComingSoonTitle, ComingSoonSub,
  ShareBtn, CopyToast,
} from './GameDetailStyles'



const CLOUD_ICONS: Record<string, string> = {
  'Google Drive': '🟢',
  'MEGA': '🔴',
  'MediaFire': '🔵',
  'OneDrive': '🟦',
  'Dropbox': '📦',
  'Zippyshare': '⚡',
  'Pixeldrain': '💧',
  'default': '☁️',
}

const getYoutubeId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}


export default function GameDetailPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { adSettings } = useAdSettings()
  const { locale, t, isTranslating, retriggerTranslation } = useLanguage()
  const [game, setGame] = useState<Game | null>(null)
  const [gameCategories, setGameCategories] = useState<Category[]>([])
  const { translateCategoryName } = useCategoryTranslator()
  const [links, setLinks] = useState<DownloadLink[]>([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [copied, setCopied] = useState(false)

  // Mark all possible listing pages so that if the user goes back to any of them, it restores their specific scroll.
  useEffect(() => {
    markReturnFromDetail('/');
    markReturnFromDetail('/az-filter');
    markReturnFromDetail('/top-games');
    markReturnFromDetail('/coming-soon');
  }, []);


  useEffect(() => {
    if (!slug) return
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('games')
        .select('*, category:categories(id,name,slug)')
        .eq('slug', slug)
        .single()
      if (!data) { navigate('/'); return }
      setGame(data as any)

      let cats = (data as any).category ? [(data as any).category] : []
      const catIds = (data as any).category_ids
      if (catIds && catIds.length > 0) {
        const { data: dbCats } = await supabase.from('categories').select('*').in('id', catIds)
        if (dbCats) cats = [...new Map([...cats, ...dbCats].map(item => [item.id, item])).values()]
      }
      setGameCategories(cats)

      const { data: dl } = await supabase
        .from('download_links')
        .select('*')
        .eq('game_id', (data as any).id)
        .order('sort_order')
      setLinks((dl as any) || [])

      // Track game view by platform (also updates legacy view_count)
      trackGameView((data as any).id, (data as any).view_count || 0)
      setLoading(false)
    }
    fetch()
  }, [slug])



  // Keyboard navigation for lightbox
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (lightbox === null || !game?.screenshots?.length) return
    if (e.key === 'ArrowRight') setLightbox(i => Math.min((i ?? 0) + 1, game.screenshots.length - 1))
    if (e.key === 'ArrowLeft') setLightbox(i => Math.max((i ?? 0) - 1, 0))
    if (e.key === 'Escape') setLightbox(null)
  }, [lightbox, game])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const pageTitle = game ? `${game.title} - Free PC Game Download` : 'Game Details'
  const pageDescription = game
    ? `${game.title} free download with cloud links, screenshots and system requirements.`
    : 'Game details and download options for PC games.'
  const pageKeywords = game
    ? `${game.title}, free pc game download, ${game.category_ids?.map((id: string) => id).join(', ')}`
    : 'pc game download, free games, game details'
  const pageSchema = game
    ? {
      '@type': 'SoftwareApplication',
      name: game.title,
      description: game.description || pageDescription,
      url: getPageUrl(`/game/${slug}`),
      image: game.cover_image || DEFAULT_IMAGE,
      operatingSystem: 'Windows, macOS, Android',
      applicationCategory: 'Game',
    }
    : undefined

  const handleDownload = (link: DownloadLink) => {
    if (adSettings?.is_active) {
      const encoded = encodeURIComponent(link.url)
      navigate(`/download-redirect?url=${encoded}&cloud=${encodeURIComponent(link.cloud_name)}&ad=1`)
    } else {
      window.open(link.url, '_blank', 'noopener')
    }
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = game?.title ?? 'Game'
    const text = `${title} - Free PC Game Download on LA-GAME`
    if (navigator.share) {
      try { await navigator.share({ title, text, url }) } catch { }
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    }
  }


  if (loading) return <LoadingPage><Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite' }} /> {t('game.loading')}</LoadingPage>
  if (!game) return null

  const sr = game.system_requirements

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        path={`/game/${slug}`}
        image={game.cover_image ?? '/LOGO.png'}
        type="article"
        schema={pageSchema}
      />

      <Page>
        <Back onClick={() => window.history.length > 2 ? navigate(-1) : navigate('/')}><ArrowLeft size={15} /> {t('game.back')}</Back>

        <Hero>
          <div>
            {game.cover_image
              ? <CoverImg src={game.cover_image} alt={game.title} />
              : <CoverPlaceholder>🎮</CoverPlaceholder>
            }
          </div>

          <Info>
            {gameCategories.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {gameCategories.map(c => <CategoryBadge key={c.id}>{translateCategoryName(c.name)}</CategoryBadge>)}
              </div>
            )}
            <Title>{game.title}</Title>
            {/* Meta row: file size + share buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 18, marginTop: 4 }}>
              {/* File size badge */}
              {(game as any).file_size && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
                  borderRadius: 8, padding: '6px 12px', fontSize: 13, color: '#c4b5fd',
                  flexShrink: 0,
                }}>
                  💾 <strong>{t('game.storage')}:</strong>&nbsp;{(game as any).file_size}
                </div>
              )}
              {/* Divider */}
              {(game as any).file_size && (
                <div style={{ width: 1, height: 22, background: 'rgba(148,163,184,0.15)', flexShrink: 0 }} />
              )}
              {/* Share buttons */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <ShareBtn $variant="native" onClick={handleShare}>
                  <Share2 size={13} /> Share
                </ShareBtn>
              )}
            </div>
            {/* Short description preview */}
            {game.description && <Description translate="yes">{game.description.slice(0, 400)}{game.description.length > 400 ? '...' : ''}</Description>}

            {/* Download Links */}
            <SectionTitle><Download size={15} /> {t('game.download_links')}</SectionTitle>
            {(game as any).is_coming_soon ? (
              <ComingSoonBadge>
                <div style={{ fontSize: 36 }}>🚀</div>
                <ComingSoonTitle>Coming Soon</ComingSoonTitle>
                <ComingSoonSub>
                  {t('game.coming_soon_desc') || 'เตรียมเปิดให้ดาวน์โหลดเร็วๆ นี้'}
                </ComingSoonSub>
              </ComingSoonBadge>
            ) : links.length === 0 ? (
              <p style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)' }}>{t('game.no_download')}</p>
            ) : (
              (() => {
                const winLinks: DownloadLink[] = []
                const macLinks: DownloadLink[] = []

                links.forEach(link => {
                  let platform = 'windows';
                  let cloud_name = link.cloud_name;
                  if (cloud_name.startsWith('[windows] ')) {
                    platform = 'windows';
                    cloud_name = cloud_name.replace('[windows] ', '');
                  } else if (cloud_name.startsWith('[macos] ')) {
                    platform = 'macos';
                    cloud_name = cloud_name.replace('[macos] ', '');
                  }

                  const parsedLink = { ...link, cloud_name };
                  if (platform === 'windows') winLinks.push(parsedLink);
                  else macLinks.push(parsedLink);
                });

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {winLinks.length > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(148,163,184,0.7)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Monitor size={14} /> {t('game.windows')} - Version
                        </div>
                        {winLinks.map(link => (
                          <DownloadBtn key={link.id} onClick={() => handleDownload(link)}>
                            <span style={{ fontSize: 20 }}>{CLOUD_ICONS[link.cloud_name] || CLOUD_ICONS.default}</span>
                            <CloudName>{link.cloud_name}</CloudName>
                            <DownArrow><ExternalLink size={12} /> {t('game.download')}</DownArrow>
                          </DownloadBtn>
                        ))}
                      </div>
                    )}
                    {macLinks.length > 0 && (
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(148,163,184,0.7)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Apple size={14} /> {t('game.macos')}
                        </div>
                        {macLinks.map(link => (
                          <DownloadBtn key={link.id} onClick={() => handleDownload(link)}>
                            <span style={{ fontSize: 20 }}>{CLOUD_ICONS[link.cloud_name] || CLOUD_ICONS.default}</span>
                            <CloudName>{link.cloud_name}</CloudName>
                            <DownArrow><ExternalLink size={12} /> Download</DownArrow>
                          </DownloadBtn>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })()
            )}
          </Info>
        </Hero>

        {/* Video Trailer */}
        {game.video_url && getYoutubeId(game.video_url) && (
          <Section>
            <SectionTitle><Play size={15} /> {t('game.trailer')}</SectionTitle>
            <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.2)', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
              <iframe
                width="100%" height="100%"
                src={`https://www.youtube.com/embed/${getYoutubeId(game.video_url)}`}
                frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
              />
            </div>
          </Section>
        )}

        {/* Screenshots */}
        {game.screenshots?.length > 0 && (
          <Section>
            <SectionTitle>📸 {t('game.screenshots')}</SectionTitle>
            <GalleryWrap>
              <GalleryScroll>
                {game.screenshots.map((src, i) => (
                  <Screenshot key={i} src={src} alt={`Screenshot ${i + 1}`} onClick={() => setLightbox(i)} />
                ))}
              </GalleryScroll>
            </GalleryWrap>
          </Section>
        )}

        {/* System Requirements */}
        {sr && (
          <Section translate="yes" key={`sysreq-${locale}`}>
            <SectionTitle>
              <Monitor size={15} /> {t('game.system_requirements')}
              {isTranslating ? (
                <span style={{ marginLeft: '12px', fontSize: 11, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', animation: 'pulse 1.5s infinite' }}>
                  {locale === 'th' ? 'กำลังแปลภาษา...' : locale === 'lo' ? 'ກຳລັງແປພາສາ...' : 'Translating...'}
                </span>
              ) : locale !== 'en' ? (
                <button
                  onClick={retriggerTranslation}
                  title="Click to re-translate"
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'rgba(124,58,237,0.85)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 6, padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                >
                  <Languages size={12} /> Google Translate ↻
                </button>
              ) : null}
            </SectionTitle>
            <SpecGrid>
              <SpecCard>
                <SpecTitle><Cpu size={12} /> {t('game.minimum')}</SpecTitle>
                {sr.minimum?.about && <div style={{ fontSize: 14, color: 'rgba(226,232,240,0.9)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sr.minimum.about}</div>}
              </SpecCard>
              <SpecCard>
                <SpecTitle><Cpu size={12} /> {t('game.recommended')}</SpecTitle>
                {sr.recommended?.about && <div style={{ fontSize: 14, color: 'rgba(226,232,240,0.9)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{sr.recommended.about}</div>}
              </SpecCard>
            </SpecGrid>
          </Section>
        )}

        {/* PC Spec Checker */}
        {game && <PCSpecChecker game={game} />}

        {/* Full Description */}
        {game.description && (
          <Section translate="yes" key={`desc-${locale}`}>
            <SectionTitle>
              <AlignLeft size={15} /> {t('game.about')}
              {isTranslating ? (
                <span style={{ marginLeft: '12px', fontSize: 11, color: '#7c3aed', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', animation: 'pulse 1.5s infinite' }}>
                  {locale === 'th' ? 'กำลังแปลภาษา...' : locale === 'lo' ? 'ກຳລັງແປພາສາ...' : 'Translating...'}
                </span>
              ) : locale !== 'en' ? (
                <button
                  onClick={retriggerTranslation}
                  title="Click to re-translate"
                  style={{
                    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: 'rgba(124,58,237,0.85)', fontWeight: 600,
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)',
                    borderRadius: 6, padding: '3px 8px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(124,58,237,0.1)')}
                >
                  <Languages size={12} /> Google Translate ↻
                </button>
              ) : null}
            </SectionTitle>
            <div style={{
              fontSize: 15, color: 'rgba(226,232,240,0.9)', lineHeight: 1.8, whiteSpace: 'pre-wrap',
              background: 'rgba(18,18,31,0.8)', border: '1px solid rgba(124,58,237,0.15)',
              borderRadius: 16, padding: '24px 32px'
            }}>
              {game.description}
            </div>
          </Section>
        )}

        {/* Lightbox */}
        {lightbox !== null && game.screenshots?.length > 0 && (
          <Lightbox onClick={() => setLightbox(null)}>
            <img
              src={game.screenshots[lightbox]}
              alt={`Screenshot ${lightbox + 1}`}
              style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: 12, boxShadow: '0 0 60px rgba(0,0,0,0.8)', display: 'block' }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            />
            {/* Prev */}
            <LightboxNav
              style={{ left: 16 }}
              disabled={lightbox === 0}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLightbox(i => Math.max((i ?? 1) - 1, 0)) }}
            >
              <ChevronLeft size={26} />
            </LightboxNav>
            {/* Next */}
            <LightboxNav
              style={{ right: 16 }}
              disabled={lightbox === game.screenshots.length - 1}
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); setLightbox(i => Math.min((i ?? 0) + 1, game.screenshots.length - 1)) }}
            >
              <ChevronRight size={26} />
            </LightboxNav>
            {/* Counter */}
            <LightboxCounter>{lightbox + 1} / {game.screenshots.length}</LightboxCounter>
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 14, backdropFilter: 'blur(4px)' }}
            >× Close</button>
          </Lightbox>
        )}
        <CommentSection type="game" gameId={game.id} />
      </Page >
      <CopyToast $visible={copied}>✓ Link copied to clipboard!</CopyToast>
    </>
  )
}
