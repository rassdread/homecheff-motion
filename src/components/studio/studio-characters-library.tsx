"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StudioCharacterCard } from "@/components/studio/studio-character-card";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  deleteStudioCharacterApi,
  fetchStudioCharacters,
} from "@/lib/studio-characters-client";
import type { StudioCharacterListItem } from "@/types/studio-api";

export function StudioCharactersLibrary() {
  const t = useActiveTranslator();
  const session = useAuthSession();
  const [characters, setCharacters] = useState<StudioCharacterListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioCharacters();
    if (!res.ok) {
      const msg =
        (res.data as { error?: string }).error ?? t("studio.characters.error.loadFailed");
      setError(msg);
      setCharacters([]);
    } else {
      setCharacters(res.data.characters);
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
      return characters;
    }
    return characters.filter((c) => {
      const hay = `${c.name} ${c.description} ${c.personality} ${c.role}`.toLowerCase();
      return hay.includes(q);
    });
  }, [characters, search]);

  const userId = session.user?.id;

  const handleDelete = async (id: string) => {
    if (!window.confirm(t("studio.characters.deleteConfirm"))) {
      return;
    }
    setDeleteBusyId(id);
    const res = await deleteStudioCharacterApi(id);
    setDeleteBusyId(null);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.characters.error.deleteFailed"));
      return;
    }
    setCharacters((list) => list.filter((c) => c.id !== id));
  };

  return (
    <StudioAuthGate>
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
                {t("studio.characters.libraryTitle")}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600 sm:text-base">
                {t("studio.characters.librarySubtitle")}
              </p>
            </div>
            <Link
              href="/studio/characters/new"
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
            >
              {t("studio.characters.newCharacter")}
            </Link>
          </div>

          <div className="mt-8">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("studio.characters.searchPlaceholder")}
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
                {search.trim() ? t("studio.characters.emptySearch") : t("studio.characters.emptyTitle")}
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                {search.trim()
                  ? t("studio.characters.emptySearchHint")
                  : t("studio.characters.emptyDescription")}
              </p>
              {!search.trim() ? (
                <Link
                  href="/studio/characters/new"
                  className="mt-6 inline-flex rounded-full bg-[#006D52] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  {t("studio.characters.newCharacter")}
                </Link>
              ) : null}
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((character) => (
                <StudioCharacterCard
                  key={character.id}
                  character={character}
                  onDelete={handleDelete}
                  deleteBusyId={deleteBusyId}
                  canModify={Boolean(userId && character.ownerId === userId)}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </StudioAuthGate>
  );
}
