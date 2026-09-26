import styled from 'styled-components'
import { SkeletonBase } from './SkeletonStyles'

const CardContainer = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: rgba(18,18,31,0.5);
  border: 1px solid rgba(124,58,237,0.1);
`

const ImgWrap = styled.div`
  aspect-ratio: 16/9;
  width: 100%;
`

const ImgSkeleton = styled(SkeletonBase)`
  width: 100%;
  height: 100%;
  border-radius: 0;
`

const Body = styled.div`
  padding: 14px;
`

const TitleSkeleton = styled(SkeletonBase)`
  height: 16px;
  width: 90%;
  margin-bottom: 8px;
`

const DateSkeleton = styled(SkeletonBase)`
  height: 12px;
  width: 60%;
`

export default function EpicCardSkeleton() {
  return (
    <CardContainer>
      <ImgWrap>
        <ImgSkeleton />
      </ImgWrap>
      <Body>
        <TitleSkeleton />
        <DateSkeleton />
      </Body>
    </CardContainer>
  )
}
