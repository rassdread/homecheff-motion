import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "ffmpeg-static",
    "ffprobe-static",
    "sharp",
    "onnxruntime-node",
    "@mediapipe/tasks-vision",
    "@napi-rs/canvas",
  ],
  async redirects() {
    return [
      { source: "/beheer", destination: "/admin", permanent: false },
      { source: "/beheer/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
