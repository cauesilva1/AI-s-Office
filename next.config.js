/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sem output: 'export' — o app depende da rota de API /api/chat
  images: { unoptimized: true },
  // Lint/typecheck no CI local (`npm run lint` / `npm test`); build mais rápido p/ Vercel
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: false },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
}
module.exports = nextConfig
