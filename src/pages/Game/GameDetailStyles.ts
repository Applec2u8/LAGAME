import styled from 'styled-components'

export const Page = styled.div`
  max-width: 1100px; margin: 0 auto; padding: 32px 24px;
  @media (max-width: 480px) { padding: 16px 14px; }
`

export const Back = styled.button`
  background: none; border: none; cursor: pointer; padding: 0;
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; color: rgba(148,163,184,0.7);
  margin-bottom: 24px; transition: color 0.2s;
  &:hover { color: #e2e8f0; }
`

export const Hero = styled.div`
  display: grid; grid-template-columns: 280px 1fr; gap: 32px;
  @media (max-width: 900px) { grid-template-columns: 220px 1fr; gap: 20px; }
  @media (max-width: 600px) { grid-template-columns: 1fr; gap: 20px; }
`

export const CoverImg = styled.img`
  width: 100%; border-radius: 16px;
  border: 1px solid rgba(124,58,237,0.2);
  box-shadow: 0 0 40px rgba(124,58,237,0.2);
  transition: transform 0.3s;
`

export const CoverPlaceholder = styled.div`
  width: 100%; aspect-ratio: 3/4;
  border-radius: 16px; background: linear-gradient(135deg, #12121f, #1a1a2e);
  display: flex; align-items: center; justify-content: center;
  font-size: 64px; border: 1px solid rgba(124,58,237,0.2);
`

export const Info = styled.div``

export const CategoryBadge = styled.span`
  display: inline-flex; align-items: center; padding: 4px 12px;
  border-radius: 999px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  background: rgba(124,58,237,0.15); color: #9d5cf5;
  border: 1px solid rgba(124,58,237,0.25); margin-bottom: 12px;
`

export const Title = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif; font-size: clamp(1.6rem, 4vw, 2.4rem);
  font-weight: 900; color: #fff; margin-bottom: 16px; line-height: 1.15;
`

export const Description = styled.p`
  font-size: 14px; line-height: 1.7;
  color: rgba(148,163,184,0.8); margin-bottom: 28px;
`

export const Section = styled.div`margin-top: 32px;`

export const SectionTitle = styled.h2`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 16px; font-weight: 700;
  color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;
  &::after { content: ''; flex: 1; height: 1px; background: rgba(124,58,237,0.2); }
`

export const DownloadBtn = styled.button`
  display: flex; align-items: center; gap: 12px;
  width: 100%; padding: 14px 20px; margin-bottom: 10px;
  background: rgba(18,18,31,0.9); border: 1px solid rgba(124,58,237,0.25);
  border-radius: 12px; cursor: pointer; transition: all 0.2s;
  color: #e2e8f0; text-align: left;
  &:hover { border-color: rgba(124,58,237,0.6); background: rgba(124,58,237,0.1); transform: translateX(4px); }
`

export const CloudName = styled.span`font-size: 15px; font-weight: 600; flex: 1;`
export const DownArrow = styled.span`font-size: 12px; color: rgba(148,163,184,0.5); display: flex; align-items: center; gap: 4px;`

export const SpecGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`

export const SpecCard = styled.div`
  background: rgba(18,18,31,0.8); border: 1px solid rgba(124,58,237,0.15);
  border-radius: 12px; padding: 18px;
`

export const SpecTitle = styled.h4`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 13px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.5px;
  color: rgba(148,163,184,0.6); margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
`



// Screenshots gallery
export const GalleryWrap = styled.div`position: relative;`
export const GalleryScroll = styled.div`
  display: flex; gap: 12px; overflow-x: auto; padding-bottom: 12px;
  scroll-snap-type: x mandatory;
  &::-webkit-scrollbar { height: 4px; }
  &::-webkit-scrollbar-track { background: rgba(18,18,31,0.5); }
  &::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 2px; }
`
export const Screenshot = styled.img`
  height: 180px; aspect-ratio: 16/9; border-radius: 10px; flex-shrink: 0;
  object-fit: cover; scroll-snap-align: start; cursor: pointer;
  border: 1px solid rgba(124,58,237,0.15);
  transition: border-color 0.2s, transform 0.2s;
  &:hover { border-color: rgba(124,58,237,0.5); transform: scale(1.02); }
`

// Lightbox
export const Lightbox = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.9); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  animation: fadeIn 0.2s ease;
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`

export const LightboxNav = styled.button`
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 52px; height: 52px; border-radius: 50%;
  background: rgba(255,255,255,0.12); backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.2); color: #fff;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.2s, transform 0.2s;
  &:hover { background: rgba(124,58,237,0.6); transform: translateY(-50%) scale(1.1); }
  &:disabled { opacity: 0.25; cursor: default; }
`
export const LightboxCounter = styled.div`
  position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
  border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
  padding: 5px 14px; font-size: 13px; color: rgba(255,255,255,0.8);
`

export const LoadingPage = styled.div`
  display: flex; align-items: center; justify-content: center;
  min-height: 60vh; color: rgba(148,163,184,0.6); gap: 12px; font-size: 14px;
`

export const ComingSoonBadge = styled.div`
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 28px 24px;
  background: linear-gradient(135deg, rgba(124,58,237,0.12), rgba(251,191,36,0.08));
  border: 1px solid rgba(251,191,36,0.3);
  border-radius: 16px;
  margin-bottom: 8px;
`
export const ComingSoonTitle = styled.div`
  font-size: 22px; font-weight: 900; letter-spacing: 2px;
  text-transform: uppercase;
  background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24);
  background-size: 200% auto;
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 2.5s linear infinite;
  @keyframes shimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
`
export const ComingSoonSub = styled.div`
  font-size: 13px; color: rgba(148,163,184,0.6); text-align: center; line-height: 1.6;
`

// Share row
export const ShareRow = styled.div`
  display: flex; flex-wrap: wrap; gap: 10px;
  margin-top: 20px;
  @media (max-width: 480px) { gap: 8px; }
`

export const ShareBtn = styled.button<{ $variant?: 'copy' | 'facebook' | 'twitter' | 'line' | 'native' }>`
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 16px; border-radius: 10px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: all 0.2s; border: 1px solid;
  white-space: nowrap;
  ${({ $variant }) => {
    switch ($variant) {
      case 'facebook': return `background: rgba(24,119,242,0.12); border-color: rgba(24,119,242,0.35); color: #60a5fa;`
      case 'twitter': return `background: rgba(29,161,242,0.12); border-color: rgba(29,161,242,0.35); color: #38bdf8;`
      case 'line': return `background: rgba(0,185,0,0.12); border-color: rgba(0,185,0,0.35); color: #4ade80;`
      case 'native': return `background: rgba(124,58,237,0.15); border-color: rgba(124,58,237,0.4); color: #a78bfa;`
      default: return `background: rgba(30,30,50,0.9); border-color: rgba(148,163,184,0.25); color: rgba(148,163,184,0.85);`
    }
  }}
  &:hover { opacity: 0.85; transform: translateY(-2px); }
`

export const CopyToast = styled.div<{ $visible: boolean }>`
  position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
  background: rgba(124,58,237,0.92); backdrop-filter: blur(10px);
  border: 1px solid rgba(167,139,250,0.4); border-radius: 12px;
  padding: 10px 22px; font-size: 13px; font-weight: 600; color: #fff;
  pointer-events: none; z-index: 9999;
  transition: opacity 0.3s, transform 0.3s;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  transform: translateX(-50%) translateY(${({ $visible }) => ($visible ? '0' : '10px')});
`
