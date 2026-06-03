"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { StudioAuthGate } from "@/components/studio/studio-auth-gate";
import {
  StudioCharacterForm,
  type StudioCharacterFormValues,
} from "@/components/studio/studio-character-form";
import { useActiveTranslator } from "@/i18n/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { brand } from "@/lib/brand";
import {
  fetchStudioCharacter,
  updateStudioCharacterApi,
} from "@/lib/studio-characters-client";
import type { StudioCharacterDetail } from "@/types/studio-api";

export default function StudioCharacterEditPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const [character, setCharacter] = useState<StudioCharacterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setLoading(true);
    const res = await fetchStudioCharacter(id);
    if (!res.ok) {
      setError((res.data as { error?: string }).error ?? t("studio.characters.error.loadFailed"));
      setCharacter(null);
    } else {
      setCharacter(res.data.character);
    }
    setLoading(false);
  }, [id, t]);

  useEffect(() => {
    if (!session.resolved || !session.user || !id) {
      return;
    }
    queueMicrotask(() => {
      void load();
    });
  }, [session.resolved, session.user, id, load]);

  const canModify =
    Boolean(session.user?.id && character && character.ownerId === session.user.id);

  const handleSubmit = async (values: StudioCharacterFormValues) => {
    const res = await updateStudioCharacterApi(id, {
      name: values.name,
      role: values.role,
      description: values.description,
      personality: values.personality,
      ...(values.referenceImageUrl !== character?.referenceImageUrl
        ? {
            referenceImageUrl: values.referenceImageUrl,
            referenceStorageKey: values.referenceStorageKey,
          }
        : {}),
    });
    if (!res.ok) {
      throw new Error((res.data as { error?: string }).error ?? t("studio.characters.error.saveFailed"));
    }
    router.push(`/studio/characters/${id}`);
  };

  return (
    <StudioAuthGate>
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <section className="mx-auto w-full max-w-2xl px-6 py-12 sm:px-10">
          <Link
            href={`/studio/characters/${id}`}
            className="text-sm font-medium text-[#006D52] hover:underline"
          >
            ← {t("studio.characters.backToCharacter")}
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-zinc-900">{t("studio.characters.editTitle")}</h1>

          {loading ? (
            <p className="mt-8 text-sm text-zinc-500">{t("button.loading")}</p>
          ) : error ? (
            <p className="mt-8 text-sm text-red-700">{error}</p>
          ) : !canModify ? (
            <p className="mt-8 text-sm text-red-700">{t("studio.characters.error.forbidden")}</p>
          ) : character ? (
            <div className="mt-8">
              <StudioCharacterForm
                mode="edit"
                initial={character}
                submitLabel={t("studio.characters.saveChanges")}
                backHref={`/studio/characters/${id}`}
                onSubmit={handleSubmit}
              />
            </div>
          ) : null}
        </section>
      </main>
    </StudioAuthGate>
  );
}
