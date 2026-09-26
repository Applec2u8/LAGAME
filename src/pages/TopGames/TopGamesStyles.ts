import styled from 'styled-components'

export const Page = styled.div`
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
`

export const Banner = styled.div`
  background: linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(239,68,68,0.08) 100%);
  border: 1px solid rgba(245,158,11,0.2);
  border-radius: 20px;
  padding: 40px 32px;
  margin-bottom: 36px;
  text-align: center;
`

export const BannerTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 900;
  color: #fff;
  margin-bottom: 10px;
`

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
`

export const TopLabel = styled.div<{ $rank: number }>`
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: ${p => p.$rank === 1 ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : p.$rank === 2 ? 'linear-gradient(135deg,#94a3b8,#64748b)' : p.$rank === 3 ? 'linear-gradient(135deg,#d97706,#92400e)' : 'rgba(124,58,237,0.8)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.4);
`

export const GameWrap = styled.div`
  position: relative;
`
