/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  typescript: {
    // Ignore build errors if typescript complains during VM deployment to keep provisioning robust
    ignoreBuildErrors: true,
  },
  eslint: {
    // Ignore eslint errors during production builds
    ignoreDuringBuilds: true,
  }
}

module.exports = nextConfig
