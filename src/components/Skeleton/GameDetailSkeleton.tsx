import styled from 'styled-components'
import { SkeletonBase } from './SkeletonStyles'

const PageWrap = styled.div`max-width: 1200px; margin: 0 auto; padding: 24px; display: grid; gap: 32px;`

const TopSection = styled.div`
  display: grid; grid-template-columns: 300px 1fr; gap: 40px;
  @media (max-width: 768px) { grid-template-columns: 1fr; }
`

const LeftCol = styled.div``
const RightCol = styled.div``

const CoverSkeleton = styled(SkeletonBase)`
  aspect-ratio: 3/4; width: 100%; border-radius: 12px; margin-bottom: 24px;
`

const TitleSkeleton = styled(SkeletonBase)`
  height: 48px; width: 80%; margin-bottom: 16px; border-radius: 8px;
`

const DescSkeleton = styled(SkeletonBase)`
  height: 16px; width: 100%; margin-bottom: 8px; border-radius: 4px;
`

const MetaBoxSkeleton = styled(SkeletonBase)`
  height: 200px; width: 100%; border-radius: 12px; margin-top: 24px;
`

export default function GameDetailSkeleton() {
  return (
    <PageWrap>
      <TopSection>
        <LeftCol>
          <CoverSkeleton />
        </LeftCol>
        <RightCol>
          <TitleSkeleton />
          <DescSkeleton />
          <DescSkeleton />
          <DescSkeleton style={{ width: '60%' }} />
          <MetaBoxSkeleton />
        </RightCol>
      </TopSection>
    </PageWrap>
  )
}
