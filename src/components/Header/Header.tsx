import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Search, Menu, X, ChevronDown, Trophy, AlignLeft, MessageSquare } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Game } from '../../lib/supabase'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher'
import { useLanguage } from '../../lib/i18n/LanguageContext'

// ── Styled Components ──────────────────────────────────────────────────
const HeaderWrap = styled.header`
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 100;
  background: rgba(8, 8, 16, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(124, 58, 237, 0.15);
  height: 70px;
`

const Nav = styled.nav`
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
  gap: 32px;
  @media (max-width: 1080px) {
    padding: 0 16px;
    gap: 16px;
  }
  @media (max-width: 900px) {
    padding: 0 18px;
    gap: 12px;
  }
  @media (max-width: 820px) {
    padding: 0 14px;
    gap: 8px;
  }
`

const Logo = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  &:hover { opacity: 0.9; }

  img {
    height: 60px;
    width: auto;
    border-radius: 4px;
    @media (max-width: 1080px) {
      height: 48px;
    }
    @media (max-width: 900px) {
      height: 42px;
    }
    @media (max-width: 768px) {
      height: 38px;
    }
  }

  @media (max-width: 1080px) {
    gap: 8px;
  }
  @media (max-width: 768px) {
    gap: 6px;
  }
`

const LogoText = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
`

const LogoTitle = styled.span`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 22px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  @media (max-width: 1080px) {
    font-size: 18px;
  }
  @media (max-width: 900px) {
    font-size: 17px;
  }
  @media (max-width: 768px) {
    font-size: 15px;
  }
`

const LogoSubtitle = styled.span`
  font-size: 10px;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 1px;
  // margin-top: 2px;
  display: flex;
  align-items: center;
  gap: 4px;
  @media (max-width: 1080px) {
    font-size: 9px;
    gap: 3px;
  }
  @media (max-width: 900px) {
    font-size: 8px;
    gap: 3px;
  }
  @media (max-width: 768px) {
    font-size: 7px;
    gap: 2px;
  }
`

const NavLinks = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  @media (max-width: 900px) {
    gap: 2px;
  }
  @media (max-width: 1080px) { display: none; }
`

const NavLink = styled(Link) <{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${p => p.$active ? '#fff' : 'rgba(255,255,255,0.7)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
  @media (max-width: 900px) {
    padding: 7px 12px;
    font-size: 13px;
  }
`

