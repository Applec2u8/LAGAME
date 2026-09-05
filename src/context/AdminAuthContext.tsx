import React, { createContext, useContext, useState } from 'react'

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234'
const SESSION_KEY = 'lapack_admin_auth'

type AdminAuthContextType = {
  isAuthenticated: boolean
  login: (pin: string) => boolean
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType>({
  isAuthenticated: false,
  login: () => false,
  logout: () => { },
})

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem(SESSION_KEY) === 'true'
  })

  const login = (pin: string): boolean => {
    if (pin === ADMIN_PIN) {
      sessionStorage.setItem(SESSION_KEY, 'true')
      setIsAuthenticated(true)
      return true
    }
    return false
  }

  const logout = () => {
    sessionStorage.removeItem(SESSION_KEY)
    setIsAuthenticated(false)
    window.location.href = '/'
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export const useAdminAuth = () => useContext(AdminAuthContext)
