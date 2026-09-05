import axios from 'axios'

const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY as string
const BASE_URL = 'https://api.rawg.io/api'

export type RawgGame = {
  id: number
  name: string
  slug: string
  description_raw?: string
  background_image: string | null
  screenshots?: { id: number; image: string }[]
  genres: { id: number; name: string; slug: string }[]
  metacritic: number | null
  released: string | null
  platforms?: { platform: { name: string } }[]
}

/**
 * Search for games by name on RAWG API.
 */
export async function searchRawgGames(query: string): Promise<RawgGame[]> {
  if (!RAWG_API_KEY || RAWG_API_KEY === 'your-rawg-api-key-here') {
    throw new Error('RAWG API key not configured. Please add VITE_RAWG_API_KEY to your .env file.')
  }
  const res = await axios.get(`${BASE_URL}/games`, {
    params: { key: RAWG_API_KEY, search: query, page_size: 10 },
  })
  return res.data.results
}

/**
 * Get full game details including description from RAWG.
 */
export async function getRawgGameDetails(id: number): Promise<RawgGame> {
  const [detailRes, screenshotsRes] = await Promise.all([
    axios.get(`${BASE_URL}/games/${id}`, { params: { key: RAWG_API_KEY } }),
    axios.get(`${BASE_URL}/games/${id}/screenshots`, { params: { key: RAWG_API_KEY } }),
  ])
  return {
    ...detailRes.data,
    screenshots: screenshotsRes.data.results,
  }
}

/**
 * Map RAWG genre names to our local category slugs.
 */
export function mapRawgGenreToCategory(genres: { name: string; slug: string }[]): string {
  const map: Record<string, string> = {
    action: 'action',
    adventure: 'adventure',
    'role-playing-games-rpg': 'rpg',
    strategy: 'strategy',
    sports: 'sports',
    racing: 'racing',
    simulation: 'simulation',
    horror: 'horror',
    shooter: 'shooter',
    fighting: 'fighting',
    puzzle: 'puzzle',
    arcade: 'arcade',
  }
  for (const g of genres) {
    if (map[g.slug]) return map[g.slug]
  }
  return 'action' // default
}
