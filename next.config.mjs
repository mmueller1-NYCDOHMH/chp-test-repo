/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // turbopack: {} acknowledges Turbopack is in use and silences the
  // "webpack config with no turbopack config" warning. No extra config
  // is needed — vega-embed is dynamically imported client-side, and
  // leaflet is loaded lazily inside useEffect in NeighborhoodMap.
  turbopack: {},
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.nyc.gov',
        pathname: '/assets/**',
      },
    ],
  },
};

export default nextConfig;
