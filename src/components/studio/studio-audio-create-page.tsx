"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { StudioV9MusicPanel } from "@/components/studio/studio-v9-music-panel";
import { StudioV9SoundEffectsPanel } from "@/components/studio/studio-v9-sound-effects-panel";
import { useActiveTranslator } from "@/i18n/client";
import { previewStudioAiHomeCredits } from "@/lib/studio-ai-home-client";
import { buildVoiceRequest, validateVoiceSettings } from "@/lib/elevenlabs-voice";
import {
  STUDIO_NARRATION_MODES,
  STUDIO_VOICE_PROFILE_IDS,
  getVoiceProfilePreset,
} from "@/lib/studio-voice-profiles";
import { VOICE_GENERATION_DISPLAY_CREDITS } from "@/lib/studio-credit-constants";
import { safeStudioProjectReturnTo } from "@/lib/studio-return-to";

type AudioMode = "voice" | "music" | "sfx";

function readMode(value: string | null): AudioMode {
  if (value === "voice" || value === "sfx") return value;
  return "music";
}

function StudioAudioCreateBody() {
  const t = useActiveTranslator();
  const params = useSearchParams();
  const mode = readMode(params.get("mode"));
  const idea = params.get("idea")?.trim() ?? "";
  const storyboardId = params.get("storyboardId")?.trim() ?? "";
  const sceneId = params.get("scene")?.trim() ?? "";
  const returnTo = safeStudioProjectReturnTo(params.get("returnTo"));
  const [script, setScript] = useState(idea);
  const [language, setLanguage] = useState("nl");
  const [profile, setProfile] = useState<(typeof STUDIO_VOICE_PROFILE_IDS)[number]>("warm_narrator");
  const [narrationMode, setNarrationMode] = useState<(typeof STUDIO_NARRATION_MODES)[number]>("narrator");
  const [quote, setQuote] = useState<string>("");

  const actionType =
    mode === "voice" ? "voice_generation" : mode === "sfx" ? "sfx_generation" : "music_generation";
  const titleKey =
    mode === "voice"
      ? "studio.v27.audio.title.voice"
      : mode === "sfx"
        ? "studio.v27.audio.title.sfx"
        : "studio.v27.audio.title.music";
  const libraryHref = mode === "voice" ? "/studio/assets/media/voices" : "/studio/assets/media/audio";
  const workspaceTool = mode === "voice" ? "voice" : mode === "sfx" ? "sound" : "music";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await previewStudioAiHomeCredits(actionType);
      if (cancelled) return;
      if (res.ok && res.preview) {
        setQuote(
          `${res.preview.requiredCredits} HC · ${res.preview.confirmationRequired ? "confirmation" : "ready"}`,
        );
        return;
      }
      setQuote("");
    })();
    return () => {
      cancelled = true;
    };
  }, [actionType]);

  const voiceRequest = useMemo(() => {
    if (mode !== "voice") return null;
    const validation = validateVoiceSettings({
      voiceEnabled: true,
      voiceLanguage: language,
      voiceProfile: profile,
      narrationMode,
      script,
    });
    if (!validation.ok) return { error: validation.message, request: null };
    return {
      error: null,
      request: buildVoiceRequest({
        script,
        voiceProfile: profile,
        voiceLanguage: language,
        narrationMode,
        preset: getVoiceProfilePreset(profile),
      }),
    };
  }, [language, mode, narrationMode, profile, script]);

  const workspaceHref = storyboardId
    ? `/studio?${new URLSearchParams({
        storyboardId,
        tool: workspaceTool,
        ...(sceneId ? { scene: sceneId } : {}),
        ...(idea ? { idea } : {}),
      }).toString()}`
    : null;

  return (
    <main className="mx-auto my-6 w-full max-w-3xl rounded-3xl bg-white px-4 py-8 text-zinc-900 shadow-sm lg:max-w-5xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
        <p className="mt-2 text-sm text-zinc-700" data-testid="studio-v27-audio-paid-note">
          {t("studio.v27.audio.paidStops")}
        </p>
        <p className="mt-2 text-sm text-zinc-800" data-testid="studio-v27-audio-quote">
          {t("studio.v27.audio.quote")}:{" "}
          {quote ||
            (mode === "voice"
              ? `${VOICE_GENERATION_DISPLAY_CREDITS} HC`
              : t("studio.v27.audio.quotePending"))}
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
        {returnTo ? (
          <Link
            href={returnTo}
            className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900"
          >
            {t("studio.v27.audio.back")}
          </Link>
        ) : null}
        {workspaceHref ? (
          <Link
            href={workspaceHref}
            className="inline-flex min-h-11 items-center rounded-full bg-[#054b39] px-3 text-sm font-semibold text-white"
            data-testid="studio-v27-audio-workspace"
          >
            {t("studio.v27.audio.openWorkspace")}
          </Link>
        ) : null}
        <Link
          href={libraryHref}
          className="inline-flex min-h-11 items-center rounded-full border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-900"
        >
          {t("studio.v27.audio.library")}
        </Link>
      </div>

      {mode === "voice" ? (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4" data-testid="studio-v27-voice-form">
          <p className="text-sm text-zinc-700">{t("studio.v27.audio.voiceNeedsStoryboard")}</p>
          <label className="mt-3 block text-sm font-semibold text-zinc-900">
            {t("studio.v27.audio.script")}
            <textarea
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={5}
              className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              data-testid="studio-v27-voice-script"
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-semibold text-zinc-900">
              {t("studio.voice.preview.language")}
              <select
                value={language}
                onChange={(event) => setLanguage(event.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {["nl", "en", "es", "fr"].map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-zinc-900">
              {t("studio.voice.preview.profile")}
              <select
                value={profile}
                onChange={(event) => setProfile(event.target.value as (typeof STUDIO_VOICE_PROFILE_IDS)[number])}
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {STUDIO_VOICE_PROFILE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-semibold text-zinc-900">
              Narration
              <select
                value={narrationMode}
                onChange={(event) =>
                  setNarrationMode(event.target.value as (typeof STUDIO_NARRATION_MODES)[number])
                }
                className="mt-1 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
              >
                {STUDIO_NARRATION_MODES.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {voiceRequest?.request ? (
            <dl className="mt-4 grid gap-1 text-xs text-zinc-800 sm:grid-cols-2" data-testid="studio-v27-voice-request">
              <div>model: {voiceRequest.request.model_id}</div>
              <div>language: {voiceRequest.request.language_code}</div>
              <div>profile: {voiceRequest.request.metadata.voiceProfile}</div>
              <div>characters: {voiceRequest.request.metadata.estimatedCharacters}</div>
            </dl>
          ) : (
            <p className="mt-3 text-sm text-red-800">{voiceRequest?.error}</p>
          )}
        </section>
      ) : null}

      {mode === "music" ? (
        <StudioV9MusicPanel
          storyboardId={storyboardId}
          activeSceneId={sceneId || undefined}
          canModify
          initialPrompt={idea}
        />
      ) : null}

      {mode === "sfx" ? (
        <StudioV9SoundEffectsPanel
          storyboardId={storyboardId}
          activeSceneId={sceneId || undefined}
          canModify
          initialPrompt={idea}
        />
      ) : null}
    </main>
  );
}

export function StudioAudioCreatePage() {
  return (
    <Suspense fallback={null}>
      <StudioAudioCreateBody />
    </Suspense>
  );
}
