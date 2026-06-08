"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StudioAudioPreviewPlayer } from "@/components/studio/studio-audio-preview-player";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  createAudioFileObjectUrl,
  revokeAudioFileObjectUrl,
} from "@/lib/studio-audio-preview-object-url";
import { createUserVoiceCloneApi } from "@/lib/studio-user-voice-library-client";
import {
  analyzeCloneSampleDuration,
  formatCloneDurationLabel,
  qualityMeterBlocks,
  type CloneSampleQualityAnalysis,
} from "@/lib/studio-voice-clone-quality";
import {
  CLONE_SAMPLE_SCRIPT_BODY_KEYS,
  CLONE_SAMPLE_SCRIPT_DURATION_KEYS,
  CLONE_SAMPLE_SCRIPT_LABEL_KEYS,
  CLONE_SAMPLE_SCRIPT_LENGTHS,
  type CloneSampleScriptLength,
} from "@/lib/studio-voice-clone-sample-scripts";

const RECORDING_COACH_KEYS = [
  "studio.voiceClone.coach.quietRoom",
  "studio.voiceClone.coach.noMusic",
  "studio.voiceClone.coach.noEcho",
  "studio.voiceClone.coach.naturalVoice",
  "studio.voiceClone.coach.minDuration",
  "studio.voiceClone.coach.idealDuration",
] as const;

type Props = {
  voiceNameDefault: string;
  language: string;
  linkCharacterId?: string | null;
  canModify: boolean;
  onCloneComplete: (result: {
    voiceProfileRef: string;
    clonedVoiceName: string;
    previewAudioUrl?: string | null;
  }) => void;
};

function readAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => resolve(Number.isFinite(audio.duration) ? audio.duration : 0);
    audio.onerror = () => resolve(0);
    audio.src = url;
  });
}

