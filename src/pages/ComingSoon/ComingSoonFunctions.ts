export interface EpicFreeGame {
  id: string
  title: string
  coverImage: string
  startDate: string
  endDate: string
  epicUrl: string
  isUpcoming: boolean // false = free now, true = upcoming free
}

export interface SteamGame {
  id: number
  name: string
  large_capsule_image: string
}

export interface EpicGeneralGame {
  id: string
  title: string
  coverImage: string
  url: string
  releaseDate: string
}

// ─── Cache (localStorage, 24h TTL) ────────────────────────────
const CACHE_KEY = 'epic_free_games_v3'
const CACHE_TTL = 24 * 60 * 60 * 1000

function getCached(): EpicFreeGame[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > CACHE_TTL) return null
    return data
  } catch { return null }
}

function setCached(data: EpicFreeGame[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }))
  } catch { /* ignore */ }
}

// ─── Epic Games fetcher (no API key needed) ────────────────────
export async function fetchEpicGames(force = false): Promise<EpicFreeGame[]> {
  if (!force) {
    const hit = getCached()
    if (hit) {
      const nowMs = Date.now()
      return hit.map((g: EpicFreeGame) => ({
        ...g,
        isUpcoming: new Date(g.startDate).getTime() > nowMs
      })).filter((g: EpicFreeGame) => new Date(g.endDate).getTime() > nowMs)
    }
  }

  // /api/epic → Vite proxy (dev) or Cloudflare Pages Function (production)
  const res = await fetch('/api/epic', { cache: 'no-store' })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elements: any[] = json?.data?.Catalog?.searchStore?.elements ?? []

  const results: EpicFreeGame[] = []

  for (const el of elements) {
    if (!el.promotions) continue

    const img =
      el.keyImages?.find((i: { type: string }) => i.type === 'OfferImageTall')?.url ||
      el.keyImages?.find((i: { type: string }) => i.type === 'DieselGameBoxTall')?.url ||
      el.keyImages?.find((i: { type: string }) => i.type === 'Thumbnail')?.url ||
      el.keyImages?.[0]?.url || ''

    const slug =
      el.catalogNs?.mappings?.find((m: { pageType: string }) => m.pageType === 'productHome')?.pageSlug ||
      el.productSlug || el.urlSlug || ''

    const link = slug
      ? `https://store.epicgames.com/en-US/p/${slug}`
      : 'https://store.epicgames.com/en-US/free-games'

    // Current free offers
    let addedNow = false;
    for (const bucket of (el.promotions?.promotionalOffers ?? [])) {
      for (const offer of (bucket.promotionalOffers ?? [])) {
        if (offer.discountSetting?.discountPercentage === 0) {
          results.push({
            id: `${el.id}-now`,
            title: el.title,
            coverImage: img,
            startDate: offer.startDate,
            endDate: offer.endDate,
            epicUrl: link,
            isUpcoming: false,
          })
          addedNow = true;
          break; // Stop processing offers for this bucket if we found one
        }
      }
      if (addedNow) break;
    }

    // Upcoming free offers
    let addedSoon = false;
    for (const bucket of (el.promotions?.upcomingPromotionalOffers ?? [])) {
      for (const offer of (bucket.promotionalOffers ?? [])) {
        // Upcoming offers often don't have discountPercentage=0 set yet, 
        // they just exist in the upcomingPromotionalOffers array
        if (offer.discountSetting?.discountPercentage === 0 || el.promotions?.upcomingPromotionalOffers?.length > 0) {
          results.push({
            id: `${el.id}-soon`,
            title: el.title,
            coverImage: img,
            startDate: offer.startDate,
            endDate: offer.endDate,
            epicUrl: link,
            isUpcoming: true,
          })
          addedSoon = true;
          break;
        }
      }
      if (addedSoon) break;
    }
  }

  // Deduplicate by title
  const seen = new Set<string>()
  const unique = results.filter(g => {
    const k = g.title
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })

  const nowMs = Date.now()
  const evaluated = unique.map(g => ({
    ...g,
    isUpcoming: new Date(g.startDate).getTime() > nowMs
  })).filter(g => new Date(g.endDate).getTime() > nowMs)

  // Sort: upcoming first
  evaluated.sort((a, b) => (a.isUpcoming === b.isUpcoming ? 0 : a.isUpcoming ? -1 : 1))

  setCached(evaluated)
  return evaluated
}

export async function fetchSteamUpcoming(): Promise<SteamGame[]> {
  try {
    const res = await fetch('/api/steam')
    if (!res.ok) return []
    const wrapper = await res.json()
    const html = wrapper?.contents || ''

    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')
    const rows = doc.querySelectorAll('.search_result_row')

    return Array.from(rows).slice(0, 15).map(row => {
      const imgElem = row.querySelector('.search_capsule img') as HTMLImageElement
      const titleElem = row.querySelector('.title')
      const appId = parseInt(row.getAttribute('data-ds-appid') || '0', 10)
      let capsule = imgElem?.getAttribute('src') || ''
      const srcset = imgElem?.getAttribute('srcset') || ''

      // Steam often uses srcset for lazy loading, with the largest image at the end
      if (srcset) {
        const urls = srcset.match(/(https:\/\/[^\s,]+)/g)
        if (urls && urls.length > 0) {
          capsule = urls[urls.length - 1]
        }
      }

      // If it's a lazy-load placeholder, construct the URL manually via appId
      if (capsule.includes('trans.gif') && appId) {
        capsule = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg`
      } else if (capsule) {
        capsule = capsule.replace('capsule_231x87', 'capsule_616x353')
          .replace('capsule_sm_120', 'capsule_616x353')
      }
      return {
        id: appId,
        name: titleElem?.textContent || 'Unknown',
        large_capsule_image: capsule
      }
    })
  } catch {
    return []
  }
}

export async function fetchEpicGeneralUpcoming(): Promise<EpicGeneralGame[]> {
  try {
    // Epic doesn't have a strict 'coming soon' endpoint, so we query the catalog and sort by release date ascending
    // filtering out games that have already been released.
    const url = 'https://store-site-backend-static.ak.epicgames.com/api/content/v2/catalog/search?locale=th&country=TH&category=games%2Fedition%2Fbase&count=100&sortBy=releaseDate&sortDir=ASC'
    const res = await fetch(url)
    if (!res.ok) return []
    const json = await res.json()
    const elements = json?.data?.Catalog?.searchStore?.elements || []
    const now = new Date().toISOString()
    
    // Filter for unreleased games and take the first 15
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const upcoming = elements.filter((e: any) => e.releaseDate && e.releaseDate > now && e.status !== 'ACTIVE').slice(0, 15)
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return upcoming.map((el: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const img = el.keyImages?.find((i: any) => i.type === 'OfferImageTall')?.url || 
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  el.keyImages?.find((i: any) => i.type === 'Thumbnail')?.url || 
                  el.keyImages?.[0]?.url || ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const slug = el.catalogNs?.mappings?.find((m: any) => m.pageType === 'productHome')?.pageSlug || el.productSlug || el.urlSlug
      return {
        id: el.id,
        title: el.title,
        coverImage: img,
        url: `https://store.epicgames.com/en-US/p/${slug}`,
        releaseDate: el.releaseDate
      }
    })
  } catch {
    return []
  }
}

// ─── Helpers ───────────────────────────────────────────────────
export function fmtDate(iso: string) {
  const d = new Date(iso)
  const dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} ${timeStr} น.`
}
