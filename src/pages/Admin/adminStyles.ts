import styled, { keyframes } from 'styled-components'
import { Link } from 'react-router-dom'

// ── Animations ─────────────────────────────────────────────────────
export const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`

export const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`

// ── Page wrapper ──────────────────────────────────────────────────
export const AdminPage = styled.div<{ $maxWidth?: string }>`
  max-width: ${p => p.$maxWidth || '1000px'};
  animation: ${fadeUp} 0.4s ease both;
`

// ── Page Header ───────────────────────────────────────────────────
export const PageHeader = styled.div`
  display: flex; align-items: flex-start; justify-content: space-between;
  flex-wrap: wrap; gap: 16px; margin-bottom: 32px;
`

export const PageTitle = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 28px; font-weight: 800;
  color: #fff; margin: 0; display: flex; align-items: center; gap: 12px;
  letter-spacing: -0.5px;
  span { 
    font-size: 14px; font-weight: 500; font-family: 'Noto Sans Lao', sans-serif;
    color: rgba(148,163,184,0.6); letter-spacing: 0;
  }
`

export const PageSubTitle = styled.p`
  margin: 6px 0 0; font-size: 14px; color: rgba(148,163,184,0.6); font-weight: 400;
`

// ── Cards ─────────────────────────────────────────────────────────
export const Card = styled.div`
  background: rgba(20,20,38,0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
`

export const CardHeader = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 20px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
`

export const CardTitle = styled.h2`
  font-family: 'Noto Sans Lao', sans-serif; font-size: 16px; font-weight: 700;
  color: #fff; margin: 0; display: flex; align-items: center; gap: 8px;
`

export const SectionLabel = styled.div`
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
  color: rgba(148,163,184,0.4); margin-bottom: 16px; margin-top: 28px;
  display: flex; align-items: center; gap: 8px;
  &:first-child { margin-top: 0; }
  &::after { content: ''; flex: 1; height: 1px; background: rgba(255,255,255,0.04); }
`

// ── Grid ──────────────────────────────────────────────────────────
export const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
  @media (max-width: 640px) { grid-template-columns: 1fr; }
`

export const ThreeCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;
  @media (max-width: 900px) { grid-template-columns: 1fr 1fr; }
  @media (max-width: 520px) { grid-template-columns: 1fr; }
`

// ── Form Controls ─────────────────────────────────────────────────
export const Field = styled.div`margin-bottom: 20px;`

export const Label = styled.label`
  display: block; font-size: 13px; font-weight: 600;
  color: rgba(148,163,184,0.9); margin-bottom: 8px; letter-spacing: 0.2px;
`

const inputBase = `
  width: 100%; padding: 11px 16px;
  background: rgba(10,10,20,0.6);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px; color: #e2e8f0;
  font-size: 14px; outline: none;
  font-family: 'Noto Sans Lao', sans-serif;
  transition: border-color 0.2s, box-shadow 0.2s;
  &:focus { border-color: rgba(124,58,237,0.6); box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
  &::placeholder { color: rgba(148,163,184,0.3); }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`

export const Input = styled.input`${inputBase}`
export const TextArea = styled.textarea`${inputBase} min-height: 120px; resize: vertical; line-height: 1.6;`
export const Select = styled.select`
  ${inputBase}
  cursor: pointer;
  option { background: #1a1a2e; }
`

// ── Hint text ─────────────────────────────────────────────────────
export const Hint = styled.p`
  font-size: 12px; color: rgba(148,163,184,0.4); margin: 6px 0 0;
`

// ── Buttons ───────────────────────────────────────────────────────
const btnBase = `
  display: inline-flex; align-items: center; gap: 8px;
  font-weight: 600; font-size: 14px; border-radius: 12px;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  font-family: 'Noto Sans Lao', sans-serif;
  &:disabled { opacity: 0.5; cursor: not-allowed; transform: none !important; }
`

export const PrimaryBtn = styled.button`
  ${btnBase}
  padding: 11px 22px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; color: #fff;
  box-shadow: 0 4px 14px rgba(124,58,237,0.3);
  &:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.45); }
  &:active:not(:disabled) { transform: translateY(0); }
`

export const PrimaryBtnLink = styled(Link)`
  ${btnBase}
  padding: 11px 22px;
  background: linear-gradient(135deg, #7c3aed, #06b6d4);
  border: none; color: #fff; text-decoration: none;
  box-shadow: 0 4px 14px rgba(124,58,237,0.3);
  &:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(124,58,237,0.45); color: #fff; }
`

export const SecondaryBtn = styled.button`
  ${btnBase}
  padding: 11px 22px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  color: rgba(148,163,184,0.8);
  &:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: #fff; border-color: rgba(255,255,255,0.15); }
`

export const DangerBtn = styled.button`
  ${btnBase}
  padding: 11px 22px;
  background: rgba(239,68,68,0.1);
  border: 1px solid rgba(239,68,68,0.25);
  color: #f87171;
  &:hover:not(:disabled) { background: rgba(239,68,68,0.2); border-color: rgba(239,68,68,0.4); }
`

export const IconBtn = styled.button<{ $danger?: boolean }>`
  ${btnBase}
  width: 36px; height: 36px; padding: 0;
  background: ${p => p.$danger ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${p => p.$danger ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'};
  color: ${p => p.$danger ? '#f87171' : 'rgba(148,163,184,0.7)'};
  justify-content: center; border-radius: 10px;
  &:hover:not(:disabled) { 
    background: ${p => p.$danger ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.1)'};
    color: ${p => p.$danger ? '#ef4444' : '#fff'};
    transform: scale(1.05);
  }
`

export const BackBtn = styled.button`
  ${btnBase}
  padding: 8px 14px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  color: rgba(148,163,184,0.7); font-size: 13px; border-radius: 10px;
  margin-bottom: 24px;
  &:hover { color: #fff; background: rgba(255,255,255,0.08); }
`

// ── Table ─────────────────────────────────────────────────────────
export const TableWrap = styled.div`
  background: rgba(20,20,38,0.7); backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 20px; overflow: hidden;
  box-shadow: 0 8px 32px rgba(0,0,0,0.2);
`

export const TableHead = styled.div`
  background: rgba(124,58,237,0.06);
  border-bottom: 1px solid rgba(255,255,255,0.05);
  padding: 14px 20px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: 1px; color: rgba(148,163,184,0.5);
`

export const TableRow = styled.div`
  padding: 14px 20px; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  transition: background 0.15s;
  &:hover { background: rgba(124,58,237,0.04); }
  &:last-child { border-bottom: none; }
`

// ── Badges ────────────────────────────────────────────────────────
export const Badge = styled.span<{ $color?: string }>`
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 11px; font-weight: 700; letter-spacing: 0.3px;
  background: ${p => (p.$color || '#7c3aed') + '22'};
  color: ${p => p.$color || '#a78bfa'};
  border: 1px solid ${p => (p.$color || '#7c3aed') + '44'};
`

// ── Alerts ────────────────────────────────────────────────────────
export const Alert = styled.div<{ $type?: 'success' | 'error' | 'info' }>`
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 12px; font-size: 13px; margin-bottom: 20px;
  background: ${p =>
    p.$type === 'success' ? 'rgba(34,197,94,0.08)' :
    p.$type === 'error'   ? 'rgba(239,68,68,0.08)'  :
    'rgba(124,58,237,0.08)'};
  border: 1px solid ${p =>
    p.$type === 'success' ? 'rgba(34,197,94,0.25)' :
    p.$type === 'error'   ? 'rgba(239,68,68,0.25)'  :
    'rgba(124,58,237,0.25)'};
  color: ${p =>
    p.$type === 'success' ? '#4ade80' :
    p.$type === 'error'   ? '#f87171'  :
    '#a78bfa'};
`

// ── Search bar ────────────────────────────────────────────────────
export const SearchWrap = styled.div`
  position: relative; flex: 1; max-width: 340px;
`
export const SearchInput = styled.input`
  ${inputBase}
  padding-left: 42px;
`
export const SearchIcon = styled.div`
  position: absolute; left: 14px; top: 50%;
  transform: translateY(-50%);
  color: rgba(148,163,184,0.4); pointer-events: none;
`

// ── Empty / Loading States ────────────────────────────────────────
export const EmptyState = styled.div`
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; padding: 60px 32px; gap: 12px;
  color: rgba(148,163,184,0.35); text-align: center;
  font-size: 14px;
`

export const LoadingState = styled.div`
  display: flex; align-items: center; justify-content: center;
  padding: 60px; gap: 12px;
  font-size: 14px; color: rgba(148,163,184,0.4);
`

// ── Divider ───────────────────────────────────────────────────────
export const Divider = styled.div`
  height: 1px; background: rgba(255,255,255,0.04); margin: 24px 0;
`

// ── Toggle Switch ────────────────────────────────────────────────
export const ToggleRow = styled.div`
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px; border-radius: 14px;
  background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);
  margin-bottom: 12px;
`

export const ToggleLabel = styled.div`
  font-size: 14px; font-weight: 600; color: #e2e8f0;
`
export const ToggleHint = styled.div`
  font-size: 12px; color: rgba(148,163,184,0.5); margin-top: 3px;
`

export const TogglePill = styled.button<{ $on: boolean }>`
  width: 48px; height: 26px; border-radius: 13px; border: none; cursor: pointer;
  background: ${p => p.$on ? 'linear-gradient(90deg,#7c3aed,#06b6d4)' : 'rgba(255,255,255,0.1)'};
  position: relative; transition: background 0.25s; flex-shrink: 0;
  box-shadow: ${p => p.$on ? '0 0 12px rgba(124,58,237,0.4)' : 'none'};
  &::after {
    content: ''; position: absolute; width: 20px; height: 20px;
    background: #fff; border-radius: 50%; top: 3px;
    left: ${p => p.$on ? '25px' : '3px'}; transition: left 0.25s;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }
`

// ── Confirm Modal ─────────────────────────────────────────────────
export const ModalOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
`
export const ModalCard = styled.div`
  background: rgba(20,20,40,0.98);
  border: 1px solid rgba(239,68,68,0.2);
  border-radius: 20px; padding: 32px 28px; max-width: 380px;
  width: 90%; text-align: center;
  box-shadow: 0 24px 60px rgba(0,0,0,0.5);
`
