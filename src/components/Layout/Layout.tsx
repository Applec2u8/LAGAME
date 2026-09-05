import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Header from '../Header/Header'
import Footer from '../Footer/Footer'
import ChatBot from '../ChatBot/ChatBot'
import { trackSiteVisit } from '../../lib/analytics'

export default function Layout() {
  useEffect(() => {
    trackSiteVisit()
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1, paddingTop: '80px' }}>
        <Outlet />
      </main>
      <Footer />
      <ChatBot />
    </div>
  )
}
