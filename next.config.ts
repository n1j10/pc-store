import type { NextConfig } from "next";

const nextConfig: NextConfig = {
images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
      },
      {
        protocol: 'https',
        hostname: 'jbhzmexrkdlwkkjneqto.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'img.clerk.com',
      },
      {
        protocol: 'https',
        hostname: 'jbhzmexrkdlwkkjneqto.supabase.co',
      },
      // <-- NEW pattern for the bucket that produced the error
      {
        protocol: 'https',
        hostname: 'jbhzmexrkdlwkkjneqto.supabase.co',
      },
    ],
  },
};


export default nextConfig;
