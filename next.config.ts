import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["ffmpeg-static", "ffprobe-static"],
  async redirects() {
    return [
      { source: "/beheer", destination: "/admin", permanent: false },
      { source: "/beheer/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
