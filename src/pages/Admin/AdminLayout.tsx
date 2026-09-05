import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { LayoutDashboard, Gamepad2, Tags, Megaphone, LogOut, Menu, X, Key, MessageSquare, Bot } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { supabase } from '../../lib/supabase'

const Shell = styled.div`display: flex; min-height: 100vh; background: #080810;`

const Sidebar = styled.aside<{ $open: boolean }>`
  width: 240px; flex-shrink: 0;
  background: rgba(12,12,22,0.95); backdrop-filter: blur(16px);
  border-right: 1px solid rgba(124,58,237,0.15);
  display: flex; flex-direction: column;
  @media (max-width: 768px) {
    position: fixed; left: ${p => p.$open ? '0' : '-240px'};
    top: 0; bottom: 0; z-index: 200; transition: left 0.25s ease;
  }
`

const SidebarTop = styled.div`
  padding: 24px 20px 20px;
  border-bottom: 1px solid rgba(124,58,237,0.1);
`

const Logo = styled.div`
  display: flex; align-items: center; gap: 10px;
  font-family: 'Noto Sans Lao', sans-serif; font-size: 20px; font-weight: 800;
  color: #e2e8f0;
  margin-bottom: 4px;
`

const AdminBadge = styled.div`
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: rgba(148,163,184,0.5); padding-left: 2px;
`

const Nav = styled.nav`flex: 1; padding: 16px 12px;`

const NavItem = styled(NavLink)`
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 12px; border-radius: 10px; margin-bottom: 4px;
  font-size: 14px; font-weight: 500; color: rgba(148,163,184,0.8);
  transition: all 0.15s; text-decoration: none;
  &:hover { background: rgba(124,58,237,0.12); color: #fff; }
  &.active { background: rgba(124,58,237,0.2); color: #fff; border: 1px solid rgba(124,58,237,0.25); }
`

const NavLabel = styled.div`
  display: flex; align-items: center; gap: 10px;
`

const Badge = styled.div`
  background: #ef4444; color: #fff; font-size: 10px; font-weight: 800;
  padding: 2px 6px; border-radius: 10px; min-width: 20px; text-align: center;
`

const LogoutBtn = styled.button`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 20px; width: 100%;
  background: transparent; border: none; border-top: 1px solid rgba(124,58,237,0.1);
  color: rgba(148,163,184,0.6); font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.15s;
  &:hover { color: #ef4444; background: rgba(239,68,68,0.08); }
`

const Main = styled.main`flex: 1; overflow-x: hidden; display: flex; flex-direction: column;`

const TopBar = styled.div`
  height: 60px; background: rgba(12,12,22,0.8); backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(124,58,237,0.1);
  display: flex; align-items: center; padding: 0 24px; justify-content: space-between;
  position: sticky; top: 0; z-index: 100;
`

const TopBarLeft = styled.div`display: flex; align-items: center; gap: 16px;`

const MobileToggle = styled.button`
  display: none;
  @media (max-width: 768px) { display: flex; align-items: center; }
  background: none; border: none; color: #e2e8f0; cursor: pointer; padding: 0;
`

const Backdrop = styled.div<{ $open: boolean }>`
  display: none;
  @media (max-width: 768px) { display: ${p => p.$open ? 'block' : 'none'}; }
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 199;
`

const Content = styled.div`padding: 32px 24px; flex: 1;`

const navItems = [
  { to: '/ap-admin/dashboard', icon: <LayoutDashboard size={16} />, label: 'Dashboard' },
  { to: '/ap-admin/support', icon: <MessageSquare size={16} />, label: 'Support Chat' },
  { to: '/ap-admin/games', icon: <Gamepad2 size={16} />, label: 'Manage Games' },
  { to: '/ap-admin/categories', icon: <Tags size={16} />, label: 'Categories' },
  { to: '/ap-admin/comments', icon: <MessageSquare size={16} />, label: 'Comments' },
  { to: '/ap-admin/api-keys', icon: <Key size={16} />, label: 'API Keys' },
  { to: '/ap-admin/chatbot-settings', icon: <Bot size={16} />, label: 'Chatbot Settings' },
  { to: '/ap-admin/top-ranking', icon: <Megaphone size={16} />, label: 'AI Top Ranking' },
  { to: '/ap-admin/ads', icon: <Megaphone size={16} />, label: 'Ad Settings' },
]

export default function AdminLayout() {
  const { logout } = useAdminAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [unreadSupport, setUnreadSupport] = useState(0)
  const [unreadComments, setUnreadComments] = useState(0)

  useEffect(() => {
    const fetchCounts = async () => {
      const { count: supportCount } = await supabase
        .from('support_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('is_read_by_admin', false)
      
      const { count: commentsCount } = await supabase
        .from('comments')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
      
      if (supportCount !== null) setUnreadSupport(supportCount)
      if (commentsCount !== null) setUnreadComments(commentsCount)
    }
    
    fetchCounts()

    const sub = supabase.channel('admin_notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_sessions' }, fetchCounts)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, fetchCounts)
      .subscribe()
      
    return () => { sub.unsubscribe() }
  }, [])

  const handleLogout = () => { logout(); navigate('/ap-admin') }

  return (
    <Shell>
      <Backdrop $open={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      <Sidebar $open={sidebarOpen}>
        <SidebarTop>
          <Logo><Gamepad2 size={22} color="#06b6d4" /> LAPACK</Logo>
          <AdminBadge>🔐 Admin Panel</AdminBadge>
        </SidebarTop>

        <Nav>
          {navItems.map(item => {
            const isSupport = item.to.includes('support')
            const isComments = item.to.includes('comments')
            const badgeCount = isSupport ? unreadSupport : isComments ? unreadComments : 0
            
            return (
              <NavItem key={item.to} to={item.to} onClick={() => setSidebarOpen(false)}>
                <NavLabel>
                  {item.icon}
                  {item.label}
                </NavLabel>
                {badgeCount > 0 && <Badge>{badgeCount > 99 ? '99+' : badgeCount}</Badge>}
              </NavItem>
            )
          })}
        </Nav>

        <LogoutBtn onClick={handleLogout}>
          <LogOut size={14} /> Logout
        </LogoutBtn>
      </Sidebar>

      <Main>
        <TopBar>
          <TopBarLeft>
            <MobileToggle onClick={() => setSidebarOpen(v => !v)}>
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </MobileToggle>
            <span style={{ fontSize: 16, color: '#e2e8f0', fontWeight: 600, letterSpacing: '0.5px' }}>Control Panel</span>
          </TopBarLeft>
        </TopBar>
        <Content>
          <Outlet />
        </Content>
      </Main>
    </Shell>
  )
}
