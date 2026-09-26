import styled, { keyframes } from 'styled-components'

export const shimmer = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`

export const SkeletonBase = styled.div`
  background: linear-gradient(90deg, 
    rgba(148, 163, 184, 0.05) 25%, 
    rgba(148, 163, 184, 0.1) 50%, 
    rgba(148, 163, 184, 0.05) 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite linear;
  border-radius: 8px;
`
