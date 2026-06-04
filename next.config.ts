import type { NextConfig } from "next";

const buildTime = new Date().toISOString();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_TIME: buildTime,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_VERCEL_DEPLOYMENT_ID: process.env.VERCEL_DEPLOYMENT_ID ?? "",
    NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
    NEXT_PUBLIC_VERCEL_BUILD_COMPLETED_AT: process.env.VERCEL_BUILD_COMPLETED_AT ?? "",
  },
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
