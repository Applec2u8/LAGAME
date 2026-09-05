import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styled, { keyframes } from 'styled-components'
import { Gamepad2, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { useAdminAuth } from '../../context/AdminAuthContext'
const Page = styled.div`
  min-height: 100vh;
  background: #080810;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
`

const Bg = styled.div`
  position: absolute;
  inset: 0;
  background-image: radial-gradient(circle, rgba(124,58,237,0.06) 1px, transparent 1px);
  background-size: 32px 32px;
`

const GlowOrb = styled.div`
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%);
  border-radius: 50%;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
`

const fadeScale = keyframes`
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
`

const Modal = styled.div`
  position: relative;
  z-index: 10;
  width: 420px;
  max-width: calc(100vw - 32px);
  background: rgba(14, 14, 26, 0.7);
  backdrop-filter: blur(40px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 28px;
  padding: 48px 40px 40px;
  box-shadow: 0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1);
  text-align: center;
  animation: ${fadeScale} 0.5s cubic-bezier(0.16, 1, 0.3, 1);
`

const LogoWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 8px;
`

const LogoText = styled.span`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 26px;
  font-weight: 800;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const Subtitle = styled.p`
  font-size: 13px;
  color: rgba(148,163,184,0.7);
  margin-bottom: 32px;
`

const PinDisplay = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 28px;
`

const PinDot = styled.div<{ $filled: boolean; $error: boolean; $success: boolean }>`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${p =>
    p.$success ? '#22c55e' :
      p.$error ? '#ef4444' :
        p.$filled ? '#7c3aed' : 'rgba(124,58,237,0.2)'
  };
  border: 2px solid ${p =>
    p.$success ? '#22c55e' :
      p.$error ? '#ef4444' :
        p.$filled ? '#7c3aed' : 'rgba(124,58,237,0.3)'
  };
  transition: all 0.2s;
  transform: scale(${p => p.$filled ? 1.1 : 1});
  box-shadow: ${p => p.$filled && !p.$error && !p.$success ? '0 0 10px rgba(124,58,237,0.5)' : 'none'};
`

const Keypad = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
`

const Key = styled.button<{ $wide?: boolean }>`
  grid-column: ${p => p.$wide ? 'span 3' : 'span 1'};
  padding: 16px;
  background: rgba(124,58,237,0.1);
  border: 1px solid rgba(124,58,237,0.2);
  border-radius: 12px;
  color: #e2e8f0;
  font-size: 18px;
  font-weight: 600;
  font-family: 'Noto Sans Lao', sans-serif;
  cursor: pointer;
  transition: all 0.15s;
  &:hover { background: rgba(124,58,237,0.25); border-color: rgba(124,58,237,0.4); transform: scale(1.02); }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
`

const ErrorMsg = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #ef4444;
  font-size: 13px;
  font-weight: 500;
  margin-top: 8px;
`

export default function AdminGateway() {
  const { isAuthenticated, login } = useAdminAuth()
  const navigate = useNavigate()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/ap-admin/dashboard', { replace: true })
  }, [isAuthenticated])

  const handleKey = (k: string) => {
    if (error || success) return
    if (k === 'DEL') { setPin(p => p.slice(0, -1)); return }
    if (pin.length >= 4) return
    const next = pin + k
    setPin(next)
    if (next.length === 4) {
      const ok = login(next)
      if (ok) {
        setSuccess(true)
        setTimeout(() => navigate('/ap-admin/dashboard', { replace: true }), 600)
      } else {
        setError(true)
        setTimeout(() => { setPin(''); setError(false) }, 1000)
      }
    }
  }

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) handleKey(e.key)
      if (e.key === 'Backspace') handleKey('DEL')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [pin, error, success])

  const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

  return (
    <Page>
      <Bg />
      <GlowOrb />
      <Modal>
        <LogoWrap>
          <Gamepad2 size={28} style={{ color: '#7c3aed' }} />
          <LogoText>LAPACK</LogoText>
        </LogoWrap>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 6 }}>
          <Shield size={14} style={{ color: 'rgba(148,163,184,0.5)' }} />
          <span style={{ fontSize: 13, color: 'rgba(148,163,184,0.5)', fontWeight: 500 }}>Admin Access Required</span>
        </div>
        <Subtitle>Enter your 4-digit PIN to continue</Subtitle>

        <PinDisplay>
          {[0, 1, 2, 3].map(i => (
            <PinDot key={i} $filled={i < pin.length} $error={error} $success={success} />
          ))}
        </PinDisplay>

        <Keypad>
          {KEYS.map(k => (
            <Key key={k} onClick={() => handleKey(k)} disabled={pin.length >= 4}>{k}</Key>
          ))}
          <Key onClick={() => handleKey('DEL')} style={{ gridColumn: 'span 1', color: 'rgba(148,163,184,0.6)', fontSize: 14 }}>⌫</Key>
          <Key onClick={() => handleKey('0')} disabled={pin.length >= 4}>0</Key>
          <div />
        </Keypad>

        <div style={{ minHeight: 24 }}>
          {error && (
            <ErrorMsg>
              <AlertCircle size={14} /> Incorrect PIN. Try again.
            </ErrorMsg>
          )}
          {success && (
            <ErrorMsg style={{ color: '#22c55e' }}>
              <CheckCircle size={14} /> Access granted! Redirecting...
            </ErrorMsg>
          )}
        </div>
      </Modal>
    </Page>
  )
}
