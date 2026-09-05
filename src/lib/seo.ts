export const SITE_NAME = 'LA-GAME'
export const DEFAULT_DESCRIPTION = 'Download free PC games with fast cloud download links, category filters, and top picks for gamers.'
export const DEFAULT_KEYWORDS = 'free pc games, download pc games, game downloads, top pc games, freeware games, game hub'
export const DEFAULT_IMAGE = '/LOGO.png'

const rawBaseUrl = import.meta.env.VITE_PUBLIC_URL || ''
export const BASE_URL = rawBaseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://lapack-game.example')

export const getPageUrl = (path = '/') => `${BASE_URL.replace(/\/$/, '')}${path}`
