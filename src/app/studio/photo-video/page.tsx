"use client";

import dynamic from "next/dynamic";

const PhotoVideoComposer = dynamic(
  () => import("@/components/photo-video/photo-video-composer").then((mod) => mod.PhotoVideoComposer),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-zinc-500">…</div>
    ),
  }
);

export default function StudioPhotoVideoPage() {
  return (
    <main className="min-h-[70vh] flex-1 bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <PhotoVideoComposer />
      </div>
    </main>
  );
}
