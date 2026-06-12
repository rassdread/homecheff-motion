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
      { source: "/library/start", destination: "/studio/assets", permanent: false },
      { source: "/library/start/:path*", destination: "/studio/assets/:path*", permanent: false },
      { source: "/library/creative/:path*", destination: "/studio/assets/creative/:path*", permanent: false },
      { source: "/library/media/:path*", destination: "/studio/assets/media/:path*", permanent: false },
      { source: "/presentation", destination: "/publish", permanent: false },
      { source: "/presentation/:path*", destination: "/publish/:path*", permanent: false },
      { source: "/create", destination: "/maak", permanent: false },
      { source: "/create/:path*", destination: "/maak", permanent: false },
      { source: "/beheer", destination: "/admin", permanent: false },
      { source: "/beheer/:path*", destination: "/admin/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
