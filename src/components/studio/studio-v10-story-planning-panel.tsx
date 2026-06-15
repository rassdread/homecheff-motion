"use client";

import { useMemo, useState } from "react";
import { StudioCharactersEntryPanel } from "@/components/studio/studio-characters-entry-panel";
import { useActiveTranslator } from "@/i18n/client";
import {
  applyNarrativeMode,
  approveV10StoryPlanning,
  confirmV10Interpretation,
  patchV10DialogueLine,
  patchV10OverlayPlan,
  patchV10SceneProposal,
  patchV10SceneVoiceAssignment,
  patchV10VoiceOverLine,
  regenerateV10DialogueLine,
  toggleV10DialogueLine,
} from "@/lib/studio-v10-story-planning";
import type {
  StudioV10NarrativeMode,
  StudioV10OverlayPosition,
  StudioV10StoryPlanningState,
} from "@/types/studio-v10-story-planning";
import type { StudioCharacterListItem } from "@/types/studio-api";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  planning: StudioV10StoryPlanningState;
  onPlanningChange: (next: StudioV10StoryPlanningState) => void;
  onApprove: (approved: StudioV10StoryPlanningState) => void;
  characters?: StudioCharacterListItem[];
  onCharactersRefresh?: () => void | Promise<void>;
  hcProject?: HomeCheffProjectPackage | null;
  onProjectChange?: (project: HomeCheffProjectPackage) => void;
};

const NARRATIVE_MODES: StudioV10NarrativeMode[] = [
  "voice_over_only",
  "dialogue_only",
  "voice_over_and_dialogue",
  "silent",
];

const OVERLAY_POSITIONS: StudioV10OverlayPosition[] = ["top", "center", "bottom"];

function listToComma(values: string[]): string {
  return values.join(", ");
}

