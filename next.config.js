/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'dist',
  images: { unoptimized: true },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}
module.exports = nextConfig
