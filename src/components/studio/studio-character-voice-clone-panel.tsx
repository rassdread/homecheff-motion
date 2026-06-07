"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import { cloneCharacterVoiceApi } from "@/lib/studio-characters-client";
import { requestCharacterVoicePreview } from "@/lib/studio-character-voice-preview-client";
import {
  createAudioFileObjectUrl,
  revokeAudioFileObjectUrl,
} from "@/lib/studio-audio-preview-object-url";
import { isClonedVoiceProfileRef } from "@/lib/studio-voice-profile-ref";
import type { StudioCharacterListItem } from "@/types/studio-api";

type Props = {
  character: StudioCharacterListItem;
  language: string;
  canModify: boolean;
  onCharacterUpdated: (character: StudioCharacterListItem) => void;
  onHistoryRefresh?: () => void;
};

export function StudioCharacterVoiceClonePanel({
  character,
  language,
  canModify,
  onCharacterUpdated,
  onHistoryRefresh,
}: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [voiceName, setVoiceName] = useState(character.name);
  const [consent, setConsent] = useState(false);
  const [voiceLock, setVoiceLock] = useState(character.voiceLock);
  const [busy, setBusy] = useState(false);
  const [resultPreviewBusy, setResultPreviewBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cloneResult, setCloneResult] = useState<{
    clonedVoiceName: string;
    provider: string;
    voiceProfileRef: string;
  } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
  const [sampleFileName, setSampleFileName] = useState<string | null>(null);

  const hasClone = isClonedVoiceProfileRef(character.voiceProfile);

  useEffect(() => {
    return () => {
      revokeAudioFileObjectUrl(samplePreviewUrl);
    };
  }, [samplePreviewUrl]);

  const handleSampleChange = (file: File | null) => {
    revokeAudioFileObjectUrl(samplePreviewUrl);
    setCloneResult(null);
    setPreviewUrl(null);
    setSuccess("");
    if (!file) {
      setSamplePreviewUrl(null);
      setSampleFileName(null);
      return;
    }
    setSamplePreviewUrl(createAudioFileObjectUrl(file));
    setSampleFileName(file.name.replace(/\.[^.]+$/, "") || file.name);
  };

  const runResultPreview = useCallback(async () => {
    setResultPreviewBusy(true);
    setError("");
    try {
      const result = await requestCharacterVoicePreview({
        characterId: character.id,
        characterName: character.name,
        voiceProfile: character.voiceProfile,
        language: language.slice(0, 2),
      });
      setPreviewUrl(result.audioUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.voiceCenter.previewFailed"));
    } finally {
      setResultPreviewBusy(false);
    }
  }, [character.id, character.name, character.voiceProfile, language, t]);

  const handleClone = useCallback(async () => {
    const file = fileRef.current?.files?.[0];
    if (!canModify || !file) {
      setError(t("studio.voiceClone.sampleRequired"));
      return;
    }
    if (!consent) {
      setError(t("studio.voiceClone.consentRequired"));
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    setPreviewUrl(null);
    setCloneResult(null);
    try {
      const res = await cloneCharacterVoiceApi(character.id, {
        sample: file,
        voiceName,
        consentConfirmed: true,
        voiceLock,
        language,
      });
      if (!res.ok || !res.data.ok) {
        setError(res.data.error ?? t("studio.voiceClone.errorGeneric"));
        return;
      }
      onCharacterUpdated(res.data.character);
      onHistoryRefresh?.();
      setCloneResult({
        clonedVoiceName: res.data.clonedVoiceName ?? voiceName,
        provider: res.data.provider ?? "elevenlabs",
        voiceProfileRef: res.data.voiceProfileRef ?? res.data.character.voiceProfile,
      });
      setSuccess(t("studio.voiceClone.linkedToCharacter"));
      if (res.data.previewAudioUrl) {
        setPreviewUrl(res.data.previewAudioUrl);
      }
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      revokeAudioFileObjectUrl(samplePreviewUrl);
      setSamplePreviewUrl(null);
      setSampleFileName(null);
    } finally {
      setBusy(false);
    }
  }, [
    canModify,
    character.id,
    consent,
    language,
    onCharacterUpdated,
    onHistoryRefresh,
    samplePreviewUrl,
    t,
    voiceLock,
    voiceName,
  ]);

  const hasSample = Boolean(samplePreviewUrl);

  return (
    <section className="mt-4 rounded-xl border border-violet-200/80 bg-violet-50/40 p-4">
      <h4 className="text-sm font-semibold text-violet-950">{t("studio.voiceClone.title")}</h4>
      <p className="mt-1 text-xs text-violet-900/80">{t("studio.voiceClone.hint")}</p>

      {hasClone && character.voiceDescription ?
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          {t("studio.voiceClone.currentClonedVoice")}: {character.voiceDescription}
        </p>
      : null}

      <label className="mt-3 block text-xs font-medium text-violet-950">
        {t("studio.voiceClone.voiceNameLabel")}
        <input
          type="text"
          value={voiceName}
          disabled={!canModify || busy}
          onChange={(e) => setVoiceName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm"
        />
      </label>

      <label className="mt-3 block text-xs font-medium text-violet-950">
        {t("studio.voiceClone.uploadSample")}
        <input
          ref={fileRef}
          type="file"
          accept=".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/mp4,audio/x-m4a"
          disabled={!canModify || busy}
          className="mt-1 block w-full text-sm"
          onChange={(e) => {
            handleSampleChange(e.target.files?.[0] ?? null);
          }}
        />
      </label>

      {hasSample ?
        <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
          <p className="text-xs font-semibold text-violet-950">{t("studio.voiceClone.samplePreviewTitle")}</p>
          <p className="mt-1 text-[11px] text-violet-800">{t("studio.voiceClone.samplePreviewHint")}</p>
          <StudioAudioPreviewPlayer
            title={sampleFileName ?? voiceName}
            audioUrl={samplePreviewUrl!}
            source="voice_clone_sample"
            variant="compact"
            className="mt-3 border-violet-200/80"
          />
        </div>
      : null}

      <label className="mt-3 flex items-start gap-2 text-xs text-violet-950">
        <input
          type="checkbox"
          checked={consent}
          disabled={!canModify || busy}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5"
        />
        <span>{t("studio.voiceClone.consentLabel")}</span>
      </label>

      <label className="mt-2 flex items-center gap-2 text-xs text-violet-950">
        <input
          type="checkbox"
          checked={voiceLock}
          disabled={!canModify || busy}
          onChange={(e) => setVoiceLock(e.target.checked)}
        />
        <span>{t("studio.voiceIdentity.lockVoice")}</span>
      </label>

      {error ?
        <p className="mt-3 text-xs text-red-700">{error}</p>
      : null}
      {success ?
        <p className="mt-3 text-xs text-emerald-800">{success}</p>
      : null}

      {cloneResult ?
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/80 p-3">
          <p className="text-xs font-semibold text-emerald-950">{t("studio.voiceClone.resultTitle")}</p>
          <dl className="mt-2 space-y-1 text-xs text-emerald-900">
            <div className="flex flex-wrap gap-1">
              <dt className="font-medium">{t("studio.voiceClone.resultName")}:</dt>
              <dd>{cloneResult.clonedVoiceName}</dd>
            </div>
            <div className="flex flex-wrap gap-1">
              <dt className="font-medium">{t("studio.voiceClone.resultProvider")}:</dt>
              <dd>{cloneResult.provider}</dd>
            </div>
          </dl>
          <button
            type="button"
            disabled={resultPreviewBusy}
            onClick={() => void runResultPreview()}
            className="mt-3 rounded-full border border-emerald-400 bg-white px-4 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
          >
            {resultPreviewBusy ? t("button.loading") : t("studio.voiceClone.resultPreview")}
          </button>
        </div>
      : null}

      {previewUrl ?
        <StudioAudioPreviewPlayer
          title={cloneResult?.clonedVoiceName ?? voiceName}
          audioUrl={previewUrl}
          source="voice_clone"
          variant="compact"
          className="mt-3 border-violet-200/80"
        />
      : null}

      {canModify ?
        <button
          type="button"
          disabled={busy || !consent || !hasSample}
          onClick={() => void handleClone()}
          className="mt-4 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? t("studio.voiceClone.cloning") : t("studio.voiceClone.action")}
        </button>
      : null}
    </section>
  );
}
