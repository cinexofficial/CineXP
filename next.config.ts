import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  cacheOnFrontEndNav: true,
  workboxOptions: {
    skipWaiting: true,
  },
});

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  devIndicators: false,
  turbopack: {},
  images: {
    unoptimized: true,
  },
  transpilePackages: ["motion", "framer-motion"],
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'cinexp.site',
          },
        ],
        destination: 'https://www.cinexp.site/:path*',
        permanent: true,
      },
    ];
  },
};

export default withPWA(nextConfig);
