"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAssetMemoryTab } from "@/components/studio/studio-asset-memory-tab";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { deleteStudioWorldApi, fetchStudioWorld } from "@/lib/studio-worlds-client";
import type { StudioWorldProfileDetail } from "@/types/studio-api";

type StudioWorldDetailViewProps = { worldId: string };

export function StudioWorldDetailView({ worldId }: StudioWorldDetailViewProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [world, setWorld] = useState<StudioWorldProfileDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"overview" | "memory">("overview");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioWorld(worldId);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.worlds.error.loadFailed"));
      setWorld(null);
    } else {
      setWorld(res.data.world);
    }
    setLoading(false);
  }, [worldId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) return;
    queueMicrotask(() => void load());
  }, [session.resolved, session.user, load]);

  const canModify = Boolean(session.user?.id && world && world.ownerId === session.user.id);

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
          <Link href="/studio/worlds" className="text-sm text-[#006D52] hover:underline">
            ← {t("studio.worlds.backToLibrary")}
          </Link>
          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : world ? (
            <>
              <div className="mt-4 flex flex-wrap justify-between gap-4">
                <h1 className="text-3xl font-bold text-zinc-900">{world.name}</h1>
                {canModify ? (
                  <div className="flex gap-2">
                    <Link
                      href={`/studio/worlds/${world.id}/edit`}
                      className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1]"
                    >
                      {t("studio.worlds.action.edit")}
                    </Link>
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={async () => {
                        if (!window.confirm(t("studio.worlds.deleteConfirm"))) return;
                        setDeleting(true);
                        const res = await deleteStudioWorldApi(world.id);
                        setDeleting(false);
                        if (res.ok) router.push("/studio/worlds");
                      }}
                      className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700"
                    >
                      {deleting ? t("button.loading") : t("studio.worlds.action.delete")}
                    </button>
                  </div>
                ) : null}
              </div>
              <div className="mt-6 flex gap-2">
                {(["overview", "memory"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      tab === id ? "bg-[#006D52] text-white" : "bg-white text-zinc-700 border"
                    }`}
                  >
                    {t(id === "memory" ? "studio.memory.tabTitle" : "studio.worlds.tab.overview")}
                  </button>
                ))}
              </div>
              {tab === "overview" ? (
                <AppCard className="mt-6 p-6 text-sm text-zinc-800 whitespace-pre-wrap">
                  {world.description || "—"}
                </AppCard>
              ) : (
                <StudioAssetMemoryTab
                  kind="world"
                  continuityStrength={world.continuityStrength}
                  fields={[
                    { label: t("studio.worlds.field.visualStyle"), value: world.visualStyle },
                    { label: t("studio.worlds.field.tone"), value: world.tone },
                    {
                      label: t("studio.worlds.field.continuityRules"),
                      value: world.continuityRules,
                    },
                  ]}
                />
              )}
            </>
          ) : (
            <p className="mt-8 text-red-700">{error}</p>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
