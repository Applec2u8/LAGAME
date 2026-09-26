import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const getScrollKey = (key: string) => `scroll_pos_${key}`

// Called by Header nav links to prevent restoring scroll on fresh navigation
export function clearRestoreFlag(path: string) {
  sessionStorage.removeItem(getScrollKey(path))
  // If the user clicks the link of the page they are ALREADY on, force scroll to top
  if (window.location.pathname === path) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// No longer strictly needed in this simplified version, but kept so GameDetailPage doesn't break
export function markReturnFromDetail(_fromPath: string) {
  // We rely entirely on the scroll key now, no one-time flags needed
}

// Called from App.tsx beforeunload listener
export function saveScrollBeforeUnload() {
  const state = window.history.state; const key = (state && state.key && state.key !== 'default') ? state.key : window.location.pathname;
  sessionStorage.setItem(getScrollKey(key), window.scrollY.toString())
}

export function useScrollRestore(isReady: boolean) {
  const location = useLocation()
  const locKey = location.key !== 'default' ? location.key : location.pathname
  const hasRestored = useRef(false)

  // 1. CONSTANTLY SAVE SCROLL (Debounced)
  useEffect(() => {
    let timeoutId: number
    const handleScroll = () => {
      // Do not save scroll position while we are still trying to restore it
      if (!hasRestored.current) return
      
      clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        sessionStorage.setItem(getScrollKey(locKey), window.scrollY.toString())
      }, 100) // 100ms debounce to prevent performance issues
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Also save immediately on unmount as a fallback
    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timeoutId)
      if (hasRestored.current) {
        sessionStorage.setItem(getScrollKey(locKey), window.scrollY.toString())
      }
    }
  }, [locKey])

  // 2. RESTORE SCROLL ON MOUNT / READY
  useEffect(() => {
    // Reset restored flag if path changes
    hasRestored.current = false
  }, [locKey])

  useEffect(() => {
    if (!isReady || hasRestored.current) return
    
    const savedScroll = sessionStorage.getItem(getScrollKey(locKey))
    
    if (savedScroll) {
      const targetY = Number(savedScroll)
      let attempts = 0
      
      // Poll until the DOM has expanded enough to scroll to this position
      const poll = setInterval(() => {
        attempts++
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight
        
        if (maxScroll >= targetY || attempts > 50) {
          clearInterval(poll)
          window.scrollTo({ top: Math.min(targetY, Math.max(0, maxScroll)), behavior: 'instant' })
          
          // Mark as restored so we can start saving new scroll events
          setTimeout(() => {
            hasRestored.current = true
          }, 50)
        }
      }, 100)
      
      return () => clearInterval(poll)
    } else {
      // No saved scroll -> fresh navigation, start at top
      window.scrollTo({ top: 0, behavior: 'instant' })
      hasRestored.current = true
    }
  }, [isReady, locKey])
}