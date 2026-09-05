import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { Download, Eye, Monitor, Apple } from 'lucide-react'
import type { Game } from '../../lib/supabase'
import { useCategoryTranslator } from '../../lib/i18n/CategoryTranslator'

const Card = styled(Link)`
  display: block;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(18, 18, 31, 0.8);
  border: 1px solid rgba(124, 58, 237, 0.15);
  transition: border-color 0.25s, box-shadow 0.25s, transform 0.25s;
  position: relative;
  text-decoration: none;
  opacity: 1;
  &:hover {
    border-color: rgba(124, 58, 237, 0.5);
    box-shadow: 0 0 30px rgba(124, 58, 237, 0.25);
    transform: translateY(-3px);
  }
`

const CoverWrap = styled.div`
  position: relative;
  aspect-ratio: 3/4; /* Standard Game Cover Aspect Ratio (IGDB) */
  overflow: hidden;
  background: #12121f;
`

const Cover = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top center;
  transition: transform 0.4s ease;
  ${Card}:hover & { transform: scale(1.05); }
`

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(8,8,16,0.9) 0%, transparent 60%);
  opacity: 0;
  transition: opacity 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-bottom: 16px;
  ${Card}:hover & { opacity: 1; }
`

const ViewBtn = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  background: rgba(124,58,237,0.9);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  backdrop-filter: blur(4px);
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
  height: 74px; /* Matches normal height of Body to maintain card layout */
`

const Title = styled.h3`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 15px;
  font-weight: 700;
  color: #e2e8f0;
  margin-bottom: 8px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
  
  ${Card}:hover & {
    -webkit-line-clamp: unset;
    display: block;
  }
`

const Meta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const CategoryBadge = styled.span`
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: rgba(124,58,237,0.15);
  color: #9d5cf5;
  border: 1px solid rgba(124,58,237,0.25);
`

const DownloadCount = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(148,163,184,0.6);
`

const ViewCountBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: rgba(148,163,184,0.55);
`

const PlaceholderCover = styled.div`
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #12121f, #1a1a2e);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48px;
`

type Props = {
  game: Game & { category?: { name: string }; download_links?: { id: string }[] }
  index?: number
}

export default function GameCard({ game }: Props) {
  const { translateCategoryName } = useCategoryTranslator()
  return (
    <Card to={`/game/${game.slug}`}>
      <CoverWrap>
        {game.cover_image ? (
          <Cover src={game.cover_image} alt={game.title} loading="lazy" />
        ) : (
          <PlaceholderCover>🎮</PlaceholderCover>
        )}
        <Overlay>
          <ViewBtn>
            <Eye size={14} />
            View Details
          </ViewBtn>
        </Overlay>
      </CoverWrap>

      <BodySpacer />

      <Body>
        <Title title={game.title}>{game.title}</Title>
        <Meta>
          <div style={{ display: (game.is_coming_soon ? 'none' : 'flex'), alignItems: 'center', gap: 8 }}>
            <CategoryBadge>{translateCategoryName(game.category?.name || 'Game')}</CategoryBadge>
            {game.system_requirements?.platforms && game.system_requirements.platforms.length > 0 && (
              <div style={{ display: 'flex', gap: 8, color: 'rgba(148,163,184,0.7)', fontSize: 11, fontWeight: 600 }}>
                {game.system_requirements.platforms.includes('windows') && <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Monitor size={12} /> Win</div>}
                {game.system_requirements.platforms.includes('macos') && <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}><Apple size={12} /> Mac</div>}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ViewCountBadge title="Views">
              <Eye size={11} />
              {(game.view_count ?? 0) >= 1000
                ? `${((game.view_count ?? 0) / 1000).toFixed(1)}k`
                : (game.view_count ?? 0)}
            </ViewCountBadge>
            {(game as any).is_coming_soon ? (
              <DownloadCount style={{ color: '#fbbf24', fontWeight: 600 }}>
                🚀 Coming Soon
              </DownloadCount>
            ) : (
              <DownloadCount>
                <Download size={11} />
                {game.download_links?.length ?? 0} links
              </DownloadCount>
            )}
          </div>
        </Meta>
      </Body>
    </Card>
  )
}
