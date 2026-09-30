import React from "react"
import { Navigate } from "react-router-dom"
import { useAdminAuth } from "../context/AdminAuthContext"

export default function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAdminAuth()

  // While checking auth, render nothing (transparent) - avoids redirect loop
  if (isLoading) {
    return null
  }

  if (!isAuthenticated) {
    return <Navigate to="/ap-admin/login" replace />
  }

  return <>{children}</>
}
