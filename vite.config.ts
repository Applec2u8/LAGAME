import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/steamspy': {
        target: 'https://steamspy.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/steamspy/, '')
      },
      '/api/epic': {
        target: 'https://store-site-backend-static.ak.epicgames.com',
        changeOrigin: true,
        rewrite: () => '/freeGamesPromotions?locale=th&country=TH&allowCountries=TH',
        headers: {
          'Origin': 'https://store.epicgames.com',
          'Referer': 'https://store.epicgames.com/',
        }
      },
      '/api/steam': {
        target: 'https://store.steampowered.com',
        changeOrigin: true,
        rewrite: () => '/search/results?filter=popularwishlist&os=win&infinite=1'
      }
    }
  }
})
