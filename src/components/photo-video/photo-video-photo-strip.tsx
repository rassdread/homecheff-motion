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
import { formatClipSeconds, isVideoPhoto, videoClipDuration } from "@/lib/photo-video/media-clip";
import { useActiveTranslator, useLocale } from "@/i18n/client";

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
  const [locale] = useLocale();
  const video = isVideoPhoto(photo);
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
          aria-current={selected ? "true" : undefined}
          aria-label={t(video ? "px4a.video.select" : "px4a.photo.select", { n: index + 1 })}
          onClick={() => onSelect(photo.id)}
          className={`relative h-24 w-[5.5rem] overflow-hidden rounded-xl border bg-zinc-100 ${
            selected ? "border-[#006D52] ring-2 ring-[#006D52]" : "border-zinc-200"
          }`}
        >
          {photo.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.previewUrl} alt="" className="h-full w-full object-cover" />
          ) : video && photo.video?.objectUrl ? (
            <span
              className="flex h-full w-full flex-col items-center justify-center gap-1 bg-zinc-200 px-1 text-center"
              data-testid={`px4a-video-preparing-${index}`}
            >
              <span className="text-[10px] font-medium text-zinc-600">{t("px4a.slice1b.media.preparing")}</span>
            </span>
          ) : (
            <span className="block h-full w-full bg-zinc-200" />
          )}
          {video ?
            <span
              className="pointer-events-none absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/55 to-transparent p-1"
              data-testid={`px4a-video-thumb-${index}`}
            >
              <span
                aria-hidden="true"
                className="rounded bg-[#006D52] px-1 py-0.5 text-[9px] font-bold uppercase text-white"
              >
                {t("px4a.slice1b.media.videoBadge")}
              </span>
              <span className="rounded bg-black/60 px-1 text-[9px] font-semibold text-white">
                {formatClipSeconds(videoClipDuration(photo), locale)}
              </span>
            </span>
          : null}
        </button>
        {itemJourney && photo.source === "LOCAL_UPLOAD" ? (
          <span className="absolute bottom-0.5 left-0.5 right-0.5 truncate rounded bg-black/55 px-1 py-0.5 text-[9px] font-medium text-white">
            {t("px4a.photo.videoOnly")}
          </span>
        ) : null}
        <button
          type="button"
          className="absolute left-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-lg bg-black/45 text-sm font-bold text-white"
          aria-label={t(video ? "px4a.video.dragHandle" : "px4a.photo.dragHandle", { n: index + 1 })}
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

function AddMediaTiles({
  fileInputId,
  videoInputId,
  disabled,
}: {
  fileInputId: string;
  videoInputId: string;
  disabled: boolean;
}) {
  const t = useActiveTranslator();
  const photoLabel = `+ ${t("px4a.photos.addTile")}`;
  const videoLabel = `+ ${t("px4a.photos.addVideoTile")}`;
  const trigger = (id: string) => {
    const input = document.getElementById(id);
    if (input instanceof HTMLInputElement) input.click();
  };
  return (
    <>
      <li className="flex w-[5.5rem] shrink-0 flex-col gap-1" data-testid="px4a-add-photo-tile">
        <button
          type="button"
          disabled={disabled}
          aria-label={photoLabel}
          className={`flex h-24 min-h-11 w-[5.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-[#006D52] bg-[#006D52]/8 px-1 text-center text-xs font-semibold leading-tight text-[#006D52] ${
            disabled ? "cursor-not-allowed opacity-40" : ""
          }`}
          onClick={() => trigger(fileInputId)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            +
          </span>
          <span>{t("px4a.photos.addTile")}</span>
        </button>
      </li>
      <li className="flex w-[5.5rem] shrink-0 flex-col gap-1" data-testid="px4a-add-video-tile">
        <button
          type="button"
          disabled={disabled}
          aria-label={videoLabel}
          className={`flex h-24 min-h-11 w-[5.5rem] flex-col items-center justify-center rounded-xl border border-dashed border-[#006D52] bg-[#006D52]/8 px-1 text-center text-xs font-semibold leading-tight text-[#006D52] ${
            disabled ? "cursor-not-allowed opacity-40" : ""
          }`}
          onClick={() => trigger(videoInputId)}
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ▶
          </span>
          <span>{t("px4a.photos.addVideoTile")}</span>
        </button>
      </li>
    </>
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
  fileInputId,
  videoInputId,
  canAdd = false,
}: {
  photos: PhotoVideoPhoto[];
  selectedPhotoId: string | null;
  onSelect: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onRemove: (id: string) => void;
  itemJourney?: boolean;
  onToggleIncluded?: (id: string) => void;
  fileInputId: string;
  videoInputId: string;
  canAdd?: boolean;
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
    return (
      <div className="space-y-2">
        <p className="text-sm text-zinc-600">{t("px4a.photos.empty")}</p>
        <ul className="flex gap-3 overflow-x-auto pb-2" data-testid="px4a-photo-strip">
          <AddMediaTiles fileInputId={fileInputId} videoInputId={videoInputId} disabled={!canAdd} />
        </ul>
      </div>
    );
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
          <AddMediaTiles fileInputId={fileInputId} videoInputId={videoInputId} disabled={!canAdd} />
        </ul>
      </SortableContext>
    </DndContext>
  );
}
