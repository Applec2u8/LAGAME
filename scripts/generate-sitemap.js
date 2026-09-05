import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY
const siteUrl = process.env.VITE_PUBLIC_URL || 'https://example.com'

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variable.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

const staticRoutes = ['/', '/az-filter', '/top-games', '/comments']

async function generate() {
  let games = []
  try {
    const { data, error } = await supabase
      .from('games')
      .select('slug, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(1000)

    if (error) throw error;
    games = data || [];
  } catch (err) {
    console.error('Failed to fetch games for sitemap:', err.message || err)
    // Proceed with static routes only instead of failing the build
  }

  const slugEntries = (games || []).map((game) => ({
    loc: `${siteUrl.replace(/\/$/, '')}/game/${game.slug}`,
    lastmod: game.updated_at || game.created_at || new Date().toISOString(),
  }))

  const sitemapContent = [`<?xml version="1.0" encoding="UTF-8"?>`, `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`]
    .concat(
      staticRoutes.map((route) => `  <url>\n    <loc>${siteUrl.replace(/\/$/, '')}${route}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.8</priority>\n  </url>`),
      slugEntries.map((entry) => `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`),
    )
    .concat(['</urlset>'])
    .join('\n')

  const targetPath = path.resolve(process.cwd(), 'public', 'sitemap.xml')
  fs.writeFileSync(targetPath, sitemapContent, 'utf8')
  console.log(`Generated sitemap at ${targetPath}`)
}

generate().catch((error) => {
  console.error('Sitemap generation failed:', error)
  process.exit(1)
})
