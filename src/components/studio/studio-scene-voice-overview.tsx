"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import { resolveCharacterVoiceIdentity } from "@/lib/studio-voice-identity-resolver";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scene: StudioSceneDetail;
  characters: StudioCharacterListItem[];
  storyLanguage: string;
  storyVoiceProfile?: string | null;
};

export function StudioSceneVoiceOverview({
  scene,
  characters,
  storyLanguage,
  storyVoiceProfile,
}: Props) {
  const t = useActiveTranslator();

  const rows = useMemo(() => {
    return scene.characters.map((link) => {
      const character = characters.find((c) => c.id === link.id) ?? link;
      const identity = resolveCharacterVoiceIdentity({
        character,
        language: storyLanguage,
        attemptedOverrideProfile: storyVoiceProfile,
      });
      const label =
        identity.voiceEnabled
          ? t(getVoiceProfilePreset(identity.voiceProfile).labelKey as never)
          : t("studio.voiceIdentity.noVoice");
      return {
        id: character.id,
        name: character.name,
        label,
        locked: identity.voiceLock,
        source: identity.source,
      };
    });
  }, [scene.characters, characters, storyLanguage, storyVoiceProfile, t]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-[#0067B1]/15 bg-[#0067B1]/5 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">{t("studio.voiceIdentity.sceneOverview")}</h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.voiceIdentity.sceneOverviewHint")}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/80 bg-white px-3 py-2"
          >
            <span className="text-sm font-medium text-zinc-900">{row.name}</span>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
              <span aria-hidden>→</span>
              <span className="font-semibold text-[#0067B1]">{row.label}</span>
              {row.locked ?
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900">
                  {t("studio.voiceCenter.lockedShort")}
                </span>
              : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
