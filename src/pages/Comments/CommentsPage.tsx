import styled from 'styled-components'
import CommentSection from '../../components/CommentSection/CommentSection'
import { useLanguage } from '../../lib/i18n/LanguageContext'
import Seo from '../../components/Seo'

const Page = styled.div`max-width: 860px; margin: 0 auto; padding: 40px 24px;`

const Hero = styled.div`
  text-align: center; margin-bottom: 48px;
`

const Title = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: clamp(10px, 4.5vw, 36px);
  font-weight: 800; color: #fff;
  margin: 0 0 12px 0;
`

const Sub = styled.p`
  color: rgba(148,163,184,0.7);
  font-size: clamp(13px, 1.8vw, 15px);
  margin: 0;
`

export default function CommentsPage() {
  const { t } = useLanguage()
  const pageTitle = 'Guestbook & Reviews'
  const pageDescription = 'Read reviews and leave comments about your favorite free PC games on LA-GAME.'
  const pageKeywords = 'game reviews, guestbook, pc game comments, free game feedback'

  return (
    <>
      <Seo
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        path="/comments"
        image="/LOGO.png"
        type="website"
        schema={{
          '@type': 'DiscussionForumPosting',
          headline: pageTitle,
          articleBody: pageDescription,
        }}
      />

      <Page>
        <Hero>
          <div style={{ fontSize: 52, marginBottom: 12 }}>💬</div>
          <Title>{t('comments.title')}</Title>
          <Sub>{t('comments.sub')}</Sub>
        </Hero>
        <CommentSection type="website" />
      </Page>
    </>
  )
}
