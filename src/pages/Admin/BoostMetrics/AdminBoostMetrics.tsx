import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import styled, { keyframes } from 'styled-components'
import {
  Flame, ThumbsUp, Eye, Search, RefreshCw, CheckCircle2, AlertCircle,
  Sliders, ChevronLeft, ChevronRight, Save, Copy, Check, ExternalLink,
  X, BarChart3, Clock, Target, PlayCircle, PauseCircle, Trash2,
  TrendingUp, Info, ListChecks,
  Zap, Plus, LayoutGrid, LayoutList, Database, Sparkles
} from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Game, Category } from '../../../lib/supabase'
import {
  getEffectiveViews,
  getEffectiveLikes,
  updateGameMetrics,
  batchUpdateGameMetrics,
} from '../../../lib/engagementService'
import {
  AdminPage,
  TableWrap,
  SearchWrap, SearchInput, SearchIcon,
  SecondaryBtn, PrimaryBtn,
} from '../adminStyles'

/* ─── Keyframe Animations ─────────────────────────────────────────────────── */
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
`

const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(24px); }
  to { opacity: 1; transform: translateX(0); }
`

const slideUpMobile = keyframes`
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
`

/* ─── Styled Components (Admin Design System) ────────────────────────────── */

const ToastContainer = styled.div`
  position: fixed;
  top: 24px;
  right: 24px;
  z-index: 100000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-width: 380px;
  width: calc(100vw - 48px);
  pointer-events: none;
`

const ToastItem = styled.div<{ $type: string }>`
  pointer-events: auto;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: ${p =>
    p.$type === 'success' ? 'rgba(6, 78, 59, 0.95)' :
    p.$type === 'error' ? 'rgba(127, 29, 29, 0.95)' :
    p.$type === 'warning' ? 'rgba(120, 53, 15, 0.95)' :
    'rgba(30, 27, 75, 0.95)'};
  border: 1px solid ${p =>
    p.$type === 'success' ? 'rgba(52, 211, 153, 0.4)' :
    p.$type === 'error' ? 'rgba(248, 113, 113, 0.4)' :
    p.$type === 'warning' ? 'rgba(251, 191, 36, 0.4)' :
    'rgba(129, 140, 248, 0.4)'};
  backdrop-filter: blur(16px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.4);
  animation: ${slideInRight} 0.25s ease both;
  color: #fff;
`

// Header Box
const HeaderBox = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 24px;
  @media (max-width: 640px) {
    gap: 12px;
    margin-bottom: 16px;
  }
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  @media (max-width: 640px) {
    gap: 10px;
  }
`

const HeaderIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(135deg, #f97316, #e11d48);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 18px rgba(249, 115, 22, 0.4);
  flex-shrink: 0;
  @media (max-width: 640px) {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    svg { width: 18px; height: 18px; }
  }
`

const HeaderTitleText = styled.h1`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  letter-spacing: -0.5px;
  @media (max-width: 640px) {
    font-size: 19px;
    gap: 6px;
  }
`

const HeaderSubText = styled.p`
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(148, 163, 184, 0.65);
  font-weight: 400;
  @media (max-width: 640px) {
    font-size: 11px;
    line-height: 1.4;
  }
`

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  @media (max-width: 640px) {
    width: 100%;
    gap: 6px;
    button {
      flex: 1;
      padding: 8px 8px !important;
      font-size: 11px !important;
      justify-content: center;
    }
  }
`

// KPI Stats Grid (Compact 2x2 in mobile!)
const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 28px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 18px;
  }
`

const StatCard = styled.div<{ $color: string }>`
  position: relative;
  background: rgba(20, 20, 38, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.25s ease;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: ${p => p.$color};
    box-shadow: 0 0 16px ${p => p.$color};
  }
  @media (max-width: 640px) {
    padding: 12px 14px;
    border-radius: 14px;
    &::before { height: 2px; }
  }
`

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  @media (max-width: 640px) {
    margin-bottom: 6px;
  }
`

const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(148, 163, 184, 0.7);
  @media (max-width: 640px) {
    font-size: 10px;
    letter-spacing: 0.3px;
  }
`

const StatIconBox = styled.div<{ $color: string }>`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${p => p.$color}18;
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid ${p => p.$color}30;
  @media (max-width: 640px) {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    svg { width: 14px; height: 14px; }
  }
`

const StatNum = styled.div`
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 28px;
  font-weight: 900;
  color: #fff;
  line-height: 1.1;
  letter-spacing: -0.5px;
  @media (max-width: 640px) {
    font-size: 19px;
  }
`

const StatSub = styled.div`
  font-size: 12px;
  color: rgba(148, 163, 184, 0.6);
  margin-top: 5px;
  font-weight: 500;
  @media (max-width: 640px) {
    font-size: 10px;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`

// Tabs
const TabBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
  @media (max-width: 640px) {
    gap: 8px;
    margin-bottom: 14px;
  }
`

const TabNav = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  @media (max-width: 640px) {
    width: 100%;
    gap: 6px;
  }
`

const TabBtn = styled.button<{ $active: boolean; $gradient?: string }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 14px;
  font-family: 'Noto Sans Lao', sans-serif;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  background: ${p => p.$active
    ? (p.$gradient || 'linear-gradient(135deg, #7c3aed, #06b6d4)')
    : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${p => p.$active ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.08)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148, 163, 184, 0.8)'};
  box-shadow: ${p => p.$active ? '0 4px 18px rgba(124, 58, 237, 0.35)' : 'none'};
  @media (max-width: 640px) {
    flex: 1;
    padding: 8px 8px;
    font-size: 11px;
    border-radius: 10px;
    justify-content: center;
    gap: 4px;
  }
`

const TabBadge = styled.span<{ $active: boolean }>`
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 800;
  background: ${p => p.$active ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.1)'};
  color: #fff;
`

const ViewToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(10, 10, 20, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  @media (max-width: 768px) {
    display: none;
  }
`

const ViewBtn = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  background: ${p => p.$active ? 'rgba(255, 255, 255, 0.12)' : 'transparent'};
  color: ${p => p.$active ? '#fff' : 'rgba(148, 163, 184, 0.6)'};
  transition: all 0.15s;
`

// Filter Bar
const FilterBar = styled.div`
  background: rgba(20, 20, 38, 0.7);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 14px 18px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
  @media (max-width: 640px) {
    padding: 10px 12px;
    gap: 8px;
  }
`

const FilterGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  @media (max-width: 640px) {
    width: 100%;
    select {
      flex: 1;
      padding: 7px 10px;
      font-size: 11px;
    }
  }
`

const StyledSelect = styled.select`
  padding: 9px 14px;
  background: rgba(10, 10, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #e2e8f0;
  font-size: 13px;
  font-family: 'Noto Sans Lao', sans-serif;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
  &:focus {
    border-color: rgba(124, 58, 237, 0.6);
  }
  option {
    background: #121226;
    color: #e2e8f0;
  }
`

// Bulk Actions Bar
const BulkBar = styled.div`
  background: linear-gradient(135deg, rgba(30, 27, 75, 0.95), rgba(49, 46, 129, 0.95));
  border: 1px solid rgba(124, 58, 237, 0.4);
  border-radius: 16px;
  padding: 12px 18px;
  margin-bottom: 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  box-shadow: 0 8px 28px rgba(124, 58, 237, 0.25);
  animation: ${fadeIn} 0.25s ease both;
  @media (max-width: 640px) {
    padding: 10px 14px;
  }
`

const BulkInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const BulkActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
`

// Table Styling
const TableSection = styled(TableWrap)`
  margin-bottom: 24px;
`

const TableHeadRow = styled.div`
  display: grid;
  grid-template-columns: 44px 1.4fr 1.1fr 1.1fr 110px;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  background: rgba(124, 58, 237, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(148, 163, 184, 0.6);
  @media (max-width: 900px) {
    grid-template-columns: 40px 1.2fr 1fr 1fr;
  }
  @media (max-width: 680px) {
    display: none;
  }
`

const TableItemRow = styled.div<{ $selected?: boolean }>`
  display: grid;
  grid-template-columns: 44px 1.4fr 1.1fr 1.1fr 110px;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  background: ${p => p.$selected ? 'rgba(124, 58, 237, 0.08)' : 'transparent'};
  transition: background 0.15s;
  &:hover {
    background: ${p => p.$selected ? 'rgba(124, 58, 237, 0.12)' : 'rgba(255, 255, 255, 0.02)'};
  }
  &:last-child {
    border-bottom: none;
  }
  @media (max-width: 900px) {
    grid-template-columns: 40px 1.2fr 1fr 1fr;
  }
  @media (max-width: 680px) {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
    padding: 12px 14px;
  }
`

const MetricControl = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const MetricInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const MetricInput = styled.input<{ $changed?: boolean; $color?: string }>`
  width: 90px;
  padding: 6px 10px;
  background: rgba(10, 10, 20, 0.7);
  border: 1px solid ${p => p.$changed ? (p.$color || '#06b6d4') : 'rgba(255, 255, 255, 0.12)'};
  border-radius: 9px;
  color: ${p => p.$changed ? (p.$color || '#fff') : '#e2e8f0'};
  font-size: 13px;
  font-weight: 700;
  text-align: center;
  outline: none;
  font-family: monospace;
  transition: all 0.2s;
  box-shadow: ${p => p.$changed ? `0 0 10px ${(p.$color || '#06b6d4')}33` : 'none'};
  &:focus {
    border-color: ${p => p.$color || '#06b6d4'};
    box-shadow: 0 0 0 2px ${p => (p.$color || '#06b6d4') + '33'};
  }
  @media (max-width: 680px) {
    width: 80px;
    padding: 5px 8px;
    font-size: 12px;
  }
`

const QuickPill = styled.button<{ $color: string }>`
  padding: 3px 8px;
  border-radius: 7px;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
  background: ${p => p.$color}18;
  border: 1px solid ${p => p.$color}38;
  color: ${p => p.$color};
  transition: all 0.15s;
  &:hover {
    background: ${p => p.$color}30;
    transform: scale(1.05);
  }
`

// Game thumbnail
const GameThumb = styled.img`
  width: 44px;
  height: 58px;
  object-fit: cover;
  border-radius: 8px;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.1);