const DropdownTrigger = styled.div<{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: ${p => p.$active ? '#fff' : 'rgba(255,255,255,0.7)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'transparent'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
  position: relative;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
  @media (max-width: 900px) {
    padding: 7px 12px;
    font-size: 13px;
  }
`

const dropIn = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`

const Dropdown = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(14, 14, 26, 0.95);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 12px;
  padding: 12px;
  animation: ${dropIn} 0.15s ease;
  z-index: 200;
  min-width: 300px;
`

const AZGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
`

const AZBtn = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255,255,255,0.7);
  transition: all 0.15s;
  &:hover {
    background: rgba(124,58,237,0.3);
    color: #fff;
  }
`

const SearchWrap = styled.div<{ $expanded?: boolean }>`
  flex: 1;
  max-width: 360px;
  position: relative;
  margin-left: auto;

  @media (max-width: 900px) {
    max-width: 280px;
  }

  @media (max-width: 820px) {
    max-width: 240px;
  }

  @media (max-width: 1080px) {
    position: ${p => p.$expanded ? 'fixed' : 'relative'};
    ${p => p.$expanded ? `
      inset: 0;
      max-width: 100%;
      padding: 0 16px;
      height: 70px;
      display: flex;
      align-items: center;
      background: rgba(8,8,16,0.97);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      z-index: 300;
      border-bottom: 1px solid rgba(124,58,237,0.2);
    ` : `
      max-width: none;
      margin: 0;
    `}
  }
`

const SearchInput = styled.input<{ $expanded?: boolean }>`
  width: 100%;
  padding: 9px 16px 9px 44px;
  background: rgba(18, 18, 31, 0.8);
  border: 1px solid rgba(124, 58, 237, 0.2);
  border-radius: 999px;
  color: #e2e8f0;
  font-size: 14px;
  outline: none;
  transition: all 0.25s cubic-bezier(0.4,0,0.2,1);
  font-family: 'Noto Sans Lao', sans-serif;
  &:focus { border-color: rgba(124,58,237,0.5); box-shadow: 0 0 0 3px rgba(124,58,237,0.12); }
  &::placeholder { color: rgba(148,163,184,0.5); }

  @media (max-width: 900px) {
    font-size: 13px;
    padding: 8px 14px 8px 40px;
  }

  @media (max-width: 820px) {
    font-size: 12px;
    padding: 8px 12px 8px 36px;
  }

  @media (max-width: 1080px) {
    ${p => p.$expanded ? `
      height: 46px;
      font-size: 16px;
      padding: 0 56px 0 48px;
      background: rgba(18,18,31,0.95);
      border: 1px solid rgba(124,58,237,0.35);
      border-radius: 14px;
      letter-spacing: 0.01em;
    ` : `
      height: 38px;
      font-size: 14px;
      padding: 0 16px 0 36px;
      background: rgba(18,18,31,0.8);
      border: 1px solid rgba(124,58,237,0.2);
      border-radius: 999px;
    `}
  }
`

const MobileSearchClose = styled.button`
  display: none;
  @media (max-width: 1080px) {
    display: flex;
    position: absolute;
    right: 24px;
    top: 50%;
    transform: translateY(-50%);
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: 1px solid rgba(124,58,237,0.2);
    background: rgba(124,58,237,0.15);
    color: rgba(148,163,184,0.8);
    cursor: pointer;
    &:hover { background: rgba(124,58,237,0.3); color: #fff; }
  }
`

const SearchIcon = styled.div<{ $expanded?: boolean }>`
  position: absolute;
  left: 13px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(148,163,184,0.6);
  display: flex;
  align-items: center;
  z-index: 1;
  pointer-events: none;
  @media (max-width: 1080px) {
    left: ${p => p.$expanded ? '30px' : '12px'};
  }
`

const SearchResults = styled.div`
  position: absolute;
  top: calc(100% + 8px);
  left: 0; right: 0;
  background: rgba(14,14,26,0.97);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 12px;
  overflow: hidden;
  z-index: 200;
  max-height: 360px;
  overflow-y: auto;
  animation: ${dropIn} 0.15s ease;
`

const SearchResultItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.1); }
`

const MobileMenuBtn = styled.button`
  display: none;
  background: transparent;
  border: none;
  color: #e2e8f0;
  cursor: pointer;
  padding: 6px;
  margin-left: auto;
  @media (max-width: 1080px) { display: flex; align-items: center; }
`

const MobileMenu = styled.div<{ $open: boolean }>`
  display: none;
  @media (max-width: 1080px) {
    display: ${p => p.$open ? 'flex' : 'none'};
    flex-direction: column;
    position: fixed;
    top: 70px; left: 0; right: 0; bottom: 0;
    background: rgba(8,8,16,0.97);
    backdrop-filter: blur(20px);
    padding: 24px;
    gap: 8px;
    z-index: 99;
    overflow-y: auto;
  }
`

const MobileLink = styled(Link)`
  padding: 14px 16px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  color: rgba(255,255,255,0.8);
  border: 1px solid rgba(124,58,237,0.1);
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

const Loading = styled.div`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(124,58,237,0.4);
  border-top-color: #7c3aed;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  @media (max-width: 1080px) {
    right: 70px;
  }
`

// ── A-Z letters ───────────────────────────────────────────────────────
const AZ_LETTERS = ['#', ...Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i))]

// ── Component ─────────────────────────────────────────────────────────
export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useLanguage()
  const [searchQ, setSearchQ] = useState('')
  const [searchResults, setSearchResults] = useState<Game[]>([])
  const [searching, setSearching] = useState(false)
  const [azOpen, setAzOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const azRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (azRef.current && !azRef.current.contains(e.target as Node)) setAzOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([])
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close mobile on route change
  useEffect(() => { setMobileOpen(false); setAzOpen(false) }, [location])

  // Debounced search
  useEffect(() => {
    if (!searchQ.trim()) { setSearchResults([]); return }
    clearTimeout(debounceRef.current)
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('games')
        .select('id, title, slug, cover_image, category_id, category_ids, description, screenshots, system_requirements, is_featured, view_count, created_at, updated_at')
        .ilike('title', `%${searchQ}%`)
        .limit(6)
      setSearchResults((data as any) || [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQ])

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      <HeaderWrap>
        <Nav>
          <Logo to="/">
            <img src="/LOGO.png" alt="LAGAME Logo" />
            <LogoText>
              <LogoTitle>LA-GAME</LogoTitle>
              <LogoSubtitle>
                <div style={{ display: 'flex', alignItems: 'end', gap: '2px' }}>
                  <span style={{ fontSize: 10, display: 'flex' }}>LAOS </span>
                  <span style={{ fontSize: 8, display: 'flex', fontWeight: 'bold' }}>LA</span>
                </div>
                <img src="/LAOS.png" alt="LAGAME LAOS" style={{ height: 12, width: 'auto', borderRadius: 4 }} />
              </LogoSubtitle>
            </LogoText>
          </Logo>

          <NavLinks>
            <NavLink to="/" $active={location.pathname === '/'}>{t('nav.home')}</NavLink>

            {/* A-Z Dropdown */}
            <div ref={azRef} style={{ position: 'relative' }}>
              <DropdownTrigger $active={isActive('/az-filter')} onClick={() => setAzOpen(v => !v)}>
                <AlignLeft size={15} />
                {t('nav.az_filter')}
                <ChevronDown size={14} style={{ transition: '0.2s', transform: azOpen ? 'rotate(180deg)' : '' }} />
              </DropdownTrigger>
              {azOpen && (
                <Dropdown>
                  <p style={{ fontSize: 11, color: 'rgba(148,163,184,0.6)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{t('nav.browse_az')}</p>
                  <AZGrid>
                    {AZ_LETTERS.map(l => (
                      <AZBtn key={l} to={`/az-filter?letter=${l}`}>{l}</AZBtn>
                    ))}
                  </AZGrid>
                  <div style={{ marginTop: 10, borderTop: '1px solid rgba(124,58,237,0.15)', paddingTop: 10 }}>
                    <NavLink to="/az-filter" style={{ fontSize: 13 }}>{t('nav.view_all_az')}</NavLink>
                  </div>
                </Dropdown>
              )}
            </div>

            <NavLink to="/top-games" $active={isActive('/top-games')}>
              <Trophy size={15} />
              {t('nav.top_games')}
            </NavLink>

            <NavLink to="/comments" $active={isActive('/comments')}>
              <MessageSquare size={15} />
              {t('nav.guestbook')}
            </NavLink>

            <NavLink to="/coming-soon" $active={isActive('/coming-soon')} style={{ color: isActive('/coming-soon') ? '#fbbf24' : 'rgba(251,191,36,0.8)', borderRadius: 8, background: isActive('/coming-soon') ? 'rgba(251,191,36,0.15)' : 'rgba(251,191,36,0.06)' }}>
              🚀 Coming Soon
            </NavLink>
          </NavLinks>

          {/* Search */}
          <SearchWrap ref={searchRef} $expanded={searchExpanded}>
            <SearchIcon $expanded={searchExpanded}>
              <Search size={16} />
            </SearchIcon>
            {/* Input */}
            <SearchInput
              ref={searchInputRef}
              $expanded={searchExpanded}
              placeholder={t('common.search')}
              value={searchQ}
              onFocus={() => setSearchExpanded(true)}
              onChange={e => setSearchQ(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && searchQ) { navigate(`/az-filter?q=${searchQ}`); setSearchQ(''); setSearchExpanded(false) } }}
            />
            {/* Mobile close button */}
            {searchExpanded && (
              <MobileSearchClose onClick={() => { setSearchExpanded(false); setSearchQ(''); setSearchResults([]) }}>
                <X size={14} />
              </MobileSearchClose>
            )}
            {searchResults.length > 0 && (
              <SearchResults>
                {searchResults.map(g => (
                  <SearchResultItem key={g.id} to={`/game/${g.slug}`} onClick={() => { setSearchQ(''); setSearchResults([]) }}>
                    <img
                      src={g.cover_image || '/placeholder-game.png'}
                      alt={g.title}
                      style={{ width: 40, height: 30, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>{g.title}</span>
                  </SearchResultItem>
                ))}
              </SearchResults>
            )}
            {searching && (
              <Loading>
                <div style={{ width: 14, height: 14, border: '2px solid rgba(124,58,237,0.4)', borderTopColor: '#7c3aed', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </Loading>
            )}
          </SearchWrap>

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Mobile toggle */}
          <MobileMenuBtn onClick={() => setMobileOpen(v => !v)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </MobileMenuBtn>
        </Nav>
      </HeaderWrap >

      {/* Mobile Menu */}
      < MobileMenu $open={mobileOpen} >
        <MobileLink to="/">🏠 Home</MobileLink>
        <MobileLink to="/az-filter">🔤 A-Z Filter</MobileLink>
        <MobileLink to="/top-games">🏆 Top PC Games</MobileLink>
        <MobileLink to="/comments">💬 Guestbook</MobileLink>
        <MobileLink to="/coming-soon" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.06)' }}>🚀 Coming Soon &amp; Free Games</MobileLink>
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: 12, color: 'rgba(148,163,184,0.5)', padding: '8px 16px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Browse A-Z</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 16px' }}>
            {AZ_LETTERS.map(l => (
              <MobileLink key={l} to={`/az-filter?letter=${l}`} style={{ padding: '8px 12px', minWidth: 42, textAlign: 'center' }}>{l}</MobileLink>
            ))}
          </div>
        </div>
      </MobileMenu >
    </>
  )
}