function commaToList(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function StudioV10StoryPlanningPanel({
  planning,
  onPlanningChange,
  onApprove,
  characters = [],
  onCharactersRefresh,
  hcProject,
  onProjectChange,
}: Props) {
  const t = useActiveTranslator();
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);

  const confidenceClass = useMemo(() => {
    if (planning.runtime.confidence === "high") return "text-emerald-700 bg-emerald-50";
    if (planning.runtime.confidence === "medium") return "text-amber-800 bg-amber-50";
    return "text-red-800 bg-red-50";
  }, [planning.runtime.confidence]);

  const runtimeByScene = useMemo(
    () => new Map(planning.runtime.scenes.map((row) => [row.sceneId, row.seconds])),
    [planning.runtime.scenes]
  );

  return (
    <div className="space-y-6" data-testid="studio-v10-story-planning-panel">
      <section className="rounded-2xl border border-violet-200 bg-violet-50/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-violet-950">
            {t("studio.v10.interpretation.title" as never)}
          </h3>
          {planning.interpretationConfirmed ?
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              {t("studio.v10.interpretation.confirmed" as never)}
            </span>
          : null}
        </div>
        <p className="mt-1 text-xs text-violet-800">{t("studio.v10.interpretation.lead" as never)}</p>
        <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          {(
            [
              ["audience", planning.interpretation.audience],
              ["goal", planning.interpretation.goal],
              ["emotion", planning.interpretation.emotion],
              ["narrativeType", planning.interpretation.narrativeType],
              ["cta", planning.interpretation.cta],
            ] as const
          ).map(([key, value]) => (
            <div key={key}>
              <dt className="font-semibold text-violet-900">
                {t(`studio.v10.interpretation.${key}` as never)}
              </dt>
              <dd>
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    onPlanningChange({
                      ...planning,
                      interpretation: { ...planning.interpretation, [key]: e.target.value },
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-violet-950"
                />
              </dd>
            </div>
          ))}
          {(
            [
              ["mainCharacters", listToComma(planning.interpretation.mainCharacters)],
              ["locations", listToComma(planning.interpretation.locations)],
              ["products", listToComma(planning.interpretation.products)],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="sm:col-span-2">
              <dt className="font-semibold text-violet-900">
                {t(`studio.v10.interpretation.${key}` as never)}
              </dt>
              <dd>
                <input
                  type="text"
                  value={value}
                  onChange={(e) =>
                    onPlanningChange({
                      ...planning,
                      interpretation: {
                        ...planning.interpretation,
                        [key]: commaToList(e.target.value),
                      },
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  className="mt-0.5 w-full rounded border border-violet-200 bg-white px-2 py-1 text-violet-950"
                />
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-sm text-violet-900">{planning.interpretation.interpretation}</p>
        {!planning.interpretationConfirmed ?
          <button
            type="button"
            onClick={() => onPlanningChange(confirmV10Interpretation(planning))}
            className="mt-3 rounded-full border border-violet-300 bg-white px-4 py-1.5 text-xs font-semibold text-violet-900 hover:bg-violet-100"
            data-testid="studio-v10-confirm-interpretation"
          >
            {t("studio.v10.interpretation.confirm" as never)}
          </button>
        : null}
      </section>

      {planning.interpretation.mainCharacters.length === 0 || characters.length === 0 ?
        <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4" data-testid="studio-v10-missing-characters">
          <p className="text-sm font-semibold text-amber-900">{t("studio.v10_1.character.missingLead" as never)}</p>
          <StudioCharactersEntryPanel
            characters={characters}
            canModify
            hcProject={hcProject}
            onProjectChange={onProjectChange}
            onCharactersRefresh={onCharactersRefresh ?? (() => undefined)}
            missingHint={t("studio.v10_1.character.missingLead" as never)}
          />
        </section>
      : null}

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">
          {t("studio.v10.narrativeMode.title" as never)}
        </h3>
        <ul className="mt-2 space-y-2">
          {NARRATIVE_MODES.map((mode) => (
            <li key={mode}>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 p-2 hover:border-[#006D52]">
                <input
                  type="radio"
                  name="narrativeMode"
                  checked={planning.narrativeMode === mode}
                  onChange={() => onPlanningChange(applyNarrativeMode(planning, mode))}
                  className="mt-1"
                />
                <span>
                  <span className="text-sm font-medium text-zinc-900">
                    {t(`studio.v10.narrativeMode.${mode}` as never)}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    {t(`studio.v10.narrativeMode.${mode}Hint` as never)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.storyArc.title" as never)}</h3>
        <ul className="mt-2 space-y-2">
          {planning.storyArc.map((beat) => (
            <li key={beat.id} className="rounded-lg border border-zinc-100 bg-zinc-50/80 p-3">
              <p className="text-xs font-semibold uppercase text-[#006D52]">{beat.label}</p>
              <textarea
                value={beat.summary}
                rows={2}
                onChange={(e) =>
                  onPlanningChange({
                    ...planning,
                    storyArc: planning.storyArc.map((b) =>
                      b.id === beat.id ? { ...b, summary: e.target.value } : b
                    ),
                    updatedAt: new Date().toISOString(),
                  })
                }
                className="mt-1 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
              />
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.scenes.title" as never)}</h3>
        <p className="mt-1 text-xs text-zinc-500">{t("studio.v10.scenes.lead" as never)}</p>
        <ul className="mt-3 space-y-3">
          {planning.sceneProposals.map((scene) => (
            <li
              key={scene.id}
              className="rounded-xl border border-zinc-200 p-3"
              data-testid={`studio-v10-scene-${scene.index}`}
            >
              <p className="text-sm font-semibold text-zinc-900">
                {t("studio.buildStory.sceneLabel" as never, { index: scene.index } as never)}: {scene.title}
              </p>
              <dl className="mt-2 grid gap-1 text-xs text-zinc-700 sm:grid-cols-2">
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.location" as never)}</dt>
                  <dd>{scene.location}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.characters" as never)}</dt>
                  <dd>{scene.characters.join(", ")}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.action" as never)}</dt>
                  <dd>{scene.action}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.emotion" as never)}</dt>
                  <dd>{scene.emotion}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.purpose" as never)}</dt>
                  <dd>{scene.purpose}</dd>
                </div>
                <div>
                  <dt className="font-semibold">{t("studio.v10.scenes.duration" as never)}</dt>
                  <dd>{runtimeByScene.get(scene.id) ?? scene.estimatedDurationSeconds}s</dd>
                </div>
              </dl>
              <p className="mt-2 text-xs text-zinc-600">
                {t("studio.v10.scenes.voiceOver" as never)}:{" "}
                {scene.voiceOver ? `“${scene.voiceOver}”` : t("studio.v10.dialogue.none" as never)}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.v10.scenes.dialogue" as never)}:{" "}
                {scene.dialogueLines.filter((d) => d.enabled).length > 0
                  ? scene.dialogueLines
                      .filter((d) => d.enabled)
                      .map((d) => `${d.character}: “${d.dialogue}”`)
                      .join(" · ")
                  : t("studio.v10.dialogue.none" as never)}
              </p>
              <p className="mt-1 text-xs text-zinc-600">
                {t("studio.v10.scenes.overlay" as never)}: {scene.overlay.header}
              </p>
              <button
                type="button"
                onClick={() => setEditingSceneId(editingSceneId === scene.id ? null : scene.id)}
                className="mt-2 text-xs font-semibold text-[#0067B1]"
              >
                {editingSceneId === scene.id
                  ? t("studio.v10.scenes.doneEdit" as never)
                  : t("studio.v10.scenes.edit" as never)}
              </button>
              {editingSceneId === scene.id ?
                <textarea
                  value={scene.voiceOver}
                  rows={2}
                  onChange={(e) =>
                    onPlanningChange(
                      patchV10SceneProposal(planning, scene.id, { voiceOver: e.target.value })
                    )
                  }
                  className="mt-2 w-full rounded border px-2 py-1 text-sm"
                />
              : null}
            </li>
          ))}
        </ul>
      </section>

      {planning.dialogueLines.length > 0 ?
        <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4" data-testid="studio-v10-dialogue-planning">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.dialogue.title" as never)}</h3>
          <ul className="mt-3 space-y-3">
            {planning.dialogueLines.map((line) => (
              <li
                key={line.id}
                className={`rounded-lg border p-3 text-xs ${line.enabled ? "border-amber-200 bg-white" : "border-zinc-200 bg-zinc-50 opacity-60"}`}
              >
                <p className="font-semibold text-zinc-900">{line.character}</p>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.dialogue.voice" as never)}</span>
                  <input
                    type="text"
                    value={line.voice}
                    disabled={!line.enabled}
                    onChange={(e) =>
                      onPlanningChange(patchV10DialogueLine(planning, line.id, { voice: e.target.value }))
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.dialogue.emotion" as never)}</span>
                  <input
                    type="text"
                    value={line.emotion}
                    disabled={!line.enabled}
                    onChange={(e) =>
                      onPlanningChange(patchV10DialogueLine(planning, line.id, { emotion: e.target.value }))
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">Dialogue</span>
                  <textarea
                    value={line.dialogue}
                    rows={2}
                    disabled={!line.enabled}
                    onChange={(e) =>
                      onPlanningChange(patchV10DialogueLine(planning, line.id, { dialogue: e.target.value }))
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <p className="mt-1 text-zinc-500">
                  {t("studio.v10.dialogue.timing" as never)}: {line.timingLabel}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!line.enabled}
                    onClick={() => onPlanningChange(regenerateV10DialogueLine(planning, line.id))}
                    className="rounded-full border border-amber-300 px-3 py-1 text-[11px] font-semibold text-amber-900 disabled:opacity-50"
                  >
                    {t("studio.v10.dialogue.regenerate" as never)}
                  </button>
                  <button
                    type="button"
                    onClick={() => onPlanningChange(toggleV10DialogueLine(planning, line.id))}
                    className="rounded-full border border-zinc-300 px-3 py-1 text-[11px] font-semibold text-zinc-700"
                  >
                    {line.enabled
                      ? t("studio.v10.dialogue.disable" as never)
                      : t("studio.v10.dialogue.enable" as never)}
                  </button>
                </div>
                {!line.enabled ?
                  <p className="mt-1 text-[10px] font-semibold uppercase text-zinc-500">
                    {t("studio.v10.dialogue.disabled" as never)}
                  </p>
                : null}
              </li>
            ))}
          </ul>
        </section>
      : null}

      {planning.voiceOverLines.length > 0 ?
        <section className="rounded-2xl border border-sky-200 bg-sky-50/40 p-4" data-testid="studio-v10-voiceover-planning">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.voiceOver.title" as never)}</h3>
          <ul className="mt-3 space-y-3">
            {planning.voiceOverLines.map((line) => (
              <li key={line.sceneId} className="rounded-lg border border-sky-200 bg-white p-3 text-xs">
                <p className="font-semibold text-zinc-900">
                  {t("studio.buildStory.sceneLabel" as never, { index: line.sceneIndex } as never)}
                </p>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.voiceOver.narrator" as never)}</span>
                  <input
                    type="text"
                    value={line.narratorVoice}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10VoiceOverLine(planning, line.sceneId, { narratorVoice: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.voiceOver.script" as never)}</span>
                  <textarea
                    value={line.script}
                    rows={2}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10VoiceOverLine(planning, line.sceneId, { script: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="mt-2 block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.voiceOver.emotion" as never)}</span>
                  <input
                    type="text"
                    value={line.emotion}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10VoiceOverLine(planning, line.sceneId, { emotion: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <p className="mt-1 text-zinc-500">
                  {t("studio.v10.voiceOver.duration" as never)}: {line.durationSeconds}s
                </p>
              </li>
            ))}
          </ul>
        </section>
      : null}

      <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4" data-testid="studio-v10-overlay-planning">
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.overlay.title" as never)}</h3>
        <ul className="mt-3 space-y-3">
          {planning.overlayPlans.map((overlay) => {
            const scene = planning.sceneProposals.find((s) => s.id === overlay.sceneId);
            return (
              <li key={overlay.sceneId} className="rounded-lg border border-indigo-200 bg-white p-3 text-xs">
                <p className="font-semibold text-zinc-900">
                  {t("studio.buildStory.sceneLabel" as never, { index: scene?.index ?? 0 } as never)}
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-semibold text-zinc-700">{t("studio.v10.overlay.header" as never)}</span>
                    <input
                      type="text"
                      value={overlay.header ?? ""}
                      onChange={(e) =>
                        onPlanningChange(
                          patchV10OverlayPlan(planning, overlay.sceneId, { header: e.target.value })
                        )
                      }
                      className="mt-0.5 w-full rounded border px-2 py-1"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-zinc-700">{t("studio.v10.overlay.subtitle" as never)}</span>
                    <input
                      type="text"
                      value={overlay.subtitle ?? ""}
                      onChange={(e) =>
                        onPlanningChange(
                          patchV10OverlayPlan(planning, overlay.sceneId, { subtitle: e.target.value })
                        )
                      }
                      className="mt-0.5 w-full rounded border px-2 py-1"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-zinc-700">{t("studio.v10.overlay.cta" as never)}</span>
                    <input
                      type="text"
                      value={overlay.cta ?? ""}
                      onChange={(e) =>
                        onPlanningChange(
                          patchV10OverlayPlan(planning, overlay.sceneId, { cta: e.target.value })
                        )
                      }
                      className="mt-0.5 w-full rounded border px-2 py-1"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-zinc-700">{t("studio.v10.overlay.position" as never)}</span>
                    <select
                      value={overlay.position}
                      onChange={(e) =>
                        onPlanningChange(
                          patchV10OverlayPlan(planning, overlay.sceneId, {
                            position: e.target.value as StudioV10OverlayPosition,
                          })
                        )
                      }
                      className="mt-0.5 w-full rounded border px-2 py-1"
                    >
                      {OVERLAY_POSITIONS.map((pos) => (
                        <option key={pos} value={pos}>
                          {t(`studio.v10.overlay.position.${pos}` as never)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="font-semibold text-zinc-700">{t("studio.v10.overlay.duration" as never)}</span>
                    <input
                      type="number"
                      min={1}
                      step={0.1}
                      value={overlay.durationSeconds}
                      onChange={(e) =>
                        onPlanningChange(
                          patchV10OverlayPlan(planning, overlay.sceneId, {
                            durationSeconds: Number(e.target.value) || overlay.durationSeconds,
                          })
                        )
                      }
                      className="mt-0.5 w-full rounded border px-2 py-1"
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4" data-testid="studio-v10-scene-voice-planning">
        <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.sceneVoice.title" as never)}</h3>
        <ul className="mt-3 space-y-3">
          {planning.sceneVoiceAssignments.map((row) => (
            <li key={row.sceneId} className="rounded-lg border border-emerald-200 bg-white p-3 text-xs">
              <p className="font-semibold text-zinc-900">
                {t("studio.buildStory.sceneLabel" as never, { index: row.sceneIndex } as never)}
              </p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <label className="block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.sceneVoice.speaker" as never)}</span>
                  <input
                    type="text"
                    value={row.speakerLabel}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10SceneVoiceAssignment(planning, row.sceneId, { speakerLabel: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.sceneVoice.voice" as never)}</span>
                  <input
                    type="text"
                    value={row.voiceName ?? ""}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10SceneVoiceAssignment(planning, row.sceneId, { voiceName: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.sceneVoice.emotion" as never)}</span>
                  <input
                    type="text"
                    value={row.emotion ?? ""}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10SceneVoiceAssignment(planning, row.sceneId, { emotion: e.target.value })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
                <label className="block">
                  <span className="font-semibold text-zinc-700">{t("studio.v10.sceneVoice.speed" as never)}</span>
                  <input
                    type="number"
                    min={0.5}
                    max={2}
                    step={0.05}
                    value={row.speed ?? 1}
                    onChange={(e) =>
                      onPlanningChange(
                        patchV10SceneVoiceAssignment(planning, row.sceneId, {
                          speed: Number(e.target.value) || 1,
                        })
                      )
                    }
                    className="mt-0.5 w-full rounded border px-2 py-1"
                  />
                </label>
              </div>
              {row.isOverride ?
                <p className="mt-1 text-[10px] font-semibold uppercase text-emerald-700">
                  {t("studio.v10.sceneVoice.override" as never)}
                </p>
              : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.v10.runtime.title" as never)}</h3>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${confidenceClass}`}>
            {t(`studio.v10.runtime.confidence.${planning.runtime.confidence}` as never)}
          </span>
        </div>
        <table className="mt-3 w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="pb-1">{t("studio.v10.runtime.scene" as never)}</th>
              <th className="pb-1 text-right">{t("studio.v10.runtime.seconds" as never)}</th>
            </tr>
          </thead>
          <tbody>
            {planning.runtime.scenes.map((row) => (
              <tr key={row.sceneId} className="border-t border-sky-100">
                <td className="py-1">
                  {row.index}. {row.title}
                </td>
                <td className="py-1 font-mono text-right">{row.seconds}s</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-sm font-semibold">
          {t("studio.v10.runtime.total" as never)}: {planning.runtime.totalSeconds}s
        </p>
      </section>

      <button
        type="button"
        onClick={() => onApprove(approveV10StoryPlanning(planning))}
        className="rounded-full bg-gradient-to-r from-[#006D52] to-[#0067B1] px-5 py-2.5 text-sm font-semibold text-white"
        data-testid="studio-v10-approve-planning"
      >
        {t("studio.v10.approve" as never)}
      </button>
    </div>
  );
}
