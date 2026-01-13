import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, './'),
  // Vercel deployment optimizations
  output: 'standalone',
  // Ensure Firebase works in production
  env: {
    NEXT_PUBLIC_USE_LOCAL_ONLY: process.env.NEXT_PUBLIC_USE_LOCAL_ONLY || 'false',
  },
}

export default nextConfig
