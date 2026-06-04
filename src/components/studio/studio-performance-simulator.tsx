"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { STUDIO_SCENE_ENERGIES } from "@/lib/studio-scene-director";
import { simulateScenePerformancePreview } from "@/lib/studio-character-performance";
import type { StudioCharacterListItem, StudioSceneDetail } from "@/types/studio-api";

type Props = {
  scenes: StudioSceneDetail[];
};

const EMOTION_PRESETS = ["happy", "sad", "excited", "calm", "neutral"] as const;

export function StudioPerformanceSimulator({ scenes }: Props) {
  const t = useActiveTranslator();
  const [sceneId, setSceneId] = useState(scenes[0]?.id ?? "");
  const [characterId, setCharacterId] = useState("");
  const [emotion, setEmotion] = useState<string>("happy");
  const [sceneEnergy, setSceneEnergy] = useState<string>("dynamic");

  const scene = scenes.find((s) => s.id === sceneId) ?? scenes[0];
  const characters = scene?.characters ?? [];

  const selectedCharacter: StudioCharacterListItem | null =
    characters.find((c) => c.id === characterId) ?? characters[0] ?? null;

  const preview = useMemo(() => {
    if (!selectedCharacter) {
      return null;
    }
    return simulateScenePerformancePreview({
      character: selectedCharacter,
      emotion,
      sceneEnergy,
      activeSpeaker: true,
    });
  }, [selectedCharacter, emotion, sceneEnergy]);

  if (!scenes.length) {
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white/80 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">
        {t("studio.characterPerformance.simulatorTitle")}
      </h3>
      <p className="mt-1 text-xs text-zinc-600">{t("studio.characterPerformance.simulatorHint")}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">{t("studio.characterPerformance.simulatorScene")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            value={scene?.id ?? ""}
            onChange={(e) => {
              setSceneId(e.target.value);
              setCharacterId("");
            }}
          >
            {scenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.order + 1}. {s.title}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("studio.characterPerformance.simulatorCharacter")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            value={selectedCharacter?.id ?? ""}
            onChange={(e) => setCharacterId(e.target.value)}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("studio.characterPerformance.simulatorEmotion")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            value={emotion}
            onChange={(e) => setEmotion(e.target.value)}
          >
            {EMOTION_PRESETS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("studio.characterPerformance.simulatorEnergy")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
            value={sceneEnergy}
            onChange={(e) => setSceneEnergy(e.target.value)}
          >
            {STUDIO_SCENE_ENERGIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>

      {preview ?
        <dl className="mt-4 grid gap-1 text-xs text-zinc-700 sm:grid-cols-2">
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewSmile")}</dt>
            <dd>{preview.smileStrength}%</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewBlink")}</dt>
            <dd>{preview.blinkRate}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewMouthSpeed")}</dt>
            <dd>{preview.mouthSpeed}x</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewHead")}</dt>
            <dd>{preview.headMovement}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewMouthState")}</dt>
            <dd>{preview.mouthState}</dd>
          </div>
          <div>
            <dt className="font-medium">{t("studio.characterPerformance.previewIdle")}</dt>
            <dd>{preview.idleMovement}</dd>
          </div>
        </dl>
      : null}
    </div>
  );
}
