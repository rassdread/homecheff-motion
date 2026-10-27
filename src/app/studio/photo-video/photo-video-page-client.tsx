"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

const PhotoVideoComposer = dynamic(
  () => import("@/components/photo-video/photo-video-composer").then((mod) => mod.PhotoVideoComposer),
  {
    ssr: false,
    loading: () => (
      <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-zinc-500">…</div>
    ),
  }
);

function PreservedPhotoVideoIdea() {
  const idea = (useSearchParams().get("idea") ?? "").trim().slice(0, 500);
  if (!idea) return null;
  return <p className="mb-4 text-sm text-zinc-800" data-testid="studio-v23-preserved-idea">{idea}</p>;
}

export function PhotoVideoPageClient() {
  return (
    <main className="min-h-[70vh] flex-1 bg-gradient-to-b from-zinc-50 to-white">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Suspense fallback={<div className="py-16 text-sm text-zinc-500">…</div>}>
          <PreservedPhotoVideoIdea />
          <PhotoVideoComposer />
        </Suspense>
      </div>
    </main>
  );
}
