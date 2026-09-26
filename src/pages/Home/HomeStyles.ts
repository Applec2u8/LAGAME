import styled, { keyframes, css } from 'styled-components'

export const Hero = styled.div`
  background: 
    linear-gradient(to bottom, rgba(8,8,16,0.55) 0%, rgba(8,8,16,0.92) 100%),
    url('/bg.jpg') center 38%/cover no-repeat;
  border-bottom: 0px solid rgba(124,58,237,0.15);
  padding: 64px 24px 56px;
  text-align: center;
  position: relative;
  overflow: hidden;
  
  @media (max-width: 768px) {
    background: 
      linear-gradient(to bottom, rgba(8,8,16,0.55) 0%, rgba(8,8,16,0.92) 100%),
      url('/bg.jpg') center 40%/cover no-repeat;
  }
  
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, transparent 0%, rgba(8,8,16,0.7) 100%);
  }
  
  > * { position: relative; z-index: 1; }
`

export const HeroTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: clamp(2rem, 5vw, 3.5rem);
  font-weight: 900;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 12px;
  line-height: 1.1;
  text-shadow: 0 4px 20px rgba(0,0,0,0.5);
`

export const HeroSub = styled.p`
  font-size: 16px;
  color: rgba(148,163,184,0.8);
  max-width: 500px;
  margin: 0 auto;
`

export const UptimeContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 24px;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    gap: 8px;
    margin-top: 16px;
  }
`

export const UptimeBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(18, 18, 31, 0.6);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 8px;
  padding: 8px 16px;
  min-width: 80px;

  @media (max-width: 768px) {
    min-width: 65px;
    padding: 6px 10px;
    border-radius: 6px;
  }
`

export const UptimeValue = styled.span`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 0 10px rgba(124, 58, 237, 0.5);

  @media (max-width: 768px) {
    font-size: 16px;
  }
`

export const UptimeLabel = styled.span`
  font-size: 10px;
  color: rgba(148, 163, 184, 0.8);
  text-transform: uppercase;
  letter-spacing: 1px;

  @media (max-width: 768px) {
    font-size: 9px;
    letter-spacing: 0.5px;
  }
`

export const HeroStats = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 32px;
  margin-top: 28px;
  flex-wrap: wrap;
`

export const Stat = styled.div`
  text-align: center;
`

export const StatNum = styled.div`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 28px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

export const StatLabel = styled.div`
  font-size: 12px;
  color: rgba(148,163,184,0.6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

export const PageWrap = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 28px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`

export const Sidebar = styled.aside`
  @media (max-width: 900px) { display: none; }
`

export const SidebarCard = styled.div`
  background: rgba(18,18,31,0.8);
  border: 1px solid rgba(124,58,237,0.15);
  border-radius: 14px;
  padding: 20px;
  position: sticky;
  top: 90px;
`

export const SidebarTitle = styled.h3`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(148,163,184,0.6);
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const CatBtn = styled.button<{ $active: boolean }>`
  width: 100%;
  text-align: left;
  padding: 9px 12px;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  font-size: 14px;
  font-weight: ${p => p.$active ? 600 : 400};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.8)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'transparent'};
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.15s;
  margin-bottom: 2px;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

// const SidebarLink = styled(Link)`
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   width: 100%;
//   padding: 10px 14px;
//   margin-top: 12px;
//   border-radius: 10px;
//   border: 1px dashed rgba(251,191,36,0.3);
//   background: rgba(251,191,36,0.06);
//   color: rgba(251,191,36,0.85);
//   font-size: 13px;
//   font-weight: 600;
//   text-decoration: none;
//   transition: all 0.2s;
//   &:hover {
//     background: rgba(251,191,36,0.15);
//     border-color: rgba(251,191,36,0.5);
//     color: #fbbf24;
//   }
// `

export const Content = styled.div``

export const Toolbar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
`

export const ToolbarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

export const SortSelect = styled.select`
  padding: 8px 14px;
  background: rgba(18,18,31,0.8);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 8px;
  color: #e2e8f0;
  font-size: 13px;
  outline: none;
  cursor: pointer;
  &:focus { border-color: rgba(124,58,237,0.5); }
  @media (max-width: 900px) { display: none; }
`

/* ─── Mobile Filter Button ─────────────────────────────── */
export const MobileFilterBtn = styled.button<{ $active?: boolean }>`
  display: none;
  @media (max-width: 900px) {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 16px;
    background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
    border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.2)'};
    border-radius: 10px;
    color: ${p => p.$active ? '#c4b5fd' : '#e2e8f0'};
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Noto Sans Lao', sans-serif;
  }
`

export const FilterBadge = styled.span`
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  border-radius: 999px;
  padding: 1px 7px;
  min-width: 18px;
  text-align: center;
