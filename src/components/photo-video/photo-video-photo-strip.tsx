"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { PhotoVideoPhoto } from "@/lib/photo-video/composition";
import { useActiveTranslator } from "@/i18n/client";

function SortableThumb({
  photo,
  index,
  selected,
  onSelect,
  onMove,
  onRemove,
  canMoveLeft,
  canMoveRight,
  itemJourney,
  onToggleIncluded,
}: {
  photo: PhotoVideoPhoto;
  index: number;
  selected: boolean;
  onSelect: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  canMoveLeft: boolean;
  canMoveRight: boolean;
  itemJourney?: boolean;
  onToggleIncluded?: (id: string) => void;
}) {
  const t = useActiveTranslator();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: photo.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : photo.included ? 1 : 0.45,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex w-[5.5rem] shrink-0 flex-col gap-1"
      data-testid={`px4a-photo-${index}`}
    >
      <div className="relative">
        <button
          type="button"
          aria-pressed={selected}
          aria-label={t("px4a.photo.select", { n: index + 1 })}
          onClick={() => onSelect(photo.id)}
          className={`relative h-24 w-[5.5rem] overflow-hidden rounded-xl border bg-zinc-100 ${
            selected ? "border-[#006D52] ring-2 ring-[#006D52]" : "border-zinc-200"
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
        </button>
        {itemJourney && photo.source === "LOCAL_UPLOAD" ? (
          <span className="absolute bottom-0.5 left-0.5 right-0.5 truncate rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
            {t("px4a.photo.videoOnly")}
          </span>
        ) : null}
        <button
          type="button"
          className="absolute left-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-black/45 text-sm font-bold text-white"
          aria-label={t("px4a.photo.dragHandle", { n: index + 1 })}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
      </div>
      <div className="flex justify-between gap-1">
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-lg border border-zinc-200 text-sm disabled:opacity-40"
          aria-label={t("px4a.photo.moveEarlier")}
          disabled={!canMoveLeft}
          onClick={() => onMove(photo.id, -1)}
        >
          ←
        </button>
        <button
          type="button"
          className="min-h-11 min-w-11 rounded-lg border border-zinc-200 text-sm disabled:opacity-40"
          aria-label={t("px4a.photo.moveLater")}
          disabled={!canMoveRight}
          onClick={() => onMove(photo.id, 1)}
        >
          →
        </button>
      </div>
      {itemJourney && photo.source === "HOME_CHEFF_LISTING" && onToggleIncluded ? (
        <button
          type="button"
          className="min-h-11 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-800"
          aria-pressed={photo.included}
          onClick={() => onToggleIncluded(photo.id)}
        >
          {photo.included ? t("px4a.photo.selected") : t("px4a.photo.use")}
        </button>
      ) : (
        <button
          type="button"
          className="min-h-11 rounded-lg text-xs font-medium text-zinc-600 underline"
          onClick={() => onRemove(photo.id)}
        >
          {t("px4a.photo.remove")}
        </button>
      )}
    </li>
  );
}

export function PhotoVideoPhotoStrip({
  photos,
  selectedPhotoId,
  onSelect,
  onReorder,
  onMove,
  onRemove,
  itemJourney = false,
  onToggleIncluded,
}: {
  photos: PhotoVideoPhoto[];
  selectedPhotoId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  itemJourney?: boolean;
  onToggleIncluded?: (id: string) => void;
}) {
  const t = useActiveTranslator();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = photos.map((photo) => photo.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(from, to);
  };

  if (photos.length === 0) {
    return <p className="text-sm text-zinc-600">{t("px4a.photos.empty")}</p>;
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={photos.map((photo) => photo.id)} strategy={horizontalListSortingStrategy}>
        <ul className="flex gap-3 overflow-x-auto pb-2" data-testid="px4a-photo-strip">
          {photos.map((photo, index) => (
            <SortableThumb
              key={photo.id}
              photo={photo}
              index={index}
              selected={photo.id === selectedPhotoId}
              onSelect={onSelect}
              onMove={onMove}
              onRemove={onRemove}
              itemJourney={itemJourney}
              onToggleIncluded={onToggleIncluded}
              canMoveLeft={index > 0}
              canMoveRight={index < photos.length - 1}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}
