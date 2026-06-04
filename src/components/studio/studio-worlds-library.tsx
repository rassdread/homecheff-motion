"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import { filterStudioAssetsBySearch } from "@/lib/studio-asset-search";
import { deleteStudioWorldApi, fetchStudioWorlds } from "@/lib/studio-worlds-client";
import type { StudioWorldProfileListItem } from "@/types/studio-api";
import { AppCard } from "@/components/ui/app-card";

export function StudioWorldsLibrary() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [worlds, setWorlds] = useState<StudioWorldProfileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioWorlds();
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.worlds.error.loadFailed"));
      setWorlds([]);
    } else {
      setWorlds(res.data.worlds);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const filtered = filterStudioAssetsBySearch(worlds, search, (w) => w.visualStyle);
  const userId = session.user?.id;

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("studio.worlds.deleteConfirm"))) {
      return;
    }
    setDeleteBusyId(id);
    const res = await deleteStudioWorldApi(id);
    setDeleteBusyId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.worlds.error.deleteFailed"));
      return;
    }
    void load();
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
          <Link
            href="/studio"
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.worlds.backToStudio")}
          </Link>
          <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900">{t("studio.worlds.libraryTitle")}</h1>
              <p className="mt-2 text-sm text-zinc-600">{t("studio.worlds.librarySubtitle")}</p>
            </div>
            <Link
              href="/studio/worlds/new"
              className="rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#005a45]"
            >
              {t("studio.worlds.newWorld")}
            </Link>
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("studio.worlds.searchPlaceholder")}
            className="mt-8 w-full rounded-xl border border-zinc-200 px-4 py-2.5 text-sm"
          />

          {error ? (
            <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : filtered.length === 0 ? (
            <p className="mt-8 text-sm text-zinc-500">{t("studio.worlds.emptyTitle")}</p>
          ) : (
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {filtered.map((world) => {
                const canModify = world.ownerId === userId;
                return (
                  <li key={world.id}>
                    <AppCard className="p-5">
                      <Link
                        href={`/studio/worlds/${world.id}`}
                        className="text-lg font-semibold text-zinc-900 hover:underline"
                      >
                        {world.name}
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-600">
                        {world.description || world.visualStyle || "—"}
                      </p>
                      {canModify ? (
                        <div className="mt-4 flex gap-2">
                          <Link
                            href={`/studio/worlds/${world.id}/edit`}
                            className="text-sm font-medium text-[#0067B1] hover:underline"
                          >
                            {t("studio.worlds.action.edit")}
                          </Link>
                          <button
                            type="button"
                            disabled={deleteBusyId === world.id}
                            onClick={() => void handleDelete(world.id)}
                            className="text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
                          >
                            {deleteBusyId === world.id
                              ? t("button.loading")
                              : t("studio.worlds.action.delete")}
                          </button>
                        </div>
                      ) : null}
                    </AppCard>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
