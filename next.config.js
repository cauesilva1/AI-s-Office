/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem output: 'export' — o app depende da rota de API /api/chat
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}
module.exports = nextConfig
