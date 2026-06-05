"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StudioSceneComposer } from "@/components/studio/studio-scene-composer";
import { buildDirectorScenePreviewText } from "@/lib/studio-scene-director-preview";
import { buildSceneCompositionForScene } from "@/lib/studio-scene-composition-director";
import { buildAssetPlacementForSceneDetail } from "@/lib/studio-asset-placement-director";
import { buildCharacterBlockingForSceneDetail } from "@/lib/studio-character-blocking-director";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
} from "@/types/studio-api";
import type { CorrectionRecommendation } from "@/types/studio-correction";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";
import type { StoryFlowSceneInput } from "@/lib/studio-story-flow-analyzer";

type StudioSortableSceneCardProps = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  sceneCount: number;
  flowScenes: StoryFlowSceneInput[];
  storyboardTitle: string;
  storyboardDescription: string;
  aiDirectorPrompt: string;
  aiDirectorStyleStrength: string;
  onStoryboardNotesUpdated?: (notes: string) => void;
  expanded: boolean;
  onToggle: () => void;
  locations: StudioLocationListItem[];
  characters: StudioCharacterListItem[];
  props: StudioPropListItem[];
  styleProfile: StudioPromptStyleProfile;
  directorProfile: StudioDirectorProfile;
  saving: boolean;
  busy: boolean;
  canModify: boolean;
  storyboardId: string;
  characterDriftRecommendations?: CorrectionRecommendation[];
  autoSelectImprovedImage?: boolean;
  onSave: (sceneId: string, patch: StudioSceneUpdateInput) => Promise<void>;
  onSceneUpdated: (scene: StudioSceneDetail) => void;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
};

export function StudioSortableSceneCard({
  scene,
  sceneIndex,
  sceneCount,
  flowScenes,
  storyboardTitle,
  storyboardDescription,
  aiDirectorPrompt,
  aiDirectorStyleStrength,
  onStoryboardNotesUpdated,
  expanded,
  onToggle,
  locations,
  characters,
  props,
  styleProfile,
  directorProfile,
  saving,
  busy,
  canModify,
  storyboardId,
  characterDriftRecommendations = [],
  autoSelectImprovedImage = true,
  onSave,
  onSceneUpdated,
  onDuplicate,
  onDelete,
}: StudioSortableSceneCardProps) {
  const t = useActiveTranslator();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
    disabled: !canModify,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const directorSummary = buildDirectorScenePreviewText(scene, directorProfile);
  const composition = buildSceneCompositionForScene(scene);
  const assetPlacement = buildAssetPlacementForSceneDetail(scene);
  const characterBlocking = buildCharacterBlockingForSceneDetail(scene);
  const heroLine = assetPlacement.characterPlacements.find(
    (c) => c.scale === "HERO" || c.placementPriority >= 85
  );
  const supportLine = assetPlacement.characterPlacements.find(
    (c) => c.characterId !== heroLine?.characterId && c.depth === "MIDGROUND"
  );
  const brandLine = assetPlacement.brandPlacements.find((b) => b.placementKind === "logo");
  const compositionStatus =
    composition.compositionWarnings.some((w) => w.severity === "warning") ?
      "attention"
    : composition.visualFocus.kind === "none" ?
      "incomplete"
    : "ready";
  const summary =
    directorSummary ||
    scene.description.trim() ||
    scene.action.trim() ||
    scene.title ||
    t("studio.storyboards.sceneUntitled");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-3xl border bg-white shadow-sm ${isDragging ? "border-[#006D52] opacity-90" : "border-zinc-200"}`}
    >
      <div className="flex items-start gap-3 p-4">
        {canModify ? (
          <button
            type="button"
            className="mt-1 cursor-grab touch-none rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-500 active:cursor-grabbing"
            aria-label={t("studio.storyboards.dragScene")}
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
        ) : null}
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onToggle}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-[#006D52]">
            {t("studio.storyboards.sceneLabel", { number: String(sceneIndex + 1) })}
          </p>
          <p className="mt-1 text-lg font-semibold text-zinc-900">{scene.title || summary}</p>
          {!expanded ? (
            <>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{summary}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-800">
                  {t(`studio.composition.type.${composition.compositionType}` as never)}
                </span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-700">
                  {composition.visualFocus.entityName ??
                    t(composition.visualFocus.labelKey as never)}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    compositionStatus === "ready"
                      ? "bg-emerald-50 text-emerald-800"
                      : compositionStatus === "attention"
                        ? "bg-amber-50 text-amber-900"
                        : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {t(`studio.composition.status.${compositionStatus}` as never)}
                </span>
              </div>
              {characterBlocking.characterActions.length > 0 ?
                <p className="mt-2 text-[11px] text-amber-900">
                  {characterBlocking.characterActions.slice(0, 3).map((row, i) => (
                    <span key={row.characterId}>
                      {i > 0 ? " · " : ""}
                      {row.characterName}: {t(`studio.blocking.action.${row.action}` as never)}
                    </span>
                  ))}
                </p>
              : null}
              {(heroLine || supportLine || brandLine) ?
                <p className="mt-2 text-[11px] text-teal-900">
                  {heroLine ?
                    <span>
                      {t("studio.placement.card.hero")}: {heroLine.characterName}{" "}
                      {t(`studio.placement.zone.${heroLine.zone}` as never)}{" "}
                      {t(`studio.placement.depth.${heroLine.depth}` as never)}{" "}
                      {t(`studio.placement.scale.${heroLine.scale}` as never)}
                    </span>
                  : null}
                  {supportLine ?
                    <span className={heroLine ? " · " : ""}>
                      {t("studio.placement.card.support")}: {supportLine.characterName}{" "}
                      {t(`studio.placement.zone.${supportLine.zone}` as never)}{" "}
                      {t(`studio.placement.depth.${supportLine.depth}` as never)}
                    </span>
                  : null}
                  {brandLine ?
                    <span className={heroLine || supportLine ? " · " : ""}>
                      {t("studio.placement.card.brand")}: {brandLine.brandName}{" "}
                      {t(`studio.placement.zone.${brandLine.zone}` as never)}
                    </span>
                  : null}
                </p>
              : null}
            </>
          ) : null}
        </button>
        {canModify ? (
          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDuplicate(scene.id)}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700"
            >
              {t("studio.storyboards.duplicateScene")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(scene.id)}
              className="rounded-full border border-red-200 px-3 py-1 text-xs font-semibold text-red-700"
            >
              {t("studio.storyboards.deleteScene")}
            </button>
          </div>
        ) : null}
      </div>
      {expanded ? (
        <div className="border-t border-zinc-100 px-4 pb-4 pt-2">
          <StudioSceneComposer
            storyboardId={storyboardId}
            characterDriftRecommendations={characterDriftRecommendations}
            scene={scene}
            sceneIndex={sceneIndex}
            sceneCount={sceneCount}
            flowScenes={flowScenes}
            storyboardTitle={storyboardTitle}
            storyboardDescription={storyboardDescription}
            aiDirectorPrompt={aiDirectorPrompt}
            aiDirectorStyleStrength={aiDirectorStyleStrength}
            onStoryboardNotesUpdated={onStoryboardNotesUpdated}
            locations={locations}
            characters={characters}
            props={props}
            styleProfile={styleProfile}
            directorProfile={directorProfile}
            saving={saving}
            canModify={canModify}
            autoSelectImprovedImage={autoSelectImprovedImage}
            onSave={(patch) => onSave(scene.id, patch)}
            onSceneUpdated={onSceneUpdated}
          />
        </div>
      ) : null}
    </div>
  );
}
