import styled from 'styled-components'
import { SkeletonBase } from './SkeletonStyles'

const CardContainer = styled.div`
  display: block;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(18, 18, 31, 0.8);
  border: 1px solid rgba(124, 58, 237, 0.15);
  position: relative;
`

const CoverWrap = styled.div`
  position: relative;
  aspect-ratio: 3/4;
  overflow: hidden;
  background: #12121f;
`

const CoverSkeleton = styled(SkeletonBase)`
  width: 100%;
  height: 100%;
  border-radius: 0;
`

const Body = styled.div`
  padding: 14px 16px 16px;
  background: rgba(18, 18, 31, 1);
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 2;
`

const BodySpacer = styled.div`
  height: 74px;
`

const TitleSkeleton = styled(SkeletonBase)`
  height: 18px;
  width: 80%;
  margin-bottom: 8px;
`

const MetaSkeleton = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const BadgeSkeleton = styled(SkeletonBase)`
  height: 20px;
  width: 60px;
  border-radius: 999px;
`

const StatSkeleton = styled(SkeletonBase)`
  height: 16px;
  width: 80px;
  border-radius: 4px;
`

export default function GameCardSkeleton() {
  return (
    <CardContainer>
      <CoverWrap>
        <CoverSkeleton />
      </CoverWrap>
      <BodySpacer />
      <Body>
        <TitleSkeleton />
        <MetaSkeleton>
          <BadgeSkeleton />
          <StatSkeleton />
        </MetaSkeleton>
      </Body>
    </CardContainer>
  )
}
