"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ClientFormattedDateTime } from "@/components/ui/client-formatted-datetime";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import { StudioAssetMemoryTab } from "@/components/studio/studio-asset-memory-tab";
import { StudioCharacterRoleBadge } from "@/components/studio/studio-character-role-badge";
import { AppCard } from "@/components/ui/app-card";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  deleteStudioCharacterApi,
  fetchStudioCharacter,
} from "@/lib/studio-characters-client";
import { StudioCharacterCanonicalOverviewPanel } from "@/components/studio/studio-character-canonical-overview-panel";
import { StudioAssetUsagePanel } from "@/components/studio/studio-asset-usage-panel";
import { parseCharacterReferencesBundle } from "@/lib/studio-character-canonical-references";
import { buildCharacterHealthView } from "@/lib/studio-character-health";
import type { StudioCharacterDetail } from "@/types/studio-api";
import type { CharacterHealthView } from "@/types/studio-character-canonical-references";

type StudioCharacterDetailViewProps = {
  characterId: string;
};

export function StudioCharacterDetailView({ characterId }: StudioCharacterDetailViewProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [character, setCharacter] = useState<StudioCharacterDetail | null>(null);
  const [health, setHealth] = useState<CharacterHealthView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<"overview" | "memory">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await fetchStudioCharacter(characterId);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.characters.error.loadFailed"));
      setCharacter(null);
      setHealth(null);
    } else {
      setCharacter(res.data.character);
      setHealth(
        res.data.health ??
          buildCharacterHealthView({
            ...res.data.character,
            storyUsage: res.data.storyUsage ?? null,
          })
      );
    }
    setLoading(false);
  }, [characterId, t]);

  useEffect(() => {
    if (!session.resolved || !session.user) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, load]);

  const canModify =
    Boolean(session.user?.id && character && character.ownerId === session.user.id);

  const handleDelete = async () => {
    if (!character || !window.confirm(t("studio.characters.deleteConfirm"))) {
      return;
    }
    setDeleting(true);
    const res = await deleteStudioCharacterApi(character.id);
    setDeleting(false);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.characters.error.deleteFailed"));
      return;
    }
    router.push("/studio/characters");
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
          <Link
            href="/studio/characters"
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.characters.backToLibrary")}
          </Link>

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : error && !character ? (
            <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : character ? (
            <>
              <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold text-zinc-900">{character.name}</h1>
                  <div className="mt-2">
                    <StudioCharacterRoleBadge role={character.role} />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {canModify ? (
                    <>
                      <Link
                        href={`/studio/characters/${character.id}/edit`}
                        className="rounded-full border border-[#0067B1]/40 px-4 py-2 text-sm font-semibold text-[#0067B1] hover:bg-[#0067B1]/5"
                      >
                        {t("studio.characters.action.edit")}
                      </Link>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deleting ? t("button.loading") : t("studio.characters.action.delete")}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                {(["overview", "memory"] as const).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                      tab === id ? "bg-[#006D52] text-white" : "border bg-white text-zinc-700"
                    }`}
                  >
                    {t(id === "memory" ? "studio.memory.tabTitle" : "studio.characters.tab.overview")}
                  </button>
                ))}
              </div>

              {tab === "memory" ? (
                <StudioAssetMemoryTab
                  kind="character"
                  worldName={character.worldProfile?.name}
                  continuityStrength={character.continuityStrength}
                  identityStrength={character.identityStrength}
                  fields={[
                    {
                      label: t("studio.memory.field.appearance"),
                      value: character.appearanceMemory,
                    },
                    {
                      label: t("studio.memory.field.personality"),
                      value: character.personalityMemory,
                    },
                    {
                      label: t("studio.memory.field.defaultClothing"),
                      value: character.defaultClothing,
                    },
                    {
                      label: t("studio.memory.field.defaultAccessories"),
                      value: character.defaultAccessories,
                    },
                    {
                      label: t("studio.memory.field.visualKeywords"),
                      value: character.visualKeywords,
                    },
                    {
                      label: t("studio.memory.field.referenceNotes"),
                      value: parseCharacterReferencesBundle(character.referenceNotes).humanNotes,
                    },
                    {
                      label: t("studio.memory.field.continuityNotes"),
                      value: character.continuityNotes,
                    },
                  ]}
                />
              ) : null}

              {tab === "overview" && character && health ? (
              <>
              <StudioCharacterCanonicalOverviewPanel character={character} health={health} />

              <AppCard className="mt-6 space-y-4 bg-white p-6">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("studio.characters.field.description")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
                    {character.description || "—"}
                  </p>
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    {t("studio.characters.field.personality")}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">
                    {character.personality || "—"}
                  </p>
                </div>
                <div className="grid gap-3 border-t border-zinc-100 pt-4 text-sm text-zinc-600 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-zinc-700">
                      {t("studio.characters.meta.created")}:{" "}
                    </span>
                    <ClientFormattedDateTime iso={character.createdAt} />
                  </p>
                  <p>
                    <span className="font-semibold text-zinc-700">
                      {t("studio.characters.meta.updated")}:{" "}
                    </span>
                    <ClientFormattedDateTime iso={character.updatedAt} />
                  </p>
                </div>
                {character.ownerEmail ? (
                  <p className="text-xs text-zinc-500">
                    {t("studio.characters.meta.owner")}: {character.ownerEmail}
                  </p>
                ) : null}
              </AppCard>
              <StudioAssetUsagePanel kind="character" assetId={character.id} assetName={character.name} />
              </>
              ) : null}
            </>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}
