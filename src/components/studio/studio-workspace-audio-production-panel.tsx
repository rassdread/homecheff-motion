"use client";

import { useMemo } from "react";
import { StudioVoicePreviewPanel } from "@/components/studio/studio-voice-preview-panel";
import { useActiveTranslator } from "@/i18n/client";
import { collectStoryboardCharacters } from "@/lib/studio-character-voice";
import { analyzeVoiceDirector } from "@/lib/studio-voice-director";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem, StudioStoryboardDetail } from "@/types/studio-api";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  canModify: boolean;
  onStoryboardUpdated?: (storyboard: StudioStoryboardDetail) => void;
};

export function StudioWorkspaceAudioProductionPanel({
  storyboard,
  characters,
  canModify,
}: Props) {
  const t = useActiveTranslator();
  const storyLanguage = (storyboard.voiceLanguage ?? "en").slice(0, 2);
  const voiceEnabled = Boolean(storyboard.voiceEnabled);

  const storyCharacters = useMemo(() => {
    const fromStory = collectStoryboardCharacters(storyboard);
    return fromStory.map((c) => characters.find((lib) => lib.id === c.id) ?? c);
  }, [storyboard, characters]);

  const speakerRows = useMemo(() => {
    return storyCharacters
      .filter((c) => c.voiceEnabled)
      .map((character) => {
        const identity = resolveCharacterVoiceIdentity({
          character,
          language: storyLanguage,
          attemptedOverrideProfile: storyboard.voiceProfile,
        });
        return {
          id: character.id,
          name: character.name,
          label: t(getVoiceProfilePreset(identity.voiceProfile).labelKey as never),
          locked: identity.voiceLock,
        };
      });
  }, [storyCharacters, storyLanguage, storyboard.voiceProfile, t]);

  const voiceReport = useMemo(() => analyzeVoiceDirector(storyboard), [storyboard]);
  const hasNarrationScript = Boolean(storyboard.voiceNarrationScript?.trim());
  const speakerCount = speakerRows.length + (voiceEnabled ? 1 : 0);

  return (
    <section className="rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm">
      <h3 className="text-base font-bold text-emerald-950">{t("studio.voiceIdentity.audioForStory")}</h3>
      <p className="mt-1 text-xs text-emerald-900/80">{t("studio.voiceIdentity.audioForStoryHint")}</p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {t("studio.voiceIdentity.speakers")}
          </dt>
          <dd className="mt-1 text-lg font-bold text-zinc-900">{speakerCount}</dd>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {t("studio.voiceIdentity.narrationStatus")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {voiceEnabled
              ? hasNarrationScript
                ? t("studio.voiceIdentity.narrationReady")
                : t("studio.voiceIdentity.narrationNeedsScript")
              : t("studio.voiceIdentity.narrationOff")}
          </dd>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white/90 px-3 py-2 sm:col-span-2">
          <dt className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
            {t("studio.voiceIdentity.subtitleStatus")}
          </dt>
          <dd className="mt-1 text-sm font-medium text-zinc-900">
            {voiceEnabled
              ? t("studio.voiceIdentity.subtitlesAvailable")
              : t("studio.voiceIdentity.subtitlesNeedVoice")}
          </dd>
        </div>
      </dl>

      {speakerRows.length > 0 ?
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">
            {t("studio.voiceIdentity.activeVoices")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {speakerRows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-sm"
              >
                <span className="font-medium text-zinc-900">{row.name}</span>
                <span className="text-xs text-emerald-900">
                  {row.label}
                  {row.locked ? ` · ${t("studio.voiceCenter.lockedShort")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      : null}

      {voiceEnabled ?
        <div className="mt-4 rounded-xl border border-emerald-100 bg-white p-3">
          <p className="text-xs font-semibold text-zinc-800">{t("studio.voiceIdentity.storyNarration")}</p>
          <p className="mt-1 text-xs text-zinc-600">
            {t(getVoiceProfilePreset(storyboard.voiceProfile ?? "warm_narrator").labelKey as never)} ·{" "}
            {t("studio.voice.score", { score: voiceReport.voiceScore })}
          </p>
          <StudioVoicePreviewPanel
            storyboardId={storyboard.id}
            enabled={voiceEnabled}
            language={storyLanguage}
            voiceProfile={storyboard.voiceProfile ?? "warm_narrator"}
            canModify={canModify}
          />
        </div>
      : null}
    </section>
  );
}
