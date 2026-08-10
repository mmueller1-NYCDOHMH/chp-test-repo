/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // React 19 + react-leaflet 5 re-introduced a known dev-only Strict Mode
  // bug: Strict Mode's intentional double-invoke of effects races with
  // Leaflet's synchronous, imperative DOM ownership of the map container,
  // producing "Cannot read properties of undefined (reading 'appendChild')"
  // or "Map container is already initialized" on mount
  // (see https://github.com/PaulLeCam/react-leaflet/issues/1133). It only
  // happens in dev — production builds don't double-invoke effects, so this
  // has no effect on prod behavior. NeighborhoodMap.jsx and ChoroplethMap.jsx
  // already carry their own guards against this; disabling Strict Mode here
  // removes the root cause app-wide instead of patching around it per map.
  reactStrictMode: false,
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
