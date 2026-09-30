import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../../lib/supabase"
import { useAdminAuth } from "../../context/AdminAuthContext"

export default function AdminGateway() {
  const { isAuthenticated, isLoading } = useAdminAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/ap-admin/dashboard", { replace: true })
    }
  }, [isAuthenticated, isLoading, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) { setError("กรุณากรอก Email และ Password"); return }
    setBusy(true)
    setError("")
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setBusy(false) }
  }

  if (isLoading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080810",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#7c3aed", fontSize: "18px", fontFamily: "sans-serif"
      }}>
        กำลังโหลด...
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div style={{
      minHeight: "100vh", background: "#080810",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "rgba(20,20,40,0.9)",
        border: "1px solid rgba(124,58,237,0.3)",
        borderRadius: "16px", padding: "48px 40px",
        width: "100%", maxWidth: "400px",
        boxShadow: "0 20px 40px rgba(0,0,0,0.6)"
      }}>
        <h1 style={{
          color: "#fff", textAlign: "center", marginBottom: "8px",
          fontSize: "24px", fontWeight: "700"
        }}>
          🎮 LA-GAME Admin
        </h1>
        <p style={{ color: "rgba(148,163,184,0.7)", textAlign: "center", marginBottom: "32px", fontSize: "14px" }}>
          Admin Portal — กรุณาเข้าสู่ระบบ
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", color: "rgba(148,163,184,0.8)", marginBottom: "6px", fontSize: "13px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@example.com"
              disabled={busy}
              style={{
                width: "100%", background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px", padding: "12px 14px",
                color: "#fff", fontSize: "15px", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          <div style={{ marginBottom: "24px" }}>
            <label style={{ display: "block", color: "rgba(148,163,184,0.8)", marginBottom: "6px", fontSize: "13px" }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={busy}
              style={{
                width: "100%", background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "8px", padding: "12px 14px",
                color: "#fff", fontSize: "15px", outline: "none",
                boxSizing: "border-box"
              }}
            />
          </div>

          {error && (
            <div style={{
              color: "#ef4444", background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: "8px", padding: "10px 14px",
              marginBottom: "16px", fontSize: "13px"
            }}>
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            style={{
              width: "100%", padding: "14px",
              background: busy ? "rgba(124,58,237,0.5)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
              color: "#fff", border: "none", borderRadius: "8px",
              fontSize: "16px", fontWeight: "600", cursor: busy ? "not-allowed" : "pointer"
            }}
          >
            {busy ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>
      </div>
    </div>
  )
}
