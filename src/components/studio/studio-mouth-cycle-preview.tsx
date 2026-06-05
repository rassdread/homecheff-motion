"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  previewSpeakingMouthCycleFrames,
  resolveSpeakingMouthCycleKey,
  speakingCycleStepSeconds,
} from "@/lib/speaking-mouth-cycle";
import { STUDIO_SCENE_ENERGIES } from "@/lib/studio-scene-director";
import type { MouthMovementState } from "@/types/studio-character-performance";

const EMOTION_PRESETS = ["neutral", "happy", "calm", "excited", "sad", "angry"] as const;

const MOUTH_LABELS: Record<MouthMovementState, string> = {
  closed: "Closed",
  small: "Small",
  medium: "Medium",
  wide: "Wide",
};

type Props = {
  characterName?: string;
  mouthAssets?: Partial<Record<MouthMovementState, string>>;
};

export function StudioMouthCyclePreview({ characterName, mouthAssets }: Props) {
  const t = useActiveTranslator();
  const [emotion, setEmotion] = useState<string>("neutral");
  const [sceneEnergy, setSceneEnergy] = useState<string>("neutral");
  const [frameIndex, setFrameIndex] = useState(0);

  const cycle = useMemo(
    () => previewSpeakingMouthCycleFrames({ emotion, sceneEnergy }),
    [emotion, sceneEnergy]
  );
  const stepMs = Math.max(120, Math.round(speakingCycleStepSeconds(sceneEnergy) * 1000));

  useEffect(() => {
    if (cycle.length === 0) {
      return;
    }
    const id = window.setInterval(() => {
      setFrameIndex((i) => (i + 1) % cycle.length);
    }, stepMs);
    return () => window.clearInterval(id);
  }, [cycle.length, stepMs]);

  const activeState = cycle[frameIndex] ?? "closed";
  const cycleKey = resolveSpeakingMouthCycleKey(emotion);

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
      <h3 className="text-sm font-semibold text-violet-950">
        {t("studio.mouthAnimation.previewTitle")}
      </h3>
      {characterName ?
        <p className="mt-1 text-xs text-violet-800">
          {t("studio.mouthAnimation.previewCharacter", { name: characterName })}
        </p>
      : null}

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="font-medium">{t("studio.mouthAnimation.previewEmotion")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm"
            value={emotion}
            onChange={(e) => {
              setEmotion(e.target.value);
              setFrameIndex(0);
            }}
          >
            {EMOTION_PRESETS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="font-medium">{t("studio.mouthAnimation.previewEnergy")}</span>
          <select
            className="mt-1 w-full rounded-lg border border-violet-200 px-2 py-1.5 text-sm"
            value={sceneEnergy}
            onChange={(e) => {
              setSceneEnergy(e.target.value);
              setFrameIndex(0);
            }}
          >
            {STUDIO_SCENE_ENERGIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="mt-2 text-[11px] text-violet-700">
        {t("studio.mouthAnimation.previewCycleKey")}: {cycleKey} ·{" "}
        {t("studio.mouthAnimation.previewStepMs", { ms: stepMs })}
      </p>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {(["closed", "small", "medium", "wide"] as MouthMovementState[]).map((state) => {
          const active = state === activeState;
          const asset = mouthAssets?.[state]?.trim();
          return (
            <div
              key={state}
              className={`rounded-lg border p-2 text-center ${
                active ?
                  "border-violet-500 bg-white shadow-sm ring-2 ring-violet-300"
                : "border-violet-100 bg-white/60"
              }`}
            >
              {asset ?
                // eslint-disable-next-line @next/next/no-img-element
                <img src={asset} alt="" className="mx-auto h-12 w-12 object-contain" />
              : (
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
                  {state === "closed" ? "—" : state === "small" ? "o" : state === "medium" ? "O" : "◯"}
                </div>
              )}
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                {MOUTH_LABELS[state]}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
