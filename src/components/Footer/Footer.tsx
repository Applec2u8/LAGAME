import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useLanguage } from '../../lib/i18n/LanguageContext'

export default function Footer() {
  const { t } = useLanguage()

  return (
    <footer style={{
      borderTop: '1px solid rgba(124,58,237,0.15)',
      background: 'rgba(8,8,16,0.8)',
      padding: '40px 24px 24px',
      marginTop: '40px',
    }}>
      <div className="page-container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/LOGO.png" alt="LAPACK Logo" style={{ height: 40, width: 'auto', borderRadius: 3 }} />
            <div style={{ display: 'grid', alignItems: 'center', gap: 2 }}>
              <span style={{ fontFamily: 'Noto Sans Lao', fontWeight: 800, fontSize: 18, background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>LA-GAME</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'Noto Sans Lao', fontSize: 8, color: '#fff' }}>
                LAOS <p style={{ fontSize: 6 }}>LA</p>
                <img src="/LAOS.png" alt="Laos Flag" style={{ width: 12, height: 8, marginLeft: 4, marginRight: 4 }} />
              </span  >
            </div>
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Link to="/" style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)', transition: 'color 0.2s' }}>{t('nav.home')}</Link>
            <Link to="/az-filter" style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)' }}>{t('nav.az_filter')}</Link>
            <Link to="/top-games" style={{ fontSize: 13, color: 'rgba(148,163,184,0.7)' }}>{t('nav.top_games')}</Link>
          </div>
        </div>
        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 13, color: 'rgba(148,163,184,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          Apple.2u8 <Heart size={12} style={{ color: '#ef4444' }} /> {t('footer.by_team')} (1) &nbsp;·&nbsp; © {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  )
}
