"use client";

import { useMemo, useState } from "react";
import { StudioDirectorPanelV2 } from "@/components/studio/director-v2/studio-director-panel-v2";
import { StudioPresetField } from "@/components/studio/studio-preset-field";
import { StudioSceneCompositionPanel } from "@/components/studio/studio-scene-composition-panel";
import { StudioAssetPlacementPanel } from "@/components/studio/studio-asset-placement-panel";
import { StudioCharacterBlockingPanel } from "@/components/studio/studio-character-blocking-panel";
import { StudioScenePreview } from "@/components/studio/studio-scene-preview";
import { StudioSceneImagePanel } from "@/components/studio/studio-scene-image-panel";
import { StudioSceneContinuityPreview } from "@/components/studio/studio-scene-continuity-preview";
import { StudioScenePromptPreview } from "@/components/studio/studio-scene-prompt-preview";
import { useActiveTranslator } from "@/i18n/client";
import { StudioDirectorSelect } from "@/components/studio/studio-director-select";
import {
  STUDIO_SCENE_ACTION_PRESETS,
  STUDIO_SCENE_CAMERA_PRESETS,
  STUDIO_SCENE_EMOTION_PRESETS,
} from "@/lib/studio-scene-presets";
import {
  STUDIO_CAMERA_MOVEMENTS,
  STUDIO_SCENE_ENERGIES,
  STUDIO_SHOT_TYPES,
} from "@/lib/studio-scene-director";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import { isStudioDirectorV2Enabled } from "@/lib/studio-director-v2-flag";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";

type StudioSceneComposerProps = {
  storyboardId: string;
  storyboard: StudioStoryboardDetail;
  characterDriftRecommendations?: CorrectionRecommendation[];
  scene: StudioSceneDetail;
  sceneIndex?: number;
  sceneCount?: number;
  flowScenes?: StoryFlowSceneInput[];
  storyboardTitle?: string;
  storyboardDescription?: string;
  aiDirectorPrompt?: string;
  aiDirectorStyleStrength?: string;
  onStoryboardNotesUpdated?: (notes: string) => void;
  locations: StudioLocationListItem[];
  characters: StudioCharacterListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  saving: boolean;
  canModify: boolean;
  onSave: (patch: StudioSceneUpdateInput) => Promise<void>;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  autoSelectImprovedImage?: boolean;
};

type TabId = "compose" | "prompt" | "image";

