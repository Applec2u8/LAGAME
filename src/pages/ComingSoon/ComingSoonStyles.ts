import styled, { keyframes, css } from 'styled-components'

const float = keyframes`
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-7px)}
`
const shimmer = keyframes`
  0%{background-position:-200% center}
  100%{background-position:200% center}
`
export const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`

export const SpinRefreshIcon = styled.span<{ $active: boolean }>`
  display: inline-flex;
  ${p => p.$active && css`
    animation: ${spin} 0.8s linear infinite;
  `}
`

export const HeroBanner = styled.div`
  background:
    linear-gradient(to bottom,rgba(8,8,16,.5) 0%,rgba(8,8,16,.96) 100%),
    url('/bg.jpg') center 38%/cover no-repeat;
  padding: 56px 24px 48px;
  text-align: center;
  position: relative;
  overflow: hidden;
  &::before {
    content:'';
    position:absolute;inset:0;
    background:radial-gradient(ellipse at center top,rgba(124,58,237,.18) 0%,transparent 60%);
  }
  >*{position:relative;z-index:1}
`
export const HeroIconWrap = styled.div`
  font-size:56px;
  line-height:1;
  margin-bottom:12px;
  animation:${float} 3s ease-in-out infinite;
`
export const HeroTitle = styled.h1`
  font-family:'Noto Sans Lao',sans-serif;
  font-size:clamp(1.8rem,4vw,3rem);
  font-weight:900;
  margin-bottom:10px;
  background:linear-gradient(135deg,#fff 0%,#a855f7 50%,#06b6d4 100%);
  background-size:200% auto;
  -webkit-background-clip:text;
  -webkit-text-fill-color:transparent;
  background-clip:text;
  animation:${shimmer} 3s linear infinite;
`
export const HeroSub = styled.p`
  color:rgba(148,163,184,.8);
  font-size:15px;
  max-width:520px;
  margin:0 auto;
`
export const Wrap = styled.div`
  max-width:1280px;
  margin:0 auto;
  padding:0 20px 60px;
`
export const Section = styled.section`margin-bottom:48px`

export const SectionHeader = styled.div`
  display:flex;
  align-items:center;
  flex-wrap:wrap;
  gap:10px;
  margin-bottom:20px;
  padding-bottom:12px;
  border-bottom:1px solid rgba(124,58,237,.15);
`
export const SectionTitle = styled.h2`
  font-size:clamp(15px, 3.5vw, 18px);
  font-weight:700;color:#e2e8f0;margin:0;
  display:flex;
  align-items:center;gap:8px;
`
export const Badge = styled.span`
  font-size:11px;font-weight:600;padding:3px 10px;
  border-radius:99px;background:rgba(124,58,237,.2);
  color:#a855f7;border:1px solid rgba(124,58,237,.3);
`
export const RefreshBtn = styled.button`
  margin-left:auto;
  display:flex;align-items:center;gap:6px;
  padding:6px 14px;border-radius:8px;
  background:rgba(124,58,237,.15);
  border:1px solid rgba(124,58,237,.3);
  color:#a855f7;font-size:12px;font-weight:600;
  cursor:pointer;transition:all .2s;
  &:hover{background:rgba(124,58,237,.25)}
  &:disabled{opacity:.5;cursor:not-allowed}
`
export const StatusRow = styled.div`
  display:flex;align-items:center;gap:10px;
  color:rgba(148,163,184,.6);font-size:13px;padding:20px 0;
`
export const ErrorBox = styled.div`
  padding:18px;border-radius:12px;
  background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);
  color:rgba(239,68,68,.9);font-size:13px;
`

export const EpicGrid = styled.div`
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(190px,1fr));
  gap:20px;
  @media(max-width:640px){
    grid-template-columns:repeat(auto-fill,minmax(145px,1fr));
    gap:12px;
  }
`
export const EpicCard = styled.a<{ $now: boolean }>`
  display:block;border-radius:14px;overflow:hidden;
  background:rgba(18,18,31,.9);
  border:1px solid ${p => p.$now ? 'rgba(34,197,94,.25)' : 'rgba(251,191,36,.25)'};
  text-decoration:none;
  transition:transform .25s,box-shadow .25s,border-color .25s,opacity .25s;
  position:relative;
  &:hover{
    transform:translateY(-4px);
    box-shadow:0 12px 32px ${p => p.$now ? 'rgba(34,197,94,.18)' : 'rgba(251,191,36,.18)'};
    border-color:${p => p.$now ? 'rgba(34,197,94,.5)' : 'rgba(251,191,36,.5)'};
  }
`
export const EpicImgWrap = styled.div`position:relative;aspect-ratio:3/4;overflow:hidden;background:#0d0d1a`
export const EpicImg = styled.img<{ $now?: boolean }>`
  width:100%;height:100%;object-fit:cover;
  transition:transform .4s ease,opacity .4s ease;
  opacity: ${p => p.$now ? 1 : 0.5};
  ${EpicCard}:hover &{
    transform:scale(1.05);
    opacity: 1;
  }
`
export const EpicBadge = styled.div<{ $now: boolean }>`
  position:absolute;top:8px;left:8px;
  font-size:10px;font-weight:700;padding:4px 8px;border-radius:6px;
  background:${p => p.$now ? 'rgba(34,197,94,.9)' : 'rgba(251,191,36,.9)'};
  color:#000;text-transform:uppercase;letter-spacing:.5px;
  backdrop-filter:blur(4px);
`
export const EpicSource = styled.div`
  position:absolute;bottom:8px;right:8px;
  font-size:9px;font-weight:700;padding:3px 7px;
  border-radius:5px;background:rgba(0,0,0,.7);
  color:rgba(255,255,255,.7);letter-spacing:.5px;
`
export const EpicBody = styled.div`padding:12px`
export const EpicTitle = styled.div`
  font-size:13px;font-weight:700;color:#e2e8f0;
  margin-bottom:6px;line-height:1.3;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
`
export const EpicDate = styled.div`
  font-size:11px;color:rgba(148,163,184,.7);
  display:flex;align-items:center;gap:5px;
`

export const CountdownWrap = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(4px);
  padding: 8px 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 85%;
  z-index: 2;
  pointer-events: none;
`

export const TimeBox = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`

export const TimeSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  span.val { font-size: 15px; }
  span.lbl { font-size: 9px; color: rgba(255,255,255,0.6); text-transform: uppercase; margin-top: 2px; }
`
