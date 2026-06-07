"use client";

import { useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useOptionalUserVoiceLibrary } from "@/components/studio/studio-user-voice-library-provider";
import { StudioVoiceCloneWorkflow } from "@/components/studio/studio-voice-clone-workflow";
import { useActiveTranslator } from "@/i18n/client";
import { renameUserVoiceCloneApi } from "@/lib/studio-user-voice-library-client";
import { formatClonedVoiceProfileRef, parseVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import type { UserVoiceLibraryEntry } from "@/types/studio-user-voice-library";

type Props = {
  voiceEnabled: boolean;
  selectedProfile: string;
  characterId?: string | null;
  characterName: string;
  language: string;
  canModify: boolean;
  onSelectProfile: (profile: string, meta?: { voiceName?: string }) => void;
};

function MyVoiceRow({
  voice,
  selected,
  disabled,
  onSelect,
  onRename,
}: {
  voice: UserVoiceLibraryEntry;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
}) {
  const t = useActiveTranslator();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(voice.name);

  return (
    <article
      className={`rounded-lg border p-3 ${selected ? "border-emerald-400 bg-emerald-50" : "border-violet-100 bg-white"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {editing ?
            <input
              className="w-full rounded border border-violet-200 px-2 py-1 text-sm"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                setEditing(false);
                if (nameDraft.trim() && nameDraft.trim() !== voice.name) {
                  onRename(nameDraft.trim());
                }
              }}
            />
          : <p className="text-sm font-semibold text-violet-950">{voice.name}</p>}
          <p className="mt-0.5 text-xs text-violet-800">
            {t("studio.myVoices.usage", {
              characters: String(voice.characterCount),
              stories: String(voice.storyboardCount),
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            disabled={disabled}
            onClick={onSelect}
            className="min-h-[36px] rounded-full border border-violet-300 bg-white px-3 py-1 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            {selected ? t("studio.voiceLibrary.selected") : t("studio.myVoices.useVoice")}
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className="min-h-[36px] rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            {t("studio.myVoices.rename")}
          </button>
        </div>
      </div>
      {voice.previewUrl ?
        <div className="mt-2">
          <StudioAudioPreviewPlayer
            title={voice.name}
            audioUrl={voice.previewUrl}
            source="voice_clone"
            variant="compact"
            className="border-violet-100"
          />
        </div>
      : null}
    </article>
  );
}

export function StudioMyVoicesSection({
  voiceEnabled,
  selectedProfile,
  characterId,
  characterName,
  language,
  canModify,
  onSelectProfile,
}: Props) {
  const t = useActiveTranslator();
  const userVoices = useOptionalUserVoiceLibrary();
  const selectedRef = parseVoiceProfileRef(selectedProfile);
  const selectedCloneId = selectedRef.kind === "clone" ? selectedRef.providerVoiceId : null;

  if (!userVoices) {
    return null;
  }

  if (userVoices.loading) {
    return <p className="text-sm text-violet-700">{t("studio.myVoices.loading")}</p>;
  }

  if (userVoices.error) {
    return <p className="text-sm text-red-700">{userVoices.error}</p>;
  }

  const voices = userVoices.library?.voices ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-violet-900">
          {t("studio.myVoices.title")}
        </h3>
        <p className="mt-1 text-xs text-violet-800">{t("studio.myVoices.subtitle")}</p>
      </div>

      {canModify ?
        <StudioVoiceCloneWorkflow
          voiceNameDefault={characterName}
          language={language}
          linkCharacterId={characterId}
          canModify={canModify}
          onCloneComplete={(result) => {
            onSelectProfile(result.voiceProfileRef, { voiceName: result.clonedVoiceName });
            void userVoices.refresh();
          }}
        />
      : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {voices.map((voice) => (
          <MyVoiceRow
            key={voice.cloneId}
            voice={voice}
            selected={selectedCloneId === voice.cloneId}
            disabled={!voiceEnabled}
            onSelect={() =>
              onSelectProfile(formatClonedVoiceProfileRef(voice.cloneId), { voiceName: voice.name })
            }
            onRename={(name) => {
              void renameUserVoiceCloneApi(voice.cloneId, name).then(() => userVoices.refresh());
            }}
          />
        ))}
      </div>

      {voices.length === 0 ?
        <p className="text-xs text-violet-700">{t("studio.myVoices.empty")}</p>
      : null}
    </div>
  );
}
