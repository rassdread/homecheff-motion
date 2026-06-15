"use client";

import { useMemo, useState } from "react";
import { VoiceLibraryProvider, useVoiceLibrary } from "@/components/studio/studio-voice-library-provider";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { useStudioAudioChangePlan } from "@/hooks/use-studio-audio-change-plan";
import { formatLibraryVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import { resolveStudioVoiceProviderStatus } from "@/lib/studio-audio-provider-status";
import type { VoiceLibraryEntry } from "@/lib/studio-voice-library-catalog";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type InnerProps = {
  storyboardId: string;
  storyLanguage: string;
  activeScene: StudioSceneDetail | null;
  activeSceneIndex: number;
  characters: StudioCharacterListItem[];
  canModify: boolean;
};

function StudioV9VoiceLibraryPanelInner({
  storyboardId,
  storyLanguage,
  activeScene,
  activeSceneIndex,
  characters,
  canModify,
}: InnerProps) {
  const t = useActiveTranslator();
  const { payload, loading, loadingVoices, voicesReady, error } = useVoiceLibrary();
  const { enqueueChange } = useStudioAudioChangePlan(storyboardId);
  const [query, setQuery] = useState("");
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState("");

  const providerStatus = resolveStudioVoiceProviderStatus(payload?.catalog);

  const voices = useMemo(() => {
    const rows = payload?.catalog.voices ?? [];
    const q = query.trim().toLowerCase();
    if (!q) {
      return rows.slice(0, 24);
    }
    return rows
      .filter(
        (voice) =>
          voice.name.toLowerCase().includes(q) ||
          voice.accent.toLowerCase().includes(q) ||
          voice.language.toLowerCase().includes(q)
      )
      .slice(0, 24);
  }, [payload?.catalog.voices, query]);

  const selectedVoice = voices.find((v) => v.id === selectedVoiceId) ?? null;

  const enqueueVoice = (
    voice: VoiceLibraryEntry,
    applyTarget: "project" | "scene" | "character",
    characterId?: string
  ) => {
    enqueueChange({
      kind: "voice",
      title: voice.name,
      source: "user",
      applyTarget,
      sceneId: applyTarget === "scene" ? activeScene?.id : undefined,
      sceneIndex: applyTarget === "scene" ? activeSceneIndex : undefined,
      characterId,
      voiceId: voice.id,
      voiceName: voice.name,
      voiceProfile: formatLibraryVoiceProfileRef(voice.id),
      provider: "elevenlabs",
      previewUrl: voice.previewUrl,
      estimatedCostCredits: 1,
    });
  };

  return (
    <section
      className="rounded-2xl border border-violet-200 bg-violet-50/30 p-4"
      data-testid="studio-v9-voice-library-panel"
    >
      <header>
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.v9.voice.title" as never)}
        </h3>
        <p className="mt-1 text-xs text-zinc-600">{t("studio.v9.voice.hint" as never)}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {t(providerStatus.messageKey as never)}
        </p>
      </header>

      <div className="mt-3 space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("studio.v9.voice.search" as never)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
          data-testid="studio-v9-voice-search"
        />
        <textarea
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          rows={2}
          placeholder={t("studio.v9.voice.previewText" as never)}
          className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
        />
      </div>

      {loading || loadingVoices ?
        <p className="mt-3 text-xs text-zinc-500">{t("studio.v9.voice.loading" as never)}</p>
      : null}
      {error ?
        <p className="mt-3 text-xs text-red-700">{error}</p>
      : null}

      <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {voices.map((voice) => (
          <li key={voice.id}>
            <button
              type="button"
              onClick={() => setSelectedVoiceId(voice.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${
                selectedVoiceId === voice.id
                  ? "border-[#006D52] bg-[#006D52]/5"
                  : "border-zinc-200 bg-white"
              }`}
              data-testid="studio-v9-voice-row"
            >
              <span className="font-medium text-zinc-900">{voice.name}</span>
              <span className="mt-0.5 block text-xs text-zinc-500">
                {voice.language} · {voice.accent} · {voice.gender}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {selectedVoice ?
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            {t("studio.v9.voice.selectedBadge" as never)}
          </p>
          <p className="mt-1 text-sm font-medium text-zinc-900">{selectedVoice.name}</p>
          {selectedVoice.previewUrl ?
            <div className="mt-2">
              <StudioAudioPreviewPlayer
                audioUrl={selectedVoice.previewUrl}
                title={selectedVoice.name}
                source="voice_library"
              />
            </div>
          : null}
          {canModify ?
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded-lg bg-[#006D52] px-3 py-1.5 text-xs font-semibold text-white"
                onClick={() => enqueueVoice(selectedVoice, "project")}
                data-testid="studio-v9-voice-apply-project"
              >
                {t("studio.v9.voice.applyProject" as never)}
              </button>
              {activeScene ?
                <button
                  type="button"
                  className="rounded-lg border border-[#006D52]/40 px-3 py-1.5 text-xs font-semibold text-[#006D52]"
                  onClick={() => enqueueVoice(selectedVoice, "scene")}
                >
                  {t("studio.v9.voice.applyScene" as never)}
                </button>
              : null}
              {characters.slice(0, 3).map((character) => (
                <button
                  key={character.id}
                  type="button"
                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700"
                  onClick={() => enqueueVoice(selectedVoice, "character", character.id)}
                >
                  {t("studio.v9.voice.applyCharacter" as never, { name: character.name })}
                </button>
              ))}
            </div>
          : null}
        </div>
      : null}

      {!voicesReady && !loading ?
        <p className="mt-2 text-xs text-zinc-500">{t("studio.v9.voice.catalogLoading" as never)}</p>
      : null}
      <p className="mt-2 text-[11px] text-zinc-500">
        {t("studio.v9.voice.languageHint" as never, { language: storyLanguage })}
      </p>
    </section>
  );
}

type Props = InnerProps;

export function StudioV9VoiceLibraryPanel(props: Props) {
  return (
    <VoiceLibraryProvider>
      <StudioV9VoiceLibraryPanelInner {...props} />
    </VoiceLibraryProvider>
  );
}