export function StudioSceneComposer({
  storyboardId,
  storyboard,
  characterDriftRecommendations = [],
  scene,
  sceneIndex = 0,
  sceneCount = 1,
  flowScenes = [],
  storyboardTitle = "",
  storyboardDescription = "",
  aiDirectorPrompt = "",
  aiDirectorStyleStrength = "balanced",
  onStoryboardNotesUpdated,
  locations,
  characters,
  props,
  worlds,
  styleProfile,
  directorProfile,
  saving,
  canModify,
  onSave,
  onSceneUpdated,
  autoSelectImprovedImage = true,
}: StudioSceneComposerProps) {
  const t = useActiveTranslator();
  const directorV2Enabled = isStudioDirectorV2Enabled();
  const [tab, setTab] = useState<TabId>("compose");
  const [draft, setDraft] = useState(scene);
  const [error, setError] = useState("");
  const storyboardSlice = useMemo(
    () => ({ id: storyboardId, scenes: [draft] }) as import("@/types/studio-api").StudioStoryboardDetail,
    [storyboardId, draft]
  );

  const patch = <K extends keyof StudioSceneDetail>(key: K, value: StudioSceneDetail[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const toggleId = (list: string[], id: string): string[] =>
    list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

  const handleSave = async () => {
    setError("");
    try {
      await onSave({
        title: draft.title,
        description: draft.description,
        action: draft.action,
        emotion: draft.emotion,
        camera: draft.camera,
        shotType: draft.shotType,
        cameraMovement: draft.cameraMovement,
        sceneEnergy: draft.sceneEnergy,
        transitionToNext: draft.transitionToNext,
        durationSeconds: draft.durationSeconds,
        locationId: draft.locationId,
        characterIds: draft.characters.map((c) => c.id),
        propIds: draft.props.map((p) => p.id),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("studio.storyboards.error.saveSceneFailed"));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200">
        <button
          type="button"
          onClick={() => setTab("compose")}
          className={`px-3 py-2 text-sm font-semibold ${
            tab === "compose"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.prompt.tab.compose")}
        </button>
        <button
          type="button"
          onClick={() => setTab("prompt")}
          className={`px-3 py-2 text-sm font-semibold ${
            tab === "prompt"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.prompt.tab.preview")}
        </button>
        <button
          type="button"
          onClick={() => setTab("image")}
          className={`px-3 py-2 text-sm font-semibold ${
            tab === "image"
              ? "border-b-2 border-[#006D52] text-[#006D52]"
              : "text-zinc-500"
          }`}
        >
          {t("studio.sceneImage.tab.generated")}
        </button>
      </div>

      {tab === "prompt" ? (
        <StudioScenePromptPreview
          scene={draft}
          styleProfile={styleProfile}
          directorProfile={directorProfile}
          characters={characters}
          locations={locations}
          props={props}
          worlds={worlds}
        />
      ) : tab === "image" ? (
        <StudioSceneImagePanel
          storyboardId={storyboardId}
          scene={draft}
          styleProfile={styleProfile}
          canModify={canModify}
          characterDriftRecommendations={characterDriftRecommendations}
          autoSelectImprovedImage={autoSelectImprovedImage}
          onSceneUpdated={(updated) => {
            setDraft(updated);
            onSceneUpdated(updated);
          }}
        />
      ) : directorV2Enabled ? (
        <StudioDirectorPanelV2
          storyboardId={storyboardId}
          storyboard={storyboard}
          scene={draft}
          sceneIndex={sceneIndex}
          sceneCount={sceneCount}
          flowScenes={flowScenes}
          storyboardTitle={storyboardTitle}
          storyboardDescription={storyboardDescription}
          aiDirectorPrompt={aiDirectorPrompt}
          aiDirectorStyleStrength={aiDirectorStyleStrength}
          directorProfile={directorProfile}
          styleProfile={styleProfile}
          characters={characters}
          locations={locations}
          props={props}
          worlds={worlds}
          canModify={canModify}
          saving={saving}
          onSave={onSave}
          onSceneDraftChange={(updated) => {
            setDraft(updated);
            onSceneUpdated(updated);
          }}
          onStoryboardNotesUpdated={onStoryboardNotesUpdated}
        />
      ) : (
        <div className="space-y-5">
          <StudioSceneCompositionPanel storyboard={storyboardSlice} scene={draft} />
          <StudioAssetPlacementPanel storyboard={storyboardSlice} scene={draft} />
          <StudioCharacterBlockingPanel storyboard={storyboardSlice} scene={draft} />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-zinc-700">
                {t("studio.storyboards.field.sceneTitle")}
              </label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => patch("title", e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-700">
                {t("studio.storyboards.field.duration")}
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={draft.durationSeconds}
                onChange={(e) => patch("durationSeconds", Number(e.target.value) || 5)}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">
              {t("studio.storyboards.field.description")}
            </label>
            <textarea
              value={draft.description}
              onChange={(e) => patch("description", e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-700">
              {t("studio.storyboards.field.location")}
            </label>
            <select
              value={draft.locationId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const loc = locations.find((l) => l.id === id) ?? null;
                setDraft((prev) => ({
                  ...prev,
                  locationId: id,
                  location: loc,
                }));
              }}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">{t("studio.storyboards.field.selectLocation")}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-700">
              {t("studio.storyboards.field.characters")}
            </p>
            <div className="mt-2 max-h-36 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3">
              {characters.length === 0 ? (
                <p className="text-xs text-zinc-500">{t("studio.storyboards.field.noCharacters")}</p>
              ) : (
                characters.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.characters.some((x) => x.id === c.id)}
                      onChange={() => {
                        const ids = draft.characters.map((x) => x.id);
                        const nextIds = toggleId(ids, c.id);
                        setDraft((prev) => ({
                          ...prev,
                          characters: characters.filter((ch) => nextIds.includes(ch.id)),
                        }));
                      }}
                    />
                    {c.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-700">{t("studio.storyboards.field.props")}</p>
            <div className="mt-2 max-h-36 space-y-2 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-3">
              {props.length === 0 ? (
                <p className="text-xs text-zinc-500">{t("studio.storyboards.field.noProps")}</p>
              ) : (
                props.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.props.some((x) => x.id === p.id)}
                      onChange={() => {
                        const ids = draft.props.map((x) => x.id);
                        const nextIds = toggleId(ids, p.id);
                        setDraft((prev) => ({
                          ...prev,
                          props: props.filter((pr) => nextIds.includes(pr.id)),
                        }));
                      }}
                    />
                    {p.name}
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StudioPresetField
              label={t("studio.storyboards.field.action")}
              group="action"
              presets={STUDIO_SCENE_ACTION_PRESETS}
              value={draft.action}
              onChange={(action) => patch("action", action)}
            />
            <StudioPresetField
              label={t("studio.storyboards.field.emotion")}
              group="emotion"
              presets={STUDIO_SCENE_EMOTION_PRESETS}
              value={draft.emotion}
              onChange={(emotion) => patch("emotion", emotion)}
            />
            <StudioPresetField
              label={t("studio.storyboards.field.camera")}
              group="camera"
              presets={STUDIO_SCENE_CAMERA_PRESETS}
              value={draft.camera}
              onChange={(camera) => patch("camera", camera)}
            />
          </div>

          <p className="text-sm font-semibold text-zinc-800">{t("studio.director.sectionTitle")}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <StudioDirectorSelect
              label={t("studio.storyboards.field.shotType")}
              group="shot"
              options={STUDIO_SHOT_TYPES}
              value={draft.shotType}
              onChange={(shotType) => patch("shotType", shotType)}
            />
            <StudioDirectorSelect
              label={t("studio.storyboards.field.cameraMovement")}
              group="movement"
              options={STUDIO_CAMERA_MOVEMENTS}
              value={draft.cameraMovement}
              onChange={(cameraMovement) => patch("cameraMovement", cameraMovement)}
            />
            <StudioDirectorSelect
              label={t("studio.storyboards.field.sceneEnergy")}
              group="energy"
              options={STUDIO_SCENE_ENERGIES}
              value={draft.sceneEnergy}
              onChange={(sceneEnergy) => patch("sceneEnergy", sceneEnergy as StudioSceneDetail["sceneEnergy"])}
              allowEmpty={false}
            />
          </div>

          <StudioScenePreview scene={draft} directorProfile={directorProfile} />

          <StudioSceneContinuityPreview scene={draft} styleProfile={styleProfile} />

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-full bg-[#006D52] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? t("button.loading") : t("studio.storyboards.saveScene")}
          </button>
        </div>
      )}
    </div>
  );
}
