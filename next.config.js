/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    // On Windows dev, filesystem cache can occasionally error on rename.
    // Disabling it avoids noisy ENOENT warnings without affecting production builds.
    if (dev) config.cache = false
    return config
  },
}

module.exports = nextConfig
