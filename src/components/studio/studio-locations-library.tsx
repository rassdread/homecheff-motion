"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioLocationCard } from "@/components/studio/studio-location-card";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  deleteStudioLocationApi,
  fetchStudioLocations,
} from "@/lib/studio-locations-client";
import type { StudioLocationListItem } from "@/types/studio-api";

export function StudioLocationsLibrary() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [locations, setLocations] = useState<StudioLocationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioLocations();
    if (!res.ok) {
      const msg =
        (res.data as { error?: string }).error ?? t("studio.locations.error.loadFailed");
      setError(msg);
      setLocations([]);
    } else {
      setLocations(res.data.locations);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return locations;
    }
    return locations.filter((loc) => {
      const hay = `${loc.name} ${loc.description} ${loc.category}`.toLowerCase();
      return hay.includes(q);
    });
  }, [locations, search]);

  const userId = session.user?.id;

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("studio.locations.deleteConfirm"))) {
      return;
    }
    setDeleteBusyId(id);
    const res = await deleteStudioLocationApi(id);
    setDeleteBusyId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.locations.error.deleteFailed"));
      return;
    }
    setLocations((list) => list.filter((l) => l.id !== id));
  };

  return (
    <StudioAuthGate
      authTitleKey="studio.locations.authRequiredTitle"
      authBodyKey="studio.locations.authRequiredBody"
    >
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto flex w-full max-w-6xl flex-col px-6 py-12 sm:px-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Link
                href="/studio"
                className="text-sm font-medium text-[#006D52] hover:underline"
              >
                ← {t("studio.placeholder.back")}
              </Link>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
                {t("studio.locations.libraryTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">
                {t("studio.locations.librarySubtitle")}
              </p>
            </div>
            <Link
              href="/studio/locations/new"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("studio.locations.newLocation")}
            </Link>
          </div>

          <div className="mt-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("studio.locations.searchPlaceholder")}
              className="w-full max-w-md rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm shadow-sm"
            />
          </div>

          {error ? (
            <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {loading ? (
            <p className="mt-10 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : filtered.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-zinc-200 bg-white/80 px-8 py-14 text-center">
              <h2 className="text-lg font-semibold text-zinc-900">
                {search.trim() ? t("studio.locations.emptySearch") : t("studio.locations.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                {search.trim()
                  ? t("studio.locations.emptySearchHint")
                  : t("studio.locations.emptyDescription")}
              </p>
              {!search.trim() ? (
                <Link
                  href="/studio/locations/new"
                  className="mt-6 inline-flex rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("studio.locations.newLocation")}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((location) => (
                <StudioLocationCard
                  key={location.id}
                  location={location}
                  onDelete={handleDelete}
                  deleteBusyId={deleteBusyId}
                  canModify={Boolean(userId && location.ownerId === userId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