`

const GameThumbPlaceholder = styled.div`
  width: 44px;
  height: 58px;
  border-radius: 8px;
  background: rgba(124, 58, 237, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`

// Pagination
const PaginationWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  flex-wrap: wrap;
  gap: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  @media (max-width: 640px) {
    justify-content: center;
  }
`

const PageBtn = styled.button<{ $active?: boolean }>`
  min-width: 30px;
  height: 30px;
  padding: 0 8px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  background: ${p => p.$active ? 'linear-gradient(135deg, #7c3aed, #06b6d4)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid ${p => p.$active ? 'rgba(124, 58, 237, 0.5)' : 'rgba(255, 255, 255, 0.07)'};
  color: ${p => p.$active ? '#fff' : 'rgba(148, 163, 184, 0.7)'};
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
`

// Schedules Grid
const SchedulesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 18px;
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 12px;
  }
`

const SchedCard = styled.div`
  background: rgba(20, 20, 38, 0.75);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  transition: all 0.25s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  @media (max-width: 640px) {
    padding: 16px 14px;
    border-radius: 16px;
  }
`

const SchedHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  @media (max-width: 640px) {
    margin-bottom: 10px;
  }
`

const SchedInfoBox = styled.div`
  background: rgba(10, 10, 20, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 14px;
  padding: 12px 16px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 7px;
  @media (max-width: 640px) {
    padding: 10px 12px;
    gap: 5px;
    border-radius: 12px;
    margin-bottom: 12px;
  }
`

const SchedInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  @media (max-width: 640px) {
    font-size: 11px;
  }
`

const SchedStatsRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 8px;
  margin-bottom: 16px;
  @media (max-width: 640px) {
    gap: 6px;
    margin-bottom: 12px;
  }
`

const SchedStatTile = styled.div<{ $color?: string }>`
  background: ${p => p.$color ? p.$color + '12' : 'rgba(255, 255, 255, 0.03)'};
  border: 1px solid ${p => p.$color ? p.$color + '26' : 'rgba(255, 255, 255, 0.06)'};
  border-radius: 12px;
  padding: 10px 8px;
  text-align: center;
  @media (max-width: 640px) {
    padding: 6px 4px;
    border-radius: 10px;
    div:first-child { font-size: 9px !important; }
    div:last-child { font-size: 13px !important; margin-top: 2px !important; }
  }
`

const BoostNowBtn = styled.button<{ $running: boolean }>`
  width: 100%;
  padding: 12px 20px;
  border-radius: 14px;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: ${p => p.$running ? 'not-allowed' : 'pointer'};
  color: #fff;
  border: none;
  background: ${p => p.$running
    ? 'rgba(255, 255, 255, 0.1)'
    : 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)'};
  box-shadow: ${p => p.$running ? 'none' : '0 4px 18px rgba(124, 58, 237, 0.35)'};
  transition: all 0.2s;
  @media (max-width: 640px) {
    padding: 10px 14px;
    font-size: 12px;
    border-radius: 12px;
  }
`

// Modal Components (Full screen backdrop with Mobile Bottom Sheet!)
const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 100000;
  background: rgba(0, 0, 0, 0.82);
  backdrop-filter: blur(14px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  @media (max-width: 640px) {
    align-items: flex-end;
    padding: 0;
  }
`

const ModalBox = styled.div<{ $maxWidth?: string }>`
  background: rgba(18, 18, 34, 0.98);
  border: 1px solid rgba(124, 58, 237, 0.35);
  border-radius: 24px;
  max-width: ${p => p.$maxWidth || '640px'};
  width: 100%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.7);
  animation: ${fadeIn} 0.25s ease both;

  @media (max-width: 640px) {
    max-width: 100%;
    border-radius: 24px 24px 0 0;
    max-height: 86vh;
    animation: ${slideUpMobile} 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
    border-bottom: none;
    border-left: none;
    border-right: none;
  }
`

const DragHandle = styled.div`
  display: none;
  width: 44px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.25);
  margin: 10px auto 2px;
  flex-shrink: 0;
  @media (max-width: 640px) {
    display: block;
  }
`

const ModalHeaderWrap = styled.div`
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  @media (max-width: 640px) {
    padding: 14px 18px;
  }
`

const ModalBodyWrap = styled.div`
  padding: 22px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
  @media (max-width: 640px) {
    padding: 16px 18px;
    gap: 14px;
  }
`

const ModalFooterWrap = styled.div`
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(10, 10, 20, 0.4);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  @media (max-width: 640px) {
    padding: 12px 18px;
    gap: 8px;
    button {
      flex: 1;
      justify-content: center;
      padding: 9px 12px !important;
      font-size: 12px !important;
    }
  }
`

const StyledInput = styled.input`
  width: 100%;
  padding: 11px 16px;
  background: rgba(10, 10, 20, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 14px;
  outline: none;
  font-family: 'Noto Sans Lao', sans-serif;
  transition: all 0.2s;
  &:focus {
    border-color: rgba(124, 58, 237, 0.7);
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.15);
  }
  &::placeholder {
    color: rgba(148, 163, 184, 0.4);
  }
  @media (max-width: 640px) {
    padding: 9px 12px;
    font-size: 13px;
  }
`

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface GameWithMetrics extends Game {
  currentViews: number
  currentLikes: number
  draftViews: number
  draftLikes: number
  categoryName?: string
  activeScheduleId?: string
}

interface ToastInfo {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
}

type IntervalUnit = 'minute' | 'hour' | 'day' | 'month'
type BoostMode = 'increment' | 'target'
type BoostScope = 'selected' | 'category' | 'all'

interface BoostSchedule {
  id: string
  scope: BoostScope
  game_ids: string[]
  category_id: string | null
  mode: BoostMode
  view_min: number
  view_max: number
  like_min: number
  like_max: number
  target_views: number | null
  target_likes: number | null
  interval_unit: IntervalUnit
  interval_value: number
  is_active: boolean
  label: string | null
  last_run_at: string | null
  next_run_at: string | null
  total_runs: number
  total_views_added: number
  total_likes_added: number
  created_at: string
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const fmtNum = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

const fmtTimeLeft = (next: string | null) => {
  if (!next) return '—'
  const diff = new Date(next).getTime() - Date.now()
  if (diff <= 0) return 'Due now'
  const m = Math.floor(diff / 60_000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ${h % 24}h`
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

const intervalLabel = (unit: IntervalUnit, val: number) => {
  const u = val === 1 ? unit : `${unit}s`
  return `Every ${val} ${u}`
}

/* ─── Default Schedule Draft ─────────────────────────────────────────────── */

type ScheduleDraft = Omit<BoostSchedule, 'id' | 'last_run_at' | 'next_run_at' | 'total_runs' | 'total_views_added' | 'total_likes_added' | 'created_at'>

