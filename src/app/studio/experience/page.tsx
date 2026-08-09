import { Suspense } from "react";
import { StudioExperiencePackFunnel } from "@/components/studio/studio-experience-pack-funnel";

export default function StudioExperiencePackPage() {
  return (
    <main className="min-h-[70vh] flex-1 bg-gradient-to-b from-zinc-50 to-white">
      <Suspense
        fallback={
          <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-zinc-500">Loading experience…</div>
        }
      >
        <StudioExperiencePackFunnel />
      </Suspense>
    </main>
  );
}