`

/* ─── Bottom Sheet Overlay ─────────────────────────────── */
export const slideUp = keyframes`
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
`
export const slideDown = keyframes`
  from { transform: translateY(0); }
  to   { transform: translateY(100%); }
`
export const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`
export const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`

export const Backdrop = styled.div<{ $closing: boolean }>`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  animation: ${p => p.$closing ? css`${fadeOut} 0.28s ease forwards` : css`${fadeIn} 0.2s ease forwards`};
`

export const Sheet = styled.div<{ $closing: boolean }>`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 1001;
  background: #0f0f1f;
  border-top: 1px solid rgba(124,58,237,0.3);
  border-radius: 20px 20px 0 0;
  padding: 0 0 env(safe-area-inset-bottom, 16px);
  max-height: 88vh;
  overflow-y: auto;
  animation: ${p => p.$closing ? css`${slideDown} 0.28s ease forwards` : css`${slideUp} 0.32s cubic-bezier(0.34,1.56,0.64,1) forwards`};
`

export const SheetHandle = styled.div`
  width: 36px;
  height: 4px;
  background: rgba(255,255,255,0.15);
  border-radius: 2px;
  margin: 14px auto 0;
`

export const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid rgba(124,58,237,0.1);
`

export const SheetTitle = styled.h3`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
`

export const SheetCloseBtn = styled.button`
  width: 32px; height: 32px;
  border-radius: 50%;
  border: 1px solid rgba(124,58,237,0.2);
  background: rgba(124,58,237,0.1);
  color: rgba(148,163,184,0.8);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.2); color: #fff; }
`

export const SheetSection = styled.div`
  padding: 16px 20px;
  border-bottom: 1px solid rgba(124,58,237,0.08);
  &:last-child { border-bottom: none; }
`

export const SheetSectionTitle = styled.p`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(148,163,184,0.5);
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
`

export const OptionChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.6)' : 'rgba(124,58,237,0.15)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.25)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.8)'};
  font-size: 13px;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.15s;
  font-family: 'Noto Sans Lao', sans-serif;
  &:hover { border-color: rgba(124,58,237,0.4); color: #fff; }
`

export const ChipsRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`

export const MobileCatBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 11px 14px;
  border-radius: 10px;
  border: 1px solid ${p => p.$active ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.12)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.2)' : 'rgba(18,18,31,0.6)'};
  color: ${p => p.$active ? '#c4b5fd' : 'rgba(148,163,184,0.8)'};
  font-size: 14px;
  font-weight: ${p => p.$active ? 600 : 400};
  cursor: pointer;
  transition: all 0.12s;
  font-family: 'Noto Sans Lao', sans-serif;
  margin-bottom: 6px;
  &:hover { background: rgba(124,58,237,0.15); color: #fff; }
`

export const SheetApplyBtn = styled.button`
  display: block;
  width: calc(100% - 40px);
  margin: 4px 20px 20px;
  padding: 14px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: 'Noto Sans Lao', sans-serif;
  cursor: pointer;
  transition: opacity 0.2s;
  &:hover { opacity: 0.9; }
`

/* ─── Rest of styles ────────────────────────────── */

export const ResultCount = styled.span`
  font-size: 13px;
  color: rgba(148,163,184,0.6);
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`

export const EmptyState = styled.div`
  text-align: center;
  padding: 80px 24px;
  color: rgba(148,163,184,0.5);
`

export const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 40px;
`

export const PageBtn = styled.button<{ $active?: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 8px;
  border: 1px solid ${p => p.$active ? '#7c3aed' : 'rgba(124,58,237,0.2)'};
  background: ${p => p.$active ? 'rgba(124,58,237,0.3)' : 'rgba(18,18,31,0.8)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148,163,184,0.7)'};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover:not(:disabled) { background: rgba(124,58,237,0.2); color: #fff; }
  &:disabled { opacity: 0.3; cursor: not-allowed; }
`

export const LoadingOverlay = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: rgba(148,163,184,0.6);
  gap: 12px;
  font-size: 14px;
`

export const ScrollTopBtn = styled.button<{ $visible: boolean }>`
  position: fixed;
  bottom: 100px;
  right: 34px;
  z-index: 999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid rgba(124,58,237,0.4);
  background: rgba(18,18,31,0.9);
  backdrop-filter: blur(12px);
  color: #c4b5fd;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 24px rgba(124,58,237,0.3);
  transition: opacity 0.3s, transform 0.3s, background 0.2s;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: ${p => p.$visible ? 'translateY(0)' : 'translateY(16px)'};
  pointer-events: ${p => p.$visible ? 'auto' : 'none'};
  &:hover { background: rgba(124,58,237,0.4); color: #fff; transform: translateY(-2px); }
  @media (max-width: 900px) { bottom: 100px; right: 22px; }
`

/* ─── Helper ─────────────────────────────────────── */
