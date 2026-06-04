"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StudioSceneComposer } from "@/components/studio/studio-scene-composer";
import { useActiveTranslator } from "@/i18n/client";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
} from "@/types/studio-api";
import type { StudioSceneUpdateInput } from "@/lib/studio-scene-validation";

type StudioSortableSceneCardProps = {
  scene: StudioSceneDetail;
  sceneIndex: number;
  expanded: boolean;
  onToggle: () => void;
  locations: StudioLocationListItem[];
  characters: StudioCharacterListItem[];
  props: StudioPropListItem[];
  styleProfile: StudioPromptStyleProfile;
  saving: boolean;
  busy: boolean;
  canModify: boolean;
  onSave: (sceneId: string, patch: StudioSceneUpdateInput) => Promise<void>;
  onDuplicate: (sceneId: string) => void;
  onDelete: (sceneId: string) => void;
};

export function StudioSortableSceneCard({
  scene,
  sceneIndex,
  expanded,
  onToggle,
  locations,
  characters,
  props,
  styleProfile,
  saving,
  busy,
  canModify,
  onSave,
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

  const summary =
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
            <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{summary}</p>
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
            scene={scene}
            locations={locations}
            characters={characters}
            props={props}
            styleProfile={styleProfile}
            saving={saving}
            onSave={(patch) => onSave(scene.id, patch)}
          />
        </div>
      ) : null}
    </div>
  );
}
