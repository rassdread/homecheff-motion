"use client";

import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { computeCharacterIdentityScore } from "@/lib/compute-character-identity-score";
import { toCharacterMemorySnapshot } from "@/lib/studio-memory-mappers";
import { characterIdentityStatusColor } from "@/lib/studio-character-identity-status";
import type { SceneConsistencyReport } from "@/types/studio-consistency";
import type { VisionConsistencyReport } from "@/types/studio-vision-consistency";
import type { StudioCharacterListItem } from "@/types/studio-api";

const BADGE_CLASS: Record<ReturnType<typeof characterIdentityStatusColor>, string> = {
  green: "text-emerald-800 bg-emerald-50",
  yellow: "text-amber-900 bg-amber-50",
  orange: "text-orange-900 bg-orange-50",
  red: "text-red-800 bg-red-50",
  zinc: "text-zinc-600 bg-zinc-100",
};

type Props = {
  sceneCharacters: StudioCharacterListItem[];
  consistencyReport: SceneConsistencyReport | null;
  visionReport: VisionConsistencyReport | null;
};

export function StudioSceneCharacterIdentityPanel({
  sceneCharacters,
  consistencyReport,
  visionReport,
}: Props) {
  const t = useActiveTranslator();

  const identities = useMemo(() => {
    return sceneCharacters.map((ch) => {
      const snapshot = toCharacterMemorySnapshot({
        id: ch.id,
        name: ch.name,
        role: ch.role,
        description: ch.description,
        personality: ch.personality,
        referenceImageUrl: ch.referenceImageUrl,
        referenceStorageKey: "",
        appearanceMemory: ch.appearanceMemory,
        personalityMemory: ch.personalityMemory,
        continuityNotes: ch.continuityNotes,
        defaultClothing: ch.defaultClothing,
        defaultAccessories: ch.defaultAccessories,
        visualKeywords: ch.visualKeywords,
        primaryReferenceImageId: ch.primaryReferenceImageId,
        referenceNotes: ch.referenceNotes,
        identityStrength: ch.identityStrength,
        continuityStrength: ch.continuityStrength,
        worldProfileId: ch.worldProfileId,
        worldProfile: ch.worldProfile
          ? {
              id: ch.worldProfile.id,
              name: ch.worldProfile.name,
              description: "",
              visualStyle: "",
              tone: "",
              continuityRules: "",
              continuityStrength: ch.continuityStrength,
            }
          : null,
      });
      const consistencyResult =
        consistencyReport?.characterResults.find((r) => r.characterId === ch.id) ?? null;
      const visionResult =
        visionReport?.characterResults.find((r) => r.characterId === ch.id) ?? null;
      return computeCharacterIdentityScore({
        character: snapshot,
        consistencyResult,
        visionResult,
        expectedInScene: true,
        presentInScene: Boolean(consistencyResult || visionResult),
      });
    });
  }, [sceneCharacters, consistencyReport, visionReport]);

  if (sceneCharacters.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0067B1]">
        {t("studio.characterConsistency.sceneTitle")}
      </p>
      <ul className="mt-2 space-y-2">
        {identities.map((identity) => (
          <li key={identity.characterId} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-zinc-900">{identity.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[characterIdentityStatusColor(identity.status)]}`}
              >
                {identity.score} · {t(`studio.characterConsistency.status.${identity.status}`)}
              </span>
            </div>
            {identity.warnings.length > 0 ?
              <ul className="mt-1 space-y-0.5 text-xs text-amber-800">
                {identity.warnings.slice(0, 3).map((w) => (
                  <li key={w}>• {w}</li>
                ))}
              </ul>
            : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
