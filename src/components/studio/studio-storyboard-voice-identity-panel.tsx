"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildVoiceIdentityPlan } from "@/lib/studio-voice-identity-director";
import { getVoiceProfilePreset } from "@/lib/studio-voice-profiles";
import type { StudioStoryboardDetail } from "@/types/studio-api";
import { VOICE_IDENTITY_LANGUAGES } from "@/types/studio-voice-identity";

type Props = {
  storyboard: StudioStoryboardDetail;
};

export function StudioStoryboardVoiceIdentityPanel({ storyboard }: Props) {
  const t = useActiveTranslator();
  const plan = useMemo(() => buildVoiceIdentityPlan(storyboard), [storyboard]);

  const byCharacter = useMemo(() => {
    const map = new Map<string, typeof plan.languageRows>();
    for (const row of plan.languageRows) {
      const list = map.get(row.characterId) ?? [];
      list.push(row);
      map.set(row.characterId, list);
    }
    return map;
  }, [plan.languageRows]);

  if (byCharacter.size === 0) {
    return null;
  }

  return (
    <section className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <h3 className="text-sm font-semibold text-indigo-950">{t("studio.voiceIdentity.title")}</h3>
      <p className="mt-1 text-xs text-indigo-800">{t("studio.voiceIdentity.hint")}</p>
      <p className="mt-2 text-xs text-indigo-900">
        {t("studio.voiceIdentity.score", { score: String(plan.identityScore) })}
      </p>

      <ul className="mt-4 space-y-3">
        {[...byCharacter.entries()].map(([characterId, rows]) => {
          const name = rows[0]?.characterName ?? "Character";
          const locked = rows.some((r) => r.voiceLock);
          return (
            <li
              key={characterId}
              className="rounded-xl border border-indigo-100 bg-white/80 px-3 py-2 text-xs text-indigo-950"
            >
              <p className="font-semibold">
                {name}
                {locked ?
                  <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-800">
                    {t("studio.voiceIdentity.locked")}
                  </span>
                : null}
              </p>
              <ul className="mt-1 space-y-0.5">
                {VOICE_IDENTITY_LANGUAGES.map((lang) => {
                  const row = rows.find((r) => r.language === lang);
                  const label =
                    row?.displayLabel ||
                    (row?.voiceProfile ?
                      t(getVoiceProfilePreset(row.voiceProfile).labelKey as never)
                    : t("studio.voiceIdentity.missing"));
                  return (
                    <li key={lang}>
                      <span className="font-medium">{lang.toUpperCase()}</span>
                      {" → "}
                      {label}
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>

      {plan.warnings.length > 0 ?
        <ul className="mt-4 space-y-1 text-xs text-amber-900">
          {plan.warnings.map((w, i) => (
            <li key={`${w.code}-${i}`}>
              {t(w.messageKey as never, w.params as never)}
            </li>
          ))}
        </ul>
      : null}
    </section>
  );
}
