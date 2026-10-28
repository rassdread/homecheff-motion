"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useActiveTranslator } from "@/i18n/client";
import { publishStudioFilmAssistantContext } from "@/lib/studio-film-assistant-bridge";
import type { StudioHistoryAction, StudioHistoryKind } from "@/lib/studio-v24-history";

type OpenedAsset = {
  id: string;
  title: string;
  family: string;
  status: string;
  previewUrl: string | null;
  kind: StudioHistoryKind;
  editable: boolean;
  action: StudioHistoryAction;
};

export default function StudioOpenPage() {
  return (
    <StudioAuthGate>
      <Suspense fallback={null}>
        <StudioOpenResolver />
      </Suspense>
    </StudioAuthGate>
  );
}

function StudioOpenResolver() {
  const t = useActiveTranslator();
  const router = useRouter();
  const params = useParams<{ kind: string; id: string }>();
  const search = useSearchParams();
  const auth = useAuthSession();
  const [asset, setAsset] = useState<OpenedAsset | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!auth.resolved || !auth.user) return;
    let cancelled = false;
    void fetch("/api/studio/open", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: params.kind, id: params.id }),
    }).then(async (response) => {
      const body = (await response.json().catch(() => null)) as { href?: string | null; item?: OpenedAsset | null } | null;
      if (cancelled) return;
      if (!response.ok || !body) {
        setMissing(true);
        return;
      }
      if (body.href) {
        const tool = search.get("tool");
        const projectId = body.href.match(/\/studio\/projects\/([A-Za-z0-9_-]+)/)?.[1] ?? "";
        if ((tool === "voice" || tool === "music" || tool === "sound") && params.kind === "storyboard" && projectId) {
          const mode = tool === "sound" ? "sfx" : tool;
          const scene = search.get("scene") ?? "";
          const next = new URLSearchParams();
          next.set("mode", mode);
          next.set("storyboardId", params.id);
          next.set("projectId", projectId);
          if (/^[A-Za-z0-9_-]{1,80}$/.test(scene)) next.set("scene", scene);
          const idea = search.get("idea")?.trim().slice(0, 500) ?? "";
          if (idea) next.set("idea", idea);
          const returnTo =
            search.get("returnTo") ||
            `/studio/projects/${projectId}?section=scenes&workflow=film${scene ? `&scene=${scene}` : ""}`;
          next.set("returnTo", returnTo);
          router.replace(`/studio/audio/create?${next.toString()}`);
          return;
        }
        router.replace(body.href);
        return;
      }
      publishStudioFilmAssistantContext(null);
      setAsset(body.item ?? null);
      if (!body.item) setMissing(true);
    });
    return () => {
      cancelled = true;
    };
  }, [auth.resolved, auth.user, params.id, params.kind, router, search]);

  if (missing) {
    return <p className="px-6 py-16 text-sm text-zinc-700">{t("studio.v24.missing")}</p>;
  }
  if (!asset) {
    return <p className="px-6 py-16 text-sm text-zinc-600">{t("studio.workspace.v12.loading")}</p>;
  }
  const playable = asset.action === "play" && asset.previewUrl;
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8" data-testid="studio-v24-asset">
      <a href="/studio" className="text-sm font-semibold text-[#006D52]">{t("studio.v24.back")}</a>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-zinc-500">{t(`studio.v24.kind.${asset.kind}`)}</p>
      <h1 className="mt-1 text-2xl font-semibold text-zinc-900">{asset.title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{t("studio.v24.readOnly")}</p>
      <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50">
        {asset.previewUrl && asset.kind !== "voice" && asset.kind !== "audio" ? (
          <img src={asset.previewUrl} alt="" className="max-h-80 w-full object-contain" />
        ) : (
          <div className="flex h-40 items-center justify-center text-3xl font-semibold text-zinc-400" data-testid="studio-v24-preview-fallback">
            {asset.title.slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      {playable ? (
        <audio className="mt-4 w-full" controls src={asset.previewUrl ?? undefined} />
      ) : null}
      <p className="mt-4 text-sm text-zinc-700">{t(`studio.v24.action.${asset.action}`)}</p>
    </main>
  );
}
