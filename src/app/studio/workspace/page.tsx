"use client";

import { Suspense, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { WorkspaceLoadingSkeleton } from "@/components/ui/motion-studio-primitives";
import { StudioWorkspaceShell } from "@/components/studio/studio-workspace-shell";
import { useActiveTranslator } from "@/i18n/client";

type PageProps = {
  params: Promise<Record<string, never>>;
};

function StudioWorkspaceContent() {
  const searchParams = useSearchParams();
  const storyboardId = searchParams.get("storyboardId")?.trim() ?? "";
  const t = useActiveTranslator();

  if (!storyboardId) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16 text-center">
        <h1 className="text-xl font-bold text-zinc-900">{t("studio.workspace.missingStoryboard")}</h1>
        <p className="mt-2 text-sm text-zinc-600">{t("studio.workspace.missingStoryboardHint")}</p>
        <Link
          href="/studio/storyboards"
          className="mt-6 inline-block rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white"
        >
          {t("studio.feature.storyboards.title")}
        </Link>
      </main>
    );
  }

  return <StudioWorkspaceShell storyboardId={storyboardId} />;
}

export default function StudioWorkspacePage({ params }: PageProps) {
  use(params);

  return (
    <Suspense
      fallback={<WorkspaceLoadingSkeleton />}
    >
      <StudioWorkspaceContent />
    </Suspense>
  );
}