export function StudioVoiceCloneWorkflow({
  voiceNameDefault,
  language,
  linkCharacterId,
  canModify,
  onCloneComplete,
}: Props) {
  const t = useActiveTranslator();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<Blob[]>([]);

  const [voiceName, setVoiceName] = useState(voiceNameDefault);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");
  const [sampleFile, setSampleFile] = useState<File | null>(null);
  const [samplePreviewUrl, setSamplePreviewUrl] = useState<string | null>(null);
  const [clonePreviewUrl, setClonePreviewUrl] = useState<string | null>(null);
  const [scriptLength, setScriptLength] = useState<CloneSampleScriptLength>("normal");
  const [sampleDurationSeconds, setSampleDurationSeconds] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      revokeAudioFileObjectUrl(samplePreviewUrl);
    };
  }, [samplePreviewUrl]);

  useEffect(() => {
    if (!samplePreviewUrl) {
      return;
    }
    let cancelled = false;
    void readAudioDuration(samplePreviewUrl).then((duration) => {
      if (!cancelled) {
        setSampleDurationSeconds(duration);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [samplePreviewUrl]);

  const qualityAnalysis = useMemo((): CloneSampleQualityAnalysis | null => {
    if (sampleDurationSeconds == null) {
      return null;
    }
    return analyzeCloneSampleDuration(sampleDurationSeconds);
  }, [sampleDurationSeconds]);

  const setSample = (file: File | null) => {
    revokeAudioFileObjectUrl(samplePreviewUrl);
    setSampleFile(file);
    setClonePreviewUrl(null);
    setSampleDurationSeconds(null);
    if (!file) {
      setSamplePreviewUrl(null);
      return;
    }
    setSamplePreviewUrl(createAudioFileObjectUrl(file));
  };

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordChunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `${voiceName.trim() || "recording"}.webm`, {
          type: blob.type || "audio/webm",
        });
        setSample(file);
        setRecording(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setError(t("studio.myVoices.recordFailed"));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const runClone = useCallback(async () => {
    if (!canModify || !sampleFile) {
      setError(t("studio.voiceClone.sampleRequired"));
      return;
    }
    if (!consent) {
      setError(t("studio.voiceClone.consentRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await createUserVoiceCloneApi({
        sample: sampleFile,
        voiceName,
        consentConfirmed: consent,
        language,
        linkCharacterId: linkCharacterId ?? undefined,
      });
      if (!result.ok || !result.voiceProfileRef) {
        setError(result.error ?? t("studio.voiceClone.errorGeneric"));
        return;
      }
      if (result.previewAudioUrl) {
        setClonePreviewUrl(result.previewAudioUrl);
      }
      onCloneComplete({
        voiceProfileRef: result.voiceProfileRef,
        clonedVoiceName: result.clonedVoiceName ?? voiceName,
        previewAudioUrl: result.previewAudioUrl,
      });
    } finally {
      setBusy(false);
    }
  }, [canModify, consent, language, linkCharacterId, onCloneComplete, sampleFile, t, voiceName]);

  return (
    <section className="rounded-xl border border-violet-200 bg-white p-4">
      <div className="rounded-xl border border-sky-100 bg-sky-50/80 p-4">
        <h4 className="text-sm font-semibold text-sky-950">{t("studio.voiceClone.coach.title")}</h4>
        <p className="mt-1 text-xs text-sky-900">{t("studio.voiceClone.coach.subtitle")}</p>
        <ul className="mt-3 space-y-1.5 text-xs text-sky-900">
          {RECORDING_COACH_KEYS.map((key) => (
            <li key={key} className="flex gap-2">
              <span className="text-emerald-600">✓</span>
              <span>{t(key as TranslationKey)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-violet-950">{t("studio.voiceClone.script.title")}</h4>
        <p className="mt-1 text-xs text-violet-800">{t("studio.voiceClone.script.subtitle")}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CLONE_SAMPLE_SCRIPT_LENGTHS.map((length) => (
            <button
              key={length}
              type="button"
              onClick={() => setScriptLength(length)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                scriptLength === length
                  ? "border-violet-500 bg-violet-100 text-violet-950"
                  : "border-violet-200 bg-white text-violet-800 hover:bg-violet-50"
              }`}
            >
              {t(CLONE_SAMPLE_SCRIPT_LABEL_KEYS[length] as TranslationKey)}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] font-medium text-violet-700">
          {t(CLONE_SAMPLE_SCRIPT_DURATION_KEYS[scriptLength] as TranslationKey)}
        </p>
        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50/50 p-3 text-xs leading-relaxed text-violet-950 whitespace-pre-wrap">
          {t(CLONE_SAMPLE_SCRIPT_BODY_KEYS[scriptLength] as TranslationKey)}
        </div>
      </div>

      <h4 className="mt-5 text-sm font-semibold text-violet-950">{t("studio.myVoices.newVoice")}</h4>
      <p className="mt-1 text-xs text-violet-800">{t("studio.myVoices.newVoiceHint")}</p>

      <label className="mt-3 block text-xs font-medium text-violet-950">
        {t("studio.voiceClone.voiceNameLabel")}
        <input
          type="text"
          value={voiceName}
          disabled={!canModify || busy}
          onChange={(e) => setVoiceName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-violet-200 px-3 py-2 text-sm"
        />
      </label>

      <div className="mt-3 flex flex-wrap gap-2">
        <label className="inline-flex min-h-[40px] cursor-pointer items-center rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50">
          {t("studio.voiceClone.uploadSample")}
          <input
            ref={fileRef}
            type="file"
            accept=".mp3,.wav,.m4a,.webm,audio/*"
            disabled={!canModify || busy || recording}
            className="hidden"
            onChange={(e) => setSample(e.target.files?.[0] ?? null)}
          />
        </label>
        {!recording ?
          <button
            type="button"
            disabled={!canModify || busy}
            onClick={() => void startRecording()}
            className="min-h-[40px] rounded-full border border-violet-300 bg-white px-4 py-2 text-xs font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
          >
            {t("studio.myVoices.record")}
          </button>
        : <button
            type="button"
            onClick={stopRecording}
            className="min-h-[40px] rounded-full border border-red-300 bg-red-50 px-4 py-2 text-xs font-semibold text-red-900"
          >
            {t("studio.myVoices.stopRecord")}
          </button>
        }
      </div>

      {samplePreviewUrl ?
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-violet-950">{t("studio.myVoices.samplePreview")}</p>
          <StudioAudioPreviewPlayer
            title={voiceName}
            audioUrl={samplePreviewUrl}
            source="voice_clone_sample"
            variant="compact"
            className="border-violet-100"
          />
          {qualityAnalysis ?
            <div className="rounded-lg border border-violet-100 bg-violet-50/60 p-3">
              <p className="text-xs font-semibold text-violet-950">
                {t("studio.voiceClone.quality.title")}
              </p>
              <p className="mt-1 text-xs text-violet-800">
                {t("studio.voiceClone.quality.duration", {
                  duration: formatCloneDurationLabel(qualityAnalysis.durationSeconds),
                })}
              </p>
              <p className="mt-1 font-mono text-sm tracking-wider text-violet-900">
                {qualityMeterBlocks(qualityAnalysis.filledBlocks)}{" "}
                <span className="font-sans text-xs font-semibold">
                  {t(qualityAnalysis.labelKey as TranslationKey)}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-violet-700">
                {t(qualityAnalysis.hintKey as TranslationKey)}
              </p>
            </div>
          : null}
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

      {error ?
        <p className="mt-2 text-xs text-red-700">{error}</p>
      : null}

      {canModify ?
        <button
          type="button"
          disabled={busy || !consent || !sampleFile}
          onClick={() => void runClone()}
          className="mt-4 rounded-full bg-violet-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? t("studio.voiceClone.cloning") : t("studio.myVoices.saveToLibrary")}
        </button>
      : null}

      {clonePreviewUrl ?
        <div className="mt-3">
          <p className="text-xs font-semibold text-emerald-900">{t("studio.myVoices.clonePreview")}</p>
          <StudioAudioPreviewPlayer
            title={voiceName}
            audioUrl={clonePreviewUrl}
            source="voice_clone"
            variant="compact"
            className="mt-2 border-emerald-100"
          />
        </div>
      : null}
    </section>
  );
}
