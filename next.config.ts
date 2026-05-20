import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/beheer", destination: "/admin", permanent: false },
      { source: "/beheer/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