const DEFAULT_DRAFT: ScheduleDraft = {
  scope: 'selected',
  game_ids: [],
  category_id: null,
  mode: 'increment',
  view_min: 20,
  view_max: 150,
  like_min: 5,
  like_max: 40,
  target_views: null,
  target_likes: null,
  interval_unit: 'hour',
  interval_value: 1,
  is_active: true,
  label: null,
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */

export default function AdminBoostMetrics() {
  /* ── State ── */
  const [games, setGames] = useState<GameWithMetrics[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [schedules, setSchedules] = useState<BoostSchedule[]>([])
  const [loading, setLoading] = useState(true)

  const [savingId, setSavingId] = useState<string | null>(null)
  const [batchSaving, setBatchSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'table' | 'schedules'>('table')
  const [viewLayout, setViewLayout] = useState<'table' | 'grid'>('table')

  const [search, setSearch] = useState('')
  const [selCat, setSelCat] = useState('all')
  const [sortBy, setSortBy] = useState<'views_desc' | 'views_asc' | 'likes_desc' | 'likes_asc' | 'newest' | 'title'>('views_desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  const [showModal, setShowModal] = useState(false)
  const [draft, setDraft] = useState<ScheduleDraft>({ ...DEFAULT_DRAFT })
  const [savingSched, setSavingSched] = useState(false)
  const [editSchedId, setEditSchedId] = useState<string | null>(null)
  const [showSqlModal, setShowSqlModal] = useState(false)
  const [copiedSql, setCopiedSql] = useState(false)
  const [boostingId, setBoostingId] = useState<string | null>(null)

  const [fineGame, setFineGame] = useState<GameWithMetrics | null>(null)
  const [fineMode, setFineMode] = useState<'increment' | 'overwrite'>('increment')
  const [fineViews, setFineViews] = useState(250)
  const [fineLikes, setFineLikes] = useState(50)

  const [toasts, setToasts] = useState<ToastInfo[]>([])
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const schedulesRef = useRef<BoostSchedule[]>([])

  /* ── Toast Manager ── */
  const toast = useCallback((type: ToastInfo['type'], title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(p => [...p, { id, type, title, message: message || '' }])
    setTimeout(() => {
      setToasts(p => p.filter(t => t.id !== id))
    }, 4500)
  }, [])

  /* ── Fetch Data ── */
  const fetchSchedules = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('boost_schedules')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error && data) {
        setSchedules(data as BoostSchedule[])
        schedulesRef.current = data as BoostSchedule[]
      }
    } catch {
      /* silent */
    }
  }, [])

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [gr, cr] = await Promise.all([
        supabase
          .from('games')
          .select('*, category:categories(id, name)')
          .order('created_at', { ascending: false }),
        supabase.from('categories').select('*').order('name', { ascending: true }),
      ])
      if (cr.data) setCategories(cr.data as Category[])
      if (gr.data) {
        const mapped = (gr.data as any[]).map(g => {
          const v = getEffectiveViews(g)
          const l = getEffectiveLikes(g)
          return {
            ...g,
            currentViews: v,
            currentLikes: l,
            draftViews: v,
            draftLikes: l,
            categoryName: g.category?.name || 'Uncategorized',
          }
        })
        setGames(mapped)
      }
    } catch (e: any) {
      toast('error', 'Load Error', e?.message)
    } finally {
      setLoading(false)
    }
    await fetchSchedules()
  }, [toast, fetchSchedules])

  /* ── Client-Side Schedule Execution Engine ── */
  const randInt = (min: number, max: number) =>
    Math.floor(Math.random() * (Math.max(min, max) - Math.min(min, max) + 1)) + Math.min(min, max)

  const executeSchedule = useCallback(async (sched: BoostSchedule) => {
    console.log(`[AutoBoost] Executing schedule ${sched.id} (${sched.label || sched.scope})`)

    let targetIds: string[] = []
    if (sched.scope === 'all') {
      const { data: allG } = await (supabase as any).from('games').select('id')
      if (allG) targetIds = allG.map((r: any) => r.id)
    } else if (sched.scope === 'category' && sched.category_id) {
      const { data: catG } = await (supabase as any)
        .from('games')
        .select('id, category_id, category_ids')
      if (catG) {
        targetIds = catG
          .filter((g: any) => g.category_id === sched.category_id || (g.category_ids && g.category_ids.includes(sched.category_id)))
          .map((g: any) => g.id)
      }
    } else {
      targetIds = sched.game_ids || []
    }

    if (targetIds.length === 0) {
      console.warn('[AutoBoost] No target games found for schedule', sched.id)
      return { viewsAdded: 0, likesAdded: 0, gamesUpdated: 0 }
    }

    const { data: currentRows, error: fetchErr } = await (supabase as any)
      .from('games')
      .select('id, view_count, views_count, likes_count')
      .in('id', targetIds)

    if (fetchErr || !currentRows || currentRows.length === 0) {
      console.error('[AutoBoost] Could not fetch target games rows:', fetchErr?.message)
      return { viewsAdded: 0, likesAdded: 0, gamesUpdated: 0 }
    }

    let totalViewsAdded = 0
    let totalLikesAdded = 0
    let gamesUpdated = 0

    for (const g of currentRows as any[]) {
      const curViews = Math.max(0, g.views_count ?? g.view_count ?? 0)
      const curLikes = Math.max(0, g.likes_count ?? 0)

      let incViews = 0
      let incLikes = 0

      if (sched.mode === 'target') {
        const targetV = sched.target_views ?? 0
        const targetL = sched.target_likes ?? 0
        if (targetV > curViews) {
          const rand = randInt(sched.view_min, sched.view_max)
          incViews = Math.min(rand, targetV - curViews)
        }
        if (targetL > curLikes) {
          const rand = randInt(sched.like_min, sched.like_max)
          incLikes = Math.min(rand, targetL - curLikes)
        }
      } else {
        incViews = randInt(sched.view_min, sched.view_max)
        incLikes = randInt(sched.like_min, sched.like_max)
      }

      if (incViews === 0 && incLikes === 0) continue

      const newViews = curViews + incViews
      const newLikes = curLikes + incLikes

      const { error: upErr } = await (supabase as any)
        .from('games')
        .update({
          view_count: newViews,
          views_count: newViews,
          likes_count: newLikes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', g.id)

      if (!upErr) {
        totalViewsAdded += incViews
        totalLikesAdded += incLikes
        gamesUpdated += 1
      }
    }

    const msMap: Record<string, number> = {
      minute: 60_000,
      hour: 3_600_000,
      day: 86_400_000,
      month: 30 * 86_400_000,
    }
    const nextRunMs = Date.now() + (msMap[sched.interval_unit] || 3_600_000) * sched.interval_value
    const nextRunAt = new Date(nextRunMs).toISOString()

    await (supabase as any)
      .from('boost_schedules')
      .update({
        last_run_at: new Date().toISOString(),
        next_run_at: nextRunAt,
        total_runs: sched.total_runs + 1,
        total_views_added: sched.total_views_added + totalViewsAdded,
        total_likes_added: sched.total_likes_added + totalLikesAdded,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sched.id)

    await (supabase as any)
      .from('boost_run_logs')
      .insert([{ schedule_id: sched.id, games_updated: gamesUpdated, views_added: totalViewsAdded, likes_added: totalLikesAdded }])
      .then(() => {}).catch(() => {})

    return { viewsAdded: totalViewsAdded, likesAdded: totalLikesAdded, gamesUpdated }
  }, [])

  const runDueSchedules = useCallback(async () => {
    const now = Date.now()
    const due = schedulesRef.current.filter(
      s => s.is_active && (!s.next_run_at || new Date(s.next_run_at).getTime() <= now)
    )
    if (due.length === 0) return
    console.log(`[AutoBoost] ${due.length} schedule(s) due to run`)
    for (const s of due) {
      await executeSchedule(s)
    }
    await fetchSchedules()
    const { data: freshGames } = await (supabase as any).from('games').select('id, view_count, views_count, likes_count')
    if (freshGames) {
      setGames(p => p.map(g => {
        const fr = (freshGames as any[]).find(r => r.id === g.id)
        if (!fr) return g
        const v = Math.max(0, fr.views_count ?? fr.view_count ?? 0)
        const l = Math.max(0, fr.likes_count ?? 0)
        return { ...g, currentViews: v, draftViews: v, currentLikes: l, draftLikes: l }
      }))
    }
  }, [executeSchedule, fetchSchedules])

  useEffect(() => {
    fetchAll()
    tickerRef.current = setInterval(() => {
      runDueSchedules().catch(err => console.error('[AutoBoost] Tick error:', err))
    }, 30_000)
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
    }
  }, [fetchAll, runDueSchedules])

  /* ── Filtered & Sorted Games ── */
  const filtered = useMemo(() => {
    let result = [...games]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(g => g.title.toLowerCase().includes(q))
    }
    if (selCat !== 'all') {
      result = result.filter(g => g.category_id === selCat || (g.category_ids && g.category_ids.includes(selCat)))
    }
    result.sort((a, b) => {
      if (sortBy === 'views_desc') return b.currentViews - a.currentViews
      if (sortBy === 'views_asc') return a.currentViews - b.currentViews
      if (sortBy === 'likes_desc') return b.currentLikes - a.currentLikes
      if (sortBy === 'likes_asc') return a.currentLikes - b.currentLikes
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    return result
  }, [games, search, selCat, sortBy])

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, pageSize])

  const stats = useMemo(() => {
    const totalViews = games.reduce((s, g) => s + g.currentViews, 0)
    const totalLikes = games.reduce((s, g) => s + g.currentLikes, 0)
    const activeScheds = schedules.filter(s => s.is_active).length
    return { games: games.length, views: totalViews, likes: totalLikes, schedules: activeScheds }
  }, [games, schedules])

  /* ── Selection ── */
  const toggleSelect = (id: string) => {
    setSelectedIds(p => {
      const next = new Set(p)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePage = () => {
    const curPageIds = paginated.map(g => g.id)
    const allSelected = curPageIds.every(id => selectedIds.has(id))
    setSelectedIds(p => {
      const next = new Set(p)
      if (allSelected) curPageIds.forEach(id => next.delete(id))
      else curPageIds.forEach(id => next.add(id))
      return next
    })
  }

  const selectAllFilter = () => {
    setSelectedIds(new Set(filtered.map(g => g.id)))
  }

  const clearSel = () => {
    setSelectedIds(new Set())
  }

  /* ── Inline Metric Updates ── */
  const updateDraft = (id: string, field: 'draftViews' | 'draftLikes', val: number) => {
    setGames(p => p.map(g => (g.id === id ? { ...g, [field]: Math.max(0, val) } : g)))
  }

  const quickInc = (id: string, viewsAdd: number, likesAdd: number) => {
    setGames(p =>
      p.map(g => {
        if (g.id !== id) return g
        return {
          ...g,
          draftViews: Math.max(0, g.draftViews + viewsAdd),
          draftLikes: Math.max(0, g.draftLikes + likesAdd),
        }
      })
    )
  }

  const saveGameMetrics = async (game: GameWithMetrics) => {
    setSavingId(game.id)
    try {
      const res = await updateGameMetrics(game.id, { views: game.draftViews, likes: game.draftLikes })
      if (res.success) {
        setGames(p =>
          p.map(g => (g.id === game.id ? { ...g, currentViews: g.draftViews, currentLikes: g.draftLikes } : g))
        )
        toast('success', 'Updated Successfully', `Updated metrics for "${game.title}"`)
      } else {
        toast('error', 'Update Failed', res.error || 'Database update failed')
      }
    } catch (e: any) {
      toast('error', 'Error', e?.message)
    } finally {
      setSavingId(null)
    }
  }

  const batchBoost = async (viewsAdd: number, likesAdd: number) => {
    if (selectedIds.size === 0) return
    setBatchSaving(true)
    try {
      const updates = Array.from(selectedIds).map(id => {
        const g = games.find(item => item.id === id)!
        return {
          id,
          views: g.currentViews + viewsAdd,
          likes: g.currentLikes + likesAdd,
        }
      })
      const ok = await batchUpdateGameMetrics(updates)
      if (ok) {
        setGames(p =>
          p.map(g => {
            if (!selectedIds.has(g.id)) return g
            const nv = g.currentViews + viewsAdd
            const nl = g.currentLikes + likesAdd
            return { ...g, currentViews: nv, draftViews: nv, currentLikes: nl, draftLikes: nl }
          })
        )
        toast('success', 'Batch Boost Complete', `Added +${viewsAdd} views & +${likesAdd} likes to ${selectedIds.size} games`)
        setSelectedIds(new Set())
      }
    } catch (e: any) {
      toast('error', 'Batch Error', e?.message)
    } finally {
      setBatchSaving(false)
    }
  }

  const applyFine = async () => {
    if (!fineGame) return
    const targetV = fineMode === 'increment' ? fineGame.currentViews + fineViews : fineViews
    const targetL = fineMode === 'increment' ? fineGame.currentLikes + fineLikes : fineLikes
    const res = await updateGameMetrics(fineGame.id, { views: targetV, likes: targetL })
    if (res.success) {
      setGames(p =>
        p.map(g =>
          g.id === fineGame.id
            ? { ...g, currentViews: targetV, draftViews: targetV, currentLikes: targetL, draftLikes: targetL }
            : g
        )
      )
      toast('success', 'Updated Metrics', `Applied changes to "${fineGame.title}"`)
      setFineGame(null)
    } else {
      toast('error', 'Update Failed', res.error || 'Database error')
    }
  }

  /* ── Schedule Management ── */
  const saveSchedule = async () => {
    setSavingSched(true)
    try {
      let targetIds = draft.game_ids
      if (draft.scope === 'all') {
        targetIds = games.map(g => g.id)
      } else if (draft.scope === 'category' && draft.category_id) {
        targetIds = games
          .filter(g => g.category_id === draft.category_id || (g.category_ids && g.category_ids.includes(draft.category_id!)))
          .map(g => g.id)
      } else if (draft.scope === 'selected') {
        targetIds = Array.from(selectedIds)
      }

      if (targetIds.length === 0) {
        toast('warning', 'No Target Games', 'Target scope contains 0 games. Please select games or choose a category.')
        setSavingSched(false)
        return
      }

      const payload = {
        scope: draft.scope,
        game_ids: targetIds,
        category_id: draft.category_id,
        mode: draft.mode,
        view_min: draft.view_min,
        view_max: draft.view_max,
        like_min: draft.like_min,
        like_max: draft.like_max,
        target_views: draft.target_views,
        target_likes: draft.target_likes,
        interval_unit: draft.interval_unit,
        interval_value: draft.interval_value,
        is_active: draft.is_active,
        label: draft.label,
        next_run_at: new Date().toISOString(),
      }

      if (editSchedId) {
        const { error } = await (supabase as any).from('boost_schedules').update(payload).eq('id', editSchedId)
        if (error) throw error
        toast('success', 'Schedule Updated', 'Your changes have been saved.')
      } else {
        const { error } = await (supabase as any).from('boost_schedules').insert([payload])
        if (error) throw error
        toast('success', 'Schedule Created', 'Auto-boost background schedule is now running.')
      }

      setShowModal(false)
      setEditSchedId(null)
      await fetchSchedules()
    } catch (e: any) {
      toast('error', 'Save Failed', e?.message || 'Database error')
    } finally {
      setSavingSched(false)
    }
  }

  const toggleScheduleActive = async (s: BoostSchedule) => {
    const nextState = !s.is_active
    const { error } = await (supabase as any).from('boost_schedules').update({ is_active: nextState }).eq('id', s.id)
    if (!error) {
      setSchedules(p => p.map(item => (item.id === s.id ? { ...item, is_active: nextState } : item)))
      toast('info', nextState ? 'Schedule Resumed' : 'Schedule Paused', `Schedule is now ${nextState ? 'active' : 'paused'}`)
    }
  }

  const deleteSchedule = async (id: string) => {
    if (!window.confirm('Delete this boost schedule permanently?')) return
    const { error } = await (supabase as any).from('boost_schedules').delete().eq('id', id)
    if (!error) {
      setSchedules(p => p.filter(s => s.id !== id))
      toast('success', 'Deleted', 'Schedule removed successfully')
    }
  }

  const runScheduleNow = async (sched: BoostSchedule) => {
    if (boostingId) return
    setBoostingId(sched.id)
    toast('info', 'Boost Starting…', `Executing schedule "${sched.label || 'Unnamed'}" now.`)
    try {
      const fresh: BoostSchedule = { ...sched, next_run_at: new Date().toISOString() }
      const result = await executeSchedule(fresh)
      if (result.gamesUpdated > 0) {
        toast('success', 'Boost Complete ⚡', `${result.gamesUpdated} games updated — +${fmtNum(result.viewsAdded)} views, +${fmtNum(result.likesAdded)} likes`)
      } else {
        toast('info', 'Nothing to Update', 'All games are already at or above their target values.')
      }
      await fetchSchedules()
      const { data: freshGames } = await (supabase as any).from('games').select('id, view_count, views_count, likes_count')
      if (freshGames) {
        setGames(p => p.map(g => {
          const fr = (freshGames as any[]).find((r: any) => r.id === g.id)
          if (!fr) return g
          const v = Math.max(0, fr.views_count ?? fr.view_count ?? 0)
          const l = Math.max(0, fr.likes_count ?? 0)
          return { ...g, currentViews: v, draftViews: v, currentLikes: l, draftLikes: l }
        }))
      }
    } catch (err: any) {
      console.error('[BoostNow] Error:', err)
      toast('error', 'Boost Failed', err?.message || 'Unknown error occurred')
    } finally {
      setBoostingId(null)
    }
  }

  const openEdit = (s: BoostSchedule) => {
    setEditSchedId(s.id)
    setDraft({
      scope: s.scope,
      game_ids: s.game_ids,
      category_id: s.category_id,
      mode: s.mode,
      view_min: s.view_min,
      view_max: s.view_max,
      like_min: s.like_min,
      like_max: s.like_max,
      target_views: s.target_views,
      target_likes: s.target_likes,
      interval_unit: s.interval_unit,
      interval_value: s.interval_value,
      is_active: s.is_active,
      label: s.label,
    })
    setShowModal(true)
  }

  const copySqlFiles = () => {
    navigator.clipboard.writeText('-- 1. Run boost_schedules_schema.sql\n-- 2. Run setup_pg_cron.sql\n-- Both files are inside src/lib/ folder')
    setCopiedSql(true)
    toast('info', 'SQL Copied', 'SQL instructions copied to clipboard')
    setTimeout(() => setCopiedSql(false), 2500)
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════════════ */
  return (
    <>
      <AdminPage $maxWidth="1380px">
        {/* Toast Notifications */}
        <ToastContainer>
          {toasts.map(t => (
            <ToastItem key={t.id} $type={t.type}>
              <div style={{ marginTop: 2, flexShrink: 0 }}>
                {t.type === 'success' && <CheckCircle2 size={16} color="#34d399" />}
                {t.type === 'error' && <AlertCircle size={16} color="#f87171" />}
                {t.type === 'warning' && <AlertCircle size={16} color="#fbbf24" />}
                {t.type === 'info' && <Info size={16} color="#818cf8" />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{t.title}</div>
                {t.message && <div style={{ fontSize: 11, opacity: 0.85, marginTop: 2 }}>{t.message}</div>}
              </div>
            </ToastItem>
          ))}
        </ToastContainer>

        {/* ── Top Header ── */}
        <HeaderBox>
          <HeaderLeft>
            <HeaderIcon>
              <Flame size={24} color="#fff" />
            </HeaderIcon>
            <div>
              <HeaderTitleText>
                Boost Metrics
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: 'rgba(244, 63, 94, 0.15)', color: '#fb7185',
                  border: '1px solid rgba(244, 63, 94, 0.3)', fontWeight: 700
                }}>
                  Engagement Hub
                </span>
              </HeaderTitleText>
              <HeaderSubText>
                ระบบปรับแต่งยอดวิว ยอดไลก์ และตั้งเวลา Auto-Boost พื้นหลังอัตโนมัติ
              </HeaderSubText>
            </div>
          </HeaderLeft>

          <HeaderActions>
            <SecondaryBtn onClick={() => setShowSqlModal(true)} style={{ padding: '8px 14px', fontSize: 12 }}>
              <Database size={14} color="#c084fc" /> DB Setup
            </SecondaryBtn>

            <SecondaryBtn onClick={fetchAll} disabled={loading} style={{ padding: '8px 12px', fontSize: 12 }}>
              <RefreshCw size={14} style={{ animation: loading ? 'spin 0.8s linear infinite' : 'none' }} />
            </SecondaryBtn>

            <PrimaryBtn
              onClick={() => {
                setShowModal(true)
                setEditSchedId(null)
                setDraft({ ...DEFAULT_DRAFT, scope: selectedIds.size > 0 ? 'selected' : 'all' })
              }}
              style={{
                padding: '8px 18px', fontSize: 12,
                background: 'linear-gradient(135deg, #f97316, #e11d48)',
                boxShadow: '0 4px 18px rgba(225, 29, 72, 0.4)'
              }}
            >
              <Plus size={15} /> New Schedule
            </PrimaryBtn>
          </HeaderActions>
        </HeaderBox>

        {/* ── KPI Stats Cards (Compact 2x2 grid in Mobile) ── */}
        <StatsGrid>
          <StatCard $color="#7c3aed">
            <StatHeader>
              <StatLabel>Total Games</StatLabel>
              <StatIconBox $color="#7c3aed"><BarChart3 size={16} /></StatIconBox>
            </StatHeader>
            <StatNum>{stats.games.toLocaleString()}</StatNum>
            <StatSub>แคตตาล็อกเกมทั้งหมด</StatSub>
          </StatCard>

          <StatCard $color="#06b6d4">
            <StatHeader>
              <StatLabel>Total Views</StatLabel>
              <StatIconBox $color="#06b6d4"><Eye size={16} /></StatIconBox>
            </StatHeader>
            <StatNum>{fmtNum(stats.views)}</StatNum>
            <StatSub>เฉลี่ย {fmtNum(stats.games ? Math.round(stats.views / stats.games) : 0)} / เกม</StatSub>
          </StatCard>

          <StatCard $color="#f43f5e">
            <StatHeader>
              <StatLabel>Total Likes</StatLabel>
              <StatIconBox $color="#f43f5e"><ThumbsUp size={16} /></StatIconBox>
            </StatHeader>
            <StatNum>{fmtNum(stats.likes)}</StatNum>
            <StatSub>เฉลี่ย {fmtNum(stats.games ? Math.round(stats.likes / stats.games) : 0)} / เกม</StatSub>
          </StatCard>

          <StatCard $color="#f59e0b">
            <StatHeader>
              <StatLabel>Auto Schedules</StatLabel>
              <StatIconBox $color="#f59e0b"><Zap size={16} /></StatIconBox>
            </StatHeader>
            <StatNum>{stats.schedules}</StatNum>
            <StatSub>{schedules.length} งานตั้งเวลาที่สร้าง</StatSub>
          </StatCard>
        </StatsGrid>

        {/* ── Tab Switcher & Layout Toggle ── */}
        <TabBar>
          <TabNav>
            <TabBtn
              $active={activeTab === 'table'}
              onClick={() => setActiveTab('table')}
            >
              <ListChecks size={15} />
              <span>ตารางเกม</span>
              <TabBadge $active={activeTab === 'table'}>{filtered.length}</TabBadge>
            </TabBtn>

            <TabBtn
              $active={activeTab === 'schedules'}
              $gradient="linear-gradient(135deg, #f97316, #e11d48)"
              onClick={() => setActiveTab('schedules')}
            >
              <Clock size={15} />
              <span>Auto-Boost</span>
              {stats.schedules > 0 && (
                <TabBadge $active={activeTab === 'schedules'}>{stats.schedules}</TabBadge>
              )}
            </TabBtn>
          </TabNav>

          {activeTab === 'table' && (
            <ViewToggle>
              <ViewBtn $active={viewLayout === 'table'} onClick={() => setViewLayout('table')}>
                <LayoutList size={13} /> Table
              </ViewBtn>
              <ViewBtn $active={viewLayout === 'grid'} onClick={() => setViewLayout('grid')}>
                <LayoutGrid size={13} /> Cards
              </ViewBtn>
            </ViewToggle>
          )}
        </TabBar>

        {/* ── TAB 1: GAMES TABLE ── */}
        {activeTab === 'table' && (
          <div>
            {/* Toolbar Search & Filters */}
            <FilterBar>
              <SearchWrap style={{ flex: '1 1 220px', maxWidth: 360 }}>
                <SearchIcon><Search size={14} /></SearchIcon>
                <SearchInput
                  placeholder="ค้นหาชื่อเกม..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1) }}
                  style={{ fontSize: 13, padding: '9px 12px 9px 38px' }}
                />
              </SearchWrap>

              <FilterGroup>
                <StyledSelect value={selCat} onChange={e => { setSelCat(e.target.value); setPage(1) }}>
                  <option value="all">หมวดหมู่ทั้งหมด ({categories.length})</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </StyledSelect>

                <StyledSelect value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
                  <option value="views_desc">👁 วิว: มาก → น้อย</option>
                  <option value="views_asc">📉 วิว: น้อย → มาก</option>
                  <option value="likes_desc">❤️ ไลก์: มาก → น้อย</option>
                  <option value="likes_asc">🤍 ไลก์: น้อย → มาก</option>
                  <option value="newest">⏱ ล่าสุด</option>
                  <option value="title">🔤 ชื่อ A → Z</option>
                </StyledSelect>

                <StyledSelect value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}>
                  {[10, 15, 25, 50].map(n => <option key={n} value={n}>{n} / หน้า</option>)}
                </StyledSelect>
              </FilterGroup>
            </FilterBar>

            {/* Bulk Action Floating Bar */}
            {selectedIds.size > 0 && (
              <BulkBar>
                <BulkInfo>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 13, color: '#fff' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22d3ee', display: 'inline-block' }} />
                    เลือกอยู่ {selectedIds.size} เกม
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <button onClick={selectAllFilter} style={{ background: 'none', border: 'none', color: '#c7d2fe', cursor: 'pointer', textDecoration: 'underline' }}>
                      เลือกทั้งหมด {filtered.length} เกม
                    </button>
                    <span style={{ opacity: 0.3 }}>|</span>
                    <button onClick={clearSel} style={{ background: 'none', border: 'none', color: 'rgba(148, 163, 184, 0.7)', cursor: 'pointer' }}>
                      ยกเลิก
                    </button>
                  </div>
                </BulkInfo>

                <BulkActions>
                  <span style={{ fontSize: 11, color: 'rgba(199, 210, 254, 0.8)', fontWeight: 600 }}>Quick:</span>
                  {[
                    { v: 100, l: 20, label: '+100 👁' },
                    { v: 500, l: 75, label: '+500 👁' },
                    { v: 1000, l: 150, label: '+1k 👁' },
                  ].map(b => (
                    <QuickPill
                      key={b.v}
                      $color="#06b6d4"
                      disabled={batchSaving}
                      onClick={() => batchBoost(b.v, b.l)}
                      style={{ padding: '4px 10px', fontSize: 11 }}
                    >
                      {b.label}
                    </QuickPill>
                  ))}

                  <PrimaryBtn
                    onClick={() => {
                      setShowModal(true)
                      setDraft({ ...DEFAULT_DRAFT, scope: 'selected' })
                    }}
                    style={{
                      padding: '6px 14px', fontSize: 11,
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                    }}
                  >
                    <Clock size={12} /> ตั้งเวลา Auto-Boost
                  </PrimaryBtn>
                </BulkActions>
              </BulkBar>
            )}

            {/* Table Container */}
            <TableSection>
              <TableHeadRow>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <input
                    type="checkbox"
                    checked={paginated.length > 0 && paginated.every(g => selectedIds.has(g.id))}
                    onChange={togglePage}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }}
                  />
                </div>
                <div>ข้อมูลเกม (Game)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22d3ee' }}>
                  <Eye size={14} /> Views (ยอดวิว)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#fb7185' }}>
                  <ThumbsUp size={14} /> Likes (ยอดไลก์)
                </div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </TableHeadRow>

              {loading ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(148, 163, 184, 0.6)' }}>
                  <RefreshCw size={26} style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 10px', color: '#7c3aed' }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>กำลังโหลดรายการเกม...</div>
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: 'rgba(148, 163, 184, 0.5)' }}>
                  <Search size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>ไม่พบเกมที่ตรงกับเงื่อนไข</div>
                </div>
              ) : (
                paginated.map(g => {
                  const modified = g.draftViews !== g.currentViews || g.draftLikes !== g.currentLikes
                  const saving = savingId === g.id
                  const isSelected = selectedIds.has(g.id)

                  return (
                    <TableItemRow key={g.id} $selected={isSelected}>
                      {/* Checkbox */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(g.id)}
                          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#7c3aed' }}
                        />
                      </div>

                      {/* Game Details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                        {g.cover_image ? (
                          <GameThumb src={g.cover_image.split('#')[0]} alt={g.title} />
                        ) : (
                          <GameThumbPlaceholder>🎮</GameThumbPlaceholder>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {g.title}
                            </span>
                            <a href={`/game/${g.slug}`} target="_blank" rel="noreferrer" style={{ color: 'rgba(148, 163, 184, 0.4)', display: 'inline-flex' }}>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 5, background: 'rgba(124, 58, 237, 0.15)', color: '#c084fc', border: '1px solid rgba(124, 58, 237, 0.3)' }}>
                              {g.categoryName}
                            </span>
                            {g.is_featured && (
                              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 5, background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                FEATURED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Views Column */}
                      <MetricControl>
                        <MetricInputRow>
                          <span style={{ width: 44, textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8' }}>
                            {fmtNum(g.currentViews)}
                          </span>
                          <MetricInput
                            type="number"
                            min="0"
                            value={g.draftViews}
                            $changed={g.draftViews !== g.currentViews}
                            $color="#22d3ee"
                            onChange={e => updateDraft(g.id, 'draftViews', parseInt(e.target.value) || 0)}
                          />
                        </MetricInputRow>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 52 }}>
                          {[50, 100, 500].map(v => (
                            <QuickPill key={v} $color="#06b6d4" onClick={() => quickInc(g.id, v, 0)}>
                              +{v}
                            </QuickPill>
                          ))}
                        </div>
                      </MetricControl>

                      {/* Likes Column */}
                      <MetricControl>
                        <MetricInputRow>
                          <span style={{ width: 44, textAlign: 'right', fontSize: 12, fontFamily: 'monospace', fontWeight: 700, color: '#94a3b8' }}>
                            {fmtNum(g.currentLikes)}
                          </span>
                          <MetricInput
                            type="number"
                            min="0"
                            value={g.draftLikes}
                            $changed={g.draftLikes !== g.currentLikes}
                            $color="#fb7185"
                            onChange={e => updateDraft(g.id, 'draftLikes', parseInt(e.target.value) || 0)}
                          />
                        </MetricInputRow>
                        <div style={{ display: 'flex', gap: 4, marginLeft: 52 }}>
                          {[10, 25, 100].map(l => (
                            <QuickPill key={l} $color="#f43f5e" onClick={() => quickInc(g.id, 0, l)}>
                              +{l}
                            </QuickPill>
                          ))}
                        </div>
                      </MetricControl>

                      {/* Actions Column */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        <SecondaryBtn
                          onClick={() => {
                            setFineGame(g)
                            setFineViews(250)
                            setFineLikes(50)
                          }}
                          style={{ padding: '7px 9px', borderRadius: 8 }}
                          title="Fine-tune Adjuster"
                        >
                          <Sliders size={13} />
                        </SecondaryBtn>

                        <PrimaryBtn
                          onClick={() => saveGameMetrics(g)}
                          disabled={!modified || saving}
                          style={{
                            padding: '7px 12px', borderRadius: 8, fontSize: 11,
                            background: modified
                              ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                              : 'rgba(255, 255, 255, 0.05)',
                            color: modified ? '#fff' : 'rgba(148, 163, 184, 0.4)',
                            boxShadow: modified ? '0 4px 14px rgba(16, 185, 129, 0.4)' : 'none',
                          }}
                        >
                          {saving ? <RefreshCw size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={13} />}
                          <span>บันทึก</span>
                        </PrimaryBtn>
                      </div>
                    </TableItemRow>
                  )
                })
              )}

              {/* Pagination Row */}
              <PaginationWrap>
                <div style={{ fontSize: 12, color: 'rgba(148, 163, 184, 0.6)' }}>
                  แสดง {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filtered.length)} จากทั้งหมด {filtered.length} เกม
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <PageBtn disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft size={15} />
                  </PageBtn>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
                    if (pNum > totalPages) return null
                    return (
                      <PageBtn key={pNum} $active={page === pNum} onClick={() => setPage(pNum)}>
                        {pNum}
                      </PageBtn>
                    )
                  })}
                  <PageBtn disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                    <ChevronRight size={15} />
                  </PageBtn>
                </div>
              </PaginationWrap>
            </TableSection>
          </div>
        )}

        {/* ── TAB 2: AUTO-BOOST SCHEDULES ── */}
        {activeTab === 'schedules' && (
          <div>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: 16, flexWrap: 'wrap', gap: 10
            }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>
                  รายการตั้งเวลาเพิ่มยอดอัตโนมัติ (Active Auto-Boost Workers)
                </h2>
                <p style={{ fontSize: 12, color: 'rgba(148, 163, 184, 0.6)', marginTop: 2 }}>
                  ระบบจะทำงานเป็นระยะตามเวลาที่กำหนด แม้ว่าจะปิดหน้าเบราว์เซอร์ไปแล้ว
                </p>
              </div>

              <PrimaryBtn
                onClick={() => {
                  setShowModal(true)
                  setEditSchedId(null)
                  setDraft({ ...DEFAULT_DRAFT })
                }}
                style={{
                  padding: '9px 18px', fontSize: 12,
                  background: 'linear-gradient(135deg, #f97316, #e11d48)',
                  boxShadow: '0 4px 18px rgba(225, 29, 72, 0.4)'
                }}
              >
                <Plus size={15} /> สร้าง Schedule ใหม่
              </PrimaryBtn>
            </div>

            {schedules.length === 0 ? (
              <div style={{
                background: 'rgba(20, 20, 38, 0.7)',
                borderRadius: 20, padding: '50px 20px',
                textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.06)'
              }}>
                <Clock size={36} style={{ color: '#f97316', margin: '0 auto 12px', opacity: 0.5 }} />
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>ยังไม่มีรายการตั้งเวลา (No Active Schedules)</div>
                <p style={{ fontSize: 12, color: 'rgba(148, 163, 184, 0.6)', maxWidth: 400, margin: '6px auto 16px' }}>
                  สร้างตัวตั้งเวลาแรกของคุณ เพื่อให้ระบบช่วยเพิ่มยอดวิวและไลก์ให้อัตโนมัติทุกๆ 1 นาที หรือ 1 ชั่วโมง
                </p>
                <PrimaryBtn
                  onClick={() => {
                    setShowModal(true)
                    setEditSchedId(null)
                    setDraft({ ...DEFAULT_DRAFT })
                  }}
                  style={{ background: 'linear-gradient(135deg, #f97316, #e11d48)' }}
                >
                  <Plus size={15} /> สร้าง Auto-Boost Schedule
                </PrimaryBtn>
              </div>
            ) : (
              <SchedulesGrid>
                {schedules.map(s => {
                  const scopeCount =
                    s.scope === 'all' ? games.length
                      : s.scope === 'category'
                        ? games.filter(g => g.category_id === s.category_id || (g.category_ids && g.category_ids.includes(s.category_id!))).length
                        : (s.game_ids || []).length

                  return (
                    <SchedCard key={s.id}>
                      {/* Header */}
                      <SchedHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
                            background: s.is_active ? 'rgba(16, 185, 129, 0.15)' : 'rgba(148, 163, 184, 0.15)',
                            color: s.is_active ? '#34d399' : '#94a3b8',
                            border: `1px solid ${s.is_active ? 'rgba(16, 185, 129, 0.35)' : 'rgba(148, 163, 184, 0.25)'}`,
                            display: 'inline-flex', alignItems: 'center', gap: 5
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.is_active ? '#34d399' : '#94a3b8' }} />
                            {s.is_active ? 'ACTIVE' : 'PAUSED'}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                            {s.label || 'Auto-Boost Worker'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <button
                            onClick={() => toggleScheduleActive(s)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)',
                              padding: 5, borderRadius: 7, cursor: 'pointer', color: s.is_active ? '#fbbf24' : '#34d399'
                            }}
                            title={s.is_active ? 'พักการทำงาน' : 'เปิดทำงาน'}
                          >
                            {s.is_active ? <PauseCircle size={14} /> : <PlayCircle size={14} />}
                          </button>
                          <button
                            onClick={() => openEdit(s)}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.08)',
                              padding: 5, borderRadius: 7, cursor: 'pointer', color: '#c084fc'
                            }}
                            title="แก้ไขการตั้งค่า"
                          >
                            <Sliders size={14} />
                          </button>
                          <button
                            onClick={() => deleteSchedule(s.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)',
                              padding: 5, borderRadius: 7, cursor: 'pointer', color: '#f87171'
                            }}
                            title="ลบงานนี้"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </SchedHeader>

                      {/* Schedule Parameters Box */}
                      <SchedInfoBox>
                        <SchedInfoRow>
                          <span style={{ color: 'rgba(148, 163, 184, 0.7)' }}>ความถี่ (Frequency):</span>
                          <strong style={{ color: '#fbbf24' }}>{intervalLabel(s.interval_unit, s.interval_value)}</strong>
                        </SchedInfoRow>
                        <SchedInfoRow>
                          <span style={{ color: 'rgba(148, 163, 184, 0.7)' }}>เป้าหมาย (Scope):</span>
                          <span style={{ color: '#fff', fontWeight: 600 }}>{s.scope.toUpperCase()} ({scopeCount} เกม)</span>
                        </SchedInfoRow>
                        <SchedInfoRow>
                          <span style={{ color: 'rgba(148, 163, 184, 0.7)' }}>ยอดเพิ่ม / รอบ:</span>
                          <span style={{ fontWeight: 700 }}>
                            <span style={{ color: '#22d3ee' }}>+{s.view_min}~{s.view_max} วิว</span>
                            <span style={{ margin: '0 4px', opacity: 0.4 }}>·</span>
                            <span style={{ color: '#fb7185' }}>+{s.like_min}~{s.like_max} ไลก์</span>
                          </span>
                        </SchedInfoRow>
                        <SchedInfoRow>
                          <span style={{ color: 'rgba(148, 163, 184, 0.7)' }}>รอบถัดไป (Next Run):</span>
                          <span style={{ color: '#34d399', fontWeight: 700 }}>{fmtTimeLeft(s.next_run_at)}</span>
                        </SchedInfoRow>
                      </SchedInfoBox>

                      {/* Lifetime Statistics */}
                      <SchedStatsRow>
                        <SchedStatTile>
                          <div style={{ fontSize: 9, color: 'rgba(148, 163, 184, 0.6)', fontWeight: 700, textTransform: 'uppercase' }}>
                            Runs
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginTop: 3 }}>
                            {s.total_runs || 0}
                          </div>
                        </SchedStatTile>

                        <SchedStatTile $color="#06b6d4">
                          <div style={{ fontSize: 9, color: '#22d3ee', fontWeight: 700, textTransform: 'uppercase' }}>
                            +Views
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#22d3ee', marginTop: 3 }}>
                            +{fmtNum(s.total_views_added || 0)}
                          </div>
                        </SchedStatTile>

                        <SchedStatTile $color="#f43f5e">
                          <div style={{ fontSize: 9, color: '#fb7185', fontWeight: 700, textTransform: 'uppercase' }}>
                            +Likes
                          </div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: '#fb7185', marginTop: 3 }}>
                            +{fmtNum(s.total_likes_added || 0)}
                          </div>
                        </SchedStatTile>
                      </SchedStatsRow>

                      {/* Boost Now Button */}
                      <BoostNowBtn
                        $running={boostingId === s.id}
                        disabled={!!boostingId}
                        onClick={() => runScheduleNow(s)}
                      >
                        {boostingId === s.id ? (
                          <>
                            <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                            <span>กำลังสั่งรัน (Executing)...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={14} />
                            <span>Boost Now (สั่งรันทันที)</span>
                          </>
                        )}
                      </BoostNowBtn>
                    </SchedCard>
                  )
                })}
              </SchedulesGrid>
            )}
          </div>
        )}
      </AdminPage>

      {/* ═════════════════════════════════════════════════════════════════════
          PORTALED MODALS (Attached to document.body, covers full viewport!)
      ═════════════════════════════════════════════════════════════════════ */}

      {/* ── MODAL 1: CREATE / EDIT SCHEDULE ── */}
      {showModal && createPortal(
        <ModalBackdrop onClick={() => setShowModal(false)}>
          <ModalBox onClick={e => e.stopPropagation()}>
            <DragHandle />
            <ModalHeaderWrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #f97316, #e11d48)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Clock size={18} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>
                    {editSchedId ? 'แก้ไข Auto-Boost Schedule' : 'สร้าง Auto-Boost Schedule ใหม่'}
                  </h3>
                  <div style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.7)', marginTop: 2 }}>
                    ระบบรันอัตโนมัติเบื้องหลังต่อเนื่อง แม้ไม่ได้เปิดเว็บ
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'rgba(148, 163, 184, 0.6)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </ModalHeaderWrap>

            <ModalBodyWrap>
              {/* Schedule Label */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(148, 163, 184, 0.8)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  ชื่อหรือคำอธิบาย Schedule
                </label>
                <StyledInput
                  type="text"
                  placeholder="เช่น: เพิ่มยอดเกมแนะนำทุก 1 ชม."
                  value={draft.label || ''}
                  onChange={e => setDraft(p => ({ ...p, label: e.target.value || null }))}
                />
              </div>

              {/* 1. Target Scope */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(148, 163, 184, 0.8)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  1. ขอบเขตเกมเป้าหมาย (Target Scope)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { v: 'selected' as BoostScope, icon: '🎯', label: 'เกมที่เลือก', sub: `${selectedIds.size} เกม` },
                    { v: 'category' as BoostScope, icon: '📂', label: 'ตามหมวดหมู่', sub: 'กรอง Category' },
                    { v: 'all' as BoostScope, icon: '🌐', label: 'ทุกเกมในระบบ', sub: `${games.length} เกม` },
                  ].map(sc => (
                    <button
                      key={sc.v}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, scope: sc.v }))}
                      style={{
                        padding: '12px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                        background: draft.scope === sc.v ? 'rgba(124, 58, 237, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${draft.scope === sc.v ? '#7c3aed' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: draft.scope === sc.v ? '#c084fc' : '#e2e8f0',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: 18, marginBottom: 2 }}>{sc.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{sc.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{sc.sub}</div>
                    </button>
                  ))}
                </div>

                {draft.scope === 'category' && (
                  <div style={{ marginTop: 8 }}>
                    <StyledSelect
                      value={draft.category_id || ''}
                      onChange={e => setDraft(p => ({ ...p, category_id: e.target.value || null }))}
                      style={{ width: '100%' }}
                    >
                      <option value="">— เลือกหมวดหมู่เป้าหมาย —</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </StyledSelect>
                  </div>
                )}
              </div>

              {/* 2. Boost Mode */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(148, 163, 184, 0.8)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  2. รูปแบบการเติบโต (Growth Strategy)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { v: 'increment' as BoostMode, label: 'Natural Increments', sub: 'สุ่มเพิ่มยอดแบบธรรมชาติทุกๆ รอบ', icon: <TrendingUp size={15} color="#06b6d4" /> },
                    { v: 'target' as BoostMode, label: 'Target Milestones', sub: 'รันจนกว่าจะถึงยอดเป้าหมายที่ตั้งไว้', icon: <Target size={15} color="#34d399" /> },
                  ].map(m => (
                    <button
                      key={m.v}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, mode: m.v }))}
                      style={{
                        padding: '12px 14px', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
                        background: draft.mode === m.v ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                        border: `1px solid ${draft.mode === m.v ? '#06b6d4' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: draft.mode === m.v ? '#22d3ee' : '#e2e8f0',
                        display: 'flex', alignItems: 'flex-start', gap: 8
                      }}
                    >
                      <div style={{ marginTop: 2 }}>{m.icon}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{m.label}</div>
                        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{m.sub}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Metric Growth Rates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {/* Views Config */}
                <div style={{
                  padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(6, 182, 212, 0.08)', border: '1px solid rgba(6, 182, 212, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#22d3ee', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Eye size={13} /> วิว / รอบ
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <StyledInput
                      type="number"
                      min="0"
                      step="10"
                      value={draft.view_min}
                      onChange={e => setDraft(p => ({ ...p, view_min: Math.max(0, parseInt(e.target.value) || 0) }))}
                      style={{ textAlign: 'center', fontWeight: 700, padding: '7px 8px' }}
                    />
                    <span style={{ color: 'rgba(148, 163, 184, 0.5)', fontWeight: 700 }}>~</span>
                    <StyledInput
                      type="number"
                      min="0"
                      step="10"
                      value={draft.view_max}
                      onChange={e => setDraft(p => ({ ...p, view_max: Math.max(0, parseInt(e.target.value) || 0) }))}
                      style={{ textAlign: 'center', fontWeight: 700, padding: '7px 8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { min: 10, max: 50, label: '~50' },
                      { min: 30, max: 150, label: '~150' },
                      { min: 100, max: 500, label: '~500' },
                    ].map(preset => (
                      <QuickPill
                        key={preset.label}
                        $color="#06b6d4"
                        onClick={() => setDraft(p => ({ ...p, view_min: preset.min, view_max: preset.max }))}
                      >
                        {preset.label}
                      </QuickPill>
                    ))}
                  </div>
                </div>

                {/* Likes Config */}
                <div style={{
                  padding: '12px 14px', borderRadius: 14,
                  background: 'rgba(244, 63, 94, 0.08)', border: '1px solid rgba(244, 63, 94, 0.25)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fb7185', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <ThumbsUp size={13} /> ไลก์ / รอบ
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <StyledInput
                      type="number"
                      min="0"
                      step="5"
                      value={draft.like_min}
                      onChange={e => setDraft(p => ({ ...p, like_min: Math.max(0, parseInt(e.target.value) || 0) }))}
                      style={{ textAlign: 'center', fontWeight: 700, padding: '7px 8px' }}
                    />
                    <span style={{ color: 'rgba(148, 163, 184, 0.5)', fontWeight: 700 }}>~</span>
                    <StyledInput
                      type="number"
                      min="0"
                      step="5"
                      value={draft.like_max}
                      onChange={e => setDraft(p => ({ ...p, like_max: Math.max(0, parseInt(e.target.value) || 0) }))}
                      style={{ textAlign: 'center', fontWeight: 700, padding: '7px 8px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {[
                      { min: 5, max: 20, label: '~20' },
                      { min: 10, max: 50, label: '~50' },
                      { min: 25, max: 100, label: '~100' },
                    ].map(preset => (
                      <QuickPill
                        key={preset.label}
                        $color="#f43f5e"
                        onClick={() => setDraft(p => ({ ...p, like_min: preset.min, like_max: preset.max }))}
                      >
                        {preset.label}
                      </QuickPill>
                    ))}
                  </div>
                </div>
              </div>

              {/* 4. Execution Frequency */}
              <div style={{
                padding: '14px 16px', borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)'
              }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(148, 163, 184, 0.8)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  4. ความถี่ในการรัน (Execution Frequency)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'rgba(148, 163, 184, 0.8)', fontWeight: 600 }}>ทุกๆ</span>
                  <StyledInput
                    type="number"
                    min="1"
                    max="999"
                    value={draft.interval_value}
                    onChange={e => setDraft(p => ({ ...p, interval_value: Math.max(1, parseInt(e.target.value) || 1) }))}
                    style={{ width: 60, textAlign: 'center', fontWeight: 800, padding: '7px 8px' }}
                  />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, flex: 1 }}>
                    {(['minute', 'hour', 'day', 'month'] as IntervalUnit[]).map(u => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setDraft(p => ({ ...p, interval_unit: u }))}
                        style={{
                          padding: '7px 8px', borderRadius: 8, cursor: 'pointer', textTransform: 'capitalize',
                          fontSize: 11, fontWeight: 700,
                          background: draft.interval_unit === u ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${draft.interval_unit === u ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                          color: draft.interval_unit === u ? '#fbbf24' : '#e2e8f0',
                        }}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {[
                    { unit: 'minute' as IntervalUnit, val: 5, label: '5m' },
                    { unit: 'minute' as IntervalUnit, val: 30, label: '30m' },
                    { unit: 'hour' as IntervalUnit, val: 1, label: '1h' },
                    { unit: 'hour' as IntervalUnit, val: 6, label: '6h' },
                    { unit: 'day' as IntervalUnit, val: 1, label: '1d' },
                  ].map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setDraft(p => ({ ...p, interval_unit: preset.unit, interval_value: preset.val }))}
                      style={{
                        padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, cursor: 'pointer',
                        background: draft.interval_unit === preset.unit && draft.interval_value === preset.val
                          ? 'rgba(245, 158, 11, 0.25)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: `1px solid ${draft.interval_unit === preset.unit && draft.interval_value === preset.val ? '#f59e0b' : 'rgba(255, 255, 255, 0.08)'}`,
                        color: draft.interval_unit === preset.unit && draft.interval_value === preset.val ? '#fbbf24' : 'rgba(148, 163, 184, 0.8)'
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Summary Preview */}
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(124, 58, 237, 0.12)', border: '1px solid rgba(124, 58, 237, 0.3)',
                fontSize: 12, lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 800, color: '#c084fc', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={13} /> สรุปการทำงาน (Summary)
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  • ความถี่: <strong style={{ color: '#fbbf24' }}>{intervalLabel(draft.interval_unit, draft.interval_value)}</strong>
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  • เป้าหมาย: <strong>{draft.scope === 'all' ? `ทั้งหมด ${games.length} เกม` : draft.scope === 'category' ? 'เกมในหมวดหมู่ที่ระบุ' : `${selectedIds.size} เกมที่เลือก`}</strong>
                </div>
                <div style={{ color: '#e2e8f0' }}>
                  • ยอดเพิ่ม/รอบ: <strong style={{ color: '#22d3ee' }}>+{draft.view_min}~{draft.view_max} วิว</strong> · <strong style={{ color: '#fb7185' }}>+{draft.like_min}~{draft.like_max} ไลก์</strong>
                </div>
              </div>
            </ModalBodyWrap>

            <ModalFooterWrap>
              <SecondaryBtn onClick={() => setShowModal(false)} style={{ padding: '9px 16px', fontSize: 13 }}>
                ยกเลิก
              </SecondaryBtn>
              <PrimaryBtn
                disabled={savingSched}
                onClick={saveSchedule}
                style={{
                  padding: '9px 20px', fontSize: 13,
                  background: 'linear-gradient(135deg, #f97316, #e11d48)',
                  boxShadow: '0 4px 18px rgba(225, 29, 72, 0.4)'
                }}
              >
                {savingSched ? <RefreshCw size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Zap size={14} />}
                <span>{editSchedId ? 'บันทึกแก้ไข' : 'เริ่มรัน Auto-Boost'}</span>
              </PrimaryBtn>
            </ModalFooterWrap>
          </ModalBox>
        </ModalBackdrop>,
        document.body
      )}

      {/* ── MODAL 2: FINE-TUNE PRECISION ADJUSTER ── */}
      {fineGame && createPortal(
        <ModalBackdrop onClick={() => setFineGame(null)}>
          <ModalBox $maxWidth="440px" onClick={e => e.stopPropagation()}>
            <DragHandle />
            <ModalHeaderWrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: 'linear-gradient(135deg, #06b6d4, #7c3aed)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <Sliders size={16} color="#fff" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', margin: 0, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fineGame.title}
                  </h3>
                  <div style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.7)' }}>ปรับแต่งสถิติเฉพาะเกมนี้</div>
                </div>
              </div>
              <button onClick={() => setFineGame(null)} style={{ background: 'none', border: 'none', color: 'rgba(148, 163, 184, 0.6)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </ModalHeaderWrap>

            <ModalBodyWrap style={{ gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'rgba(10, 10, 20, 0.6)', padding: 3, borderRadius: 10 }}>
                {(['increment', 'overwrite'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setFineMode(m)}
                    style={{
                      padding: '7px 10px', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                      background: fineMode === m ? '#7c3aed' : 'transparent',
                      border: 'none', color: fineMode === m ? '#fff' : 'rgba(148, 163, 184, 0.8)',
                    }}
                  >
                    {m === 'increment' ? '➕ เพิ่มยอด (Delta)' : '🎯 กำหนดยอดตรงๆ'}
                  </button>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#22d3ee', marginBottom: 5 }}>
                  ยอดวิว (Views) {fineMode === 'increment' ? 'ที่ต้องการเพิ่ม' : 'เป้าหมาย'}
                </label>
                <StyledInput
                  type="number"
                  min="0"
                  value={fineViews}
                  onChange={e => setFineViews(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ fontWeight: 800, fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#fb7185', marginBottom: 5 }}>
                  ยอดไลก์ (Likes) {fineMode === 'increment' ? 'ที่ต้องการเพิ่ม' : 'เป้าหมาย'}
                </label>
                <StyledInput
                  type="number"
                  min="0"
                  value={fineLikes}
                  onChange={e => setFineLikes(Math.max(0, parseInt(e.target.value) || 0))}
                  style={{ fontWeight: 800, fontSize: 14 }}
                />
              </div>

              <div style={{
                padding: '10px 14px', borderRadius: 10, background: 'rgba(10, 10, 20, 0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12
              }}>
                <span style={{ color: 'rgba(148, 163, 184, 0.8)' }}>ผลลัพธ์:</span>
                <div style={{ fontWeight: 800, display: 'flex', gap: 8 }}>
                  <span style={{ color: '#22d3ee' }}>
                    {fmtNum(fineMode === 'increment' ? fineGame.currentViews + fineViews : fineViews)} 👁
                  </span>
                  <span style={{ color: '#fb7185' }}>
                    {fmtNum(fineMode === 'increment' ? fineGame.currentLikes + fineLikes : fineLikes)} ❤️
                  </span>
                </div>
              </div>
            </ModalBodyWrap>

            <ModalFooterWrap>
              <SecondaryBtn onClick={() => setFineGame(null)} style={{ padding: '8px 14px' }}>
                ยกเลิก
              </SecondaryBtn>
              <PrimaryBtn onClick={applyFine} style={{ padding: '8px 18px', background: 'linear-gradient(135deg, #06b6d4, #7c3aed)' }}>
                บันทึก
              </PrimaryBtn>
            </ModalFooterWrap>
          </ModalBox>
        </ModalBackdrop>,
        document.body
      )}

      {/* ── MODAL 3: SQL DATABASE SETUP ── */}
      {showSqlModal && createPortal(
        <ModalBackdrop onClick={() => setShowSqlModal(false)}>
          <ModalBox $maxWidth="500px" onClick={e => e.stopPropagation()}>
            <DragHandle />
            <ModalHeaderWrap>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c084fc'
                }}>
                  <Database size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>คู่มือติดตั้งฐานข้อมูล</h3>
                  <div style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.7)' }}>ตั้งค่า Supabase Cron & Schemas</div>
                </div>
              </div>
              <button onClick={() => setShowSqlModal(false)} style={{ background: 'none', border: 'none', color: 'rgba(148, 163, 184, 0.6)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </ModalHeaderWrap>

            <ModalBodyWrap style={{ fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', gap: 12 }}>
              <p>หากต้องการให้ระบบรันอัตโนมัติบน Supabase Server (pg_cron) ทำตามขั้นตอนนี้:</p>
              <div style={{
                background: 'rgba(10, 10, 20, 0.6)', padding: '12px 14px', borderRadius: 12,
                border: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: 8
              }}>
                <div>
                  <strong style={{ color: '#c084fc' }}>ขั้นตอนที่ 1:</strong> รันคำสั่งจากไฟล์ <code style={{ color: '#22d3ee', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 5px', borderRadius: 4 }}>src/lib/boost_schedules_schema.sql</code> ใน Supabase SQL Editor
                </div>
                <div>
                  <strong style={{ color: '#c084fc' }}>ขั้นตอนที่ 2:</strong> รันคำสั่งจากไฟล์ <code style={{ color: '#22d3ee', background: 'rgba(6, 182, 212, 0.15)', padding: '2px 5px', borderRadius: 4 }}>src/lib/setup_pg_cron.sql</code> เพื่อเปิดใช้งาน Cron รันทุก 1 นาที
                </div>
              </div>
              <p style={{ fontSize: 11, color: 'rgba(148, 163, 184, 0.6)' }}>
                *หมายเหตุ: แม้ไม่ได้เปิด pg_cron ระบบ Client-Side Auto-Boost จะคอยตรวจสอบและรันให้อัตโนมัติทุกๆ 30 วินาทีขณะเปิดหน้านี้ไว้
              </p>
            </ModalBodyWrap>

            <ModalFooterWrap>
              <SecondaryBtn onClick={copySqlFiles} style={{ padding: '8px 14px' }}>
                {copiedSql ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                <span>{copiedSql ? 'คัดลอกแล้ว!' : 'คัดลอกคำแนะนำ SQL'}</span>
              </SecondaryBtn>
              <PrimaryBtn onClick={() => setShowSqlModal(false)} style={{ padding: '8px 18px' }}>
                ปิด
              </PrimaryBtn>
            </ModalFooterWrap>
          </ModalBox>
        </ModalBackdrop>,
        document.body
      )}
    </>
  )
}
