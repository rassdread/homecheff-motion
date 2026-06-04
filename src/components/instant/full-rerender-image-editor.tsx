"use client";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCallback, useMemo, useRef, useState } from "react";
import { SafePreviewImage } from "@/components/ui/safe-preview-image";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantMode } from "@/lib/instant-premium-mode-types";
import {
  maxImagesForInstantMode,
  minImagesForInstantMode,
} from "@/lib/instant-premium-mode-types";
import {
  applyUploadToExistingFullRerenderImage,
  uploadFullRerenderImageFile,
} from "@/lib/full-rerender-editor-upload";
import type { FullRerenderEditorImage, FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";
import {
  appendFullRerenderSlot,
  computeImageChangeAuditFromSlots,
  countFullRerenderAttachedImages,
  moveFullRerenderSlotsByImageId,
  removeFullRerenderSlotAt,
  replaceFullRerenderSlotImage,
} from "@/lib/full-rerender-editor-slots";
import { resolveInstantPremiumOutputPlan } from "@/lib/instant-premium-output-plan";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import { ImageUploadError } from "@/lib/instant-image-upload-client";

const ORDER_ROLE_KEY_SUFFIXES = ["first", "middle", "middle", "middle", "last"] as const;

function toPreviewInput(image: FullRerenderEditorImage) {
  return {
    id: image.id,
    remoteWorkingUrl: image.remoteWorkingUrl,
    remoteThumbnailUrl: image.remoteThumbnailUrl ?? image.previewUrl,
    previewUrl: image.previewUrl,
  };
}

function SortableSceneThumb({
  image,
  index,
  roleLabel,
  dragLabel,
  onReplace,
  onRemove,
  removeDisabled,
  busy,
}: {
  image: FullRerenderEditorImage;
  index: number;
  roleLabel: string;
  dragLabel: string;
  onReplace: () => void;
  onRemove: () => void;
  removeDisabled: boolean;
  busy: boolean;
}) {
  const t = useActiveTranslator();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-[100px] shrink-0 snap-center sm:w-[120px] ${
        isDragging ? "z-20 opacity-90" : ""
      }`}
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
        <p className="px-1 pt-1 text-[10px] font-semibold text-zinc-600">
          {t("instant.fullRerender.images.sceneLabel", { number: index + 1 })}
        </p>
        <div className="relative mt-1 aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100">
          <SafePreviewImage
            image={toPreviewInput(image)}
            alt=""
            fill
            className="object-cover"
            sizes="120px"
          />
        </div>
        <button
          type="button"
          className="mt-2 w-full touch-none rounded-lg bg-zinc-900 py-2 text-[11px] font-medium text-white active:bg-zinc-700"
          {...attributes}
          {...listeners}
          disabled={busy}
        >
          {dragLabel}
        </button>
        <div className="mt-1.5 flex flex-col gap-1">
          <button
            type="button"
            onClick={onReplace}
            disabled={busy}
            className="w-full rounded-lg border border-[#0067B1]/30 bg-[#0067B1]/5 px-2 py-1.5 text-[10px] font-semibold text-[#0067B1] disabled:opacity-50"
          >
            {t("instant.fullRerender.images.replace")}
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={removeDisabled || busy}
            className="w-full rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[10px] font-semibold text-red-800 disabled:opacity-50"
          >
            {t("instant.fullRerender.images.remove")}
          </button>
        </div>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">
        {index + 1} · {roleLabel}
      </p>
    </div>
  );
}

type Props = {
  slots: FullRerenderEditorSlot[];
  onSlotsChange: (slots: FullRerenderEditorSlot[]) => void;
  initialImageIds: string[];
  initialPreviewUrls: string[];
  instantMode: InstantMode;
  transitionSeconds: number;
  uploadRole: string;
  disabled?: boolean;
};

export function FullRerenderImageEditor({
  slots,
  onSlotsChange,
  initialImageIds,
  initialPreviewUrls,
  instantMode,
  transitionSeconds,
  uploadRole,
  disabled,
}: Props) {
  const t = useActiveTranslator();
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const addInputRef = useRef<HTMLInputElement>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const minImages = minImagesForInstantMode(instantMode);
  const maxImages = maxImagesForInstantMode(instantMode);
  const attachedCount = countFullRerenderAttachedImages(slots);
  const images = useMemo(
    () => slots.flatMap((slot) => (slot.image ? [slot.image] : [])),
    [slots]
  );

  const initialPreview = initialPreviewUrls;

  const audit = useMemo(
    () => computeImageChangeAuditFromSlots(initialImageIds, slots),
    [initialImageIds, slots]
  );

  const outputPlan = useMemo(() => {
    const sceneTexts = slots.map((slot, index) =>
      instantSceneTextFromDraft(slot.text, index, slots.length)
    );
    return resolveInstantPremiumOutputPlan({
      imageCount: Math.max(attachedCount, minImages),
      instantMode,
      transitionSeconds,
      sceneTexts,
    });
  }, [attachedCount, instantMode, minImages, slots, transitionSeconds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }
      onSlotsChange(moveFullRerenderSlotsByImageId(slots, String(active.id), String(over.id)));
    },
    [onSlotsChange, slots]
  );

  const handleFile = useCallback(
    async (file: File, mode: "replace" | "add") => {
      setUploadBusy(true);
      setUploadError("");
      try {
        if (mode === "replace" && replaceIndex !== null) {
          const existing = slots[replaceIndex]?.image;
          if (!existing) {
            return;
          }
          const { upload } = await uploadFullRerenderImageFile(file, uploadRole);
          const nextImage = applyUploadToExistingFullRerenderImage(existing, upload, file.name);
          onSlotsChange(replaceFullRerenderSlotImage(slots, replaceIndex, nextImage));
        } else if (mode === "add") {
          if (attachedCount >= maxImages) {
            setUploadError(t("instant.errors.maxImages", { max: maxImages }));
            return;
          }
          const { image } = await uploadFullRerenderImageFile(file, uploadRole);
          onSlotsChange(appendFullRerenderSlot(slots, image, transitionSeconds));
        }
      } catch (e) {
        const msg =
          e instanceof ImageUploadError ? e.message
          : e instanceof Error ? e.message
          : t("instant.fullRerender.images.uploadFailed");
        setUploadError(msg);
      } finally {
        setUploadBusy(false);
        setReplaceIndex(null);
      }
    },
    [
      attachedCount,
      maxImages,
      onSlotsChange,
      replaceIndex,
      slots,
      t,
      transitionSeconds,
      uploadRole,
    ]
  );

  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
      <h3 className="text-sm font-semibold text-zinc-900">{t("instant.fullRerender.images.title")}</h3>
      <p className="mt-1 text-xs leading-relaxed text-zinc-600">
        {t("instant.fullRerender.images.subtitle")}
      </p>

      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file, "replace");
          }
          e.target.value = "";
        }}
      />
      <input
        ref={addInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            void handleFile(file, "add");
          }
          e.target.value = "";
        }}
      />

      {uploadError ?
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {uploadError}
        </p>
      : null}

      {images.length > 0 ?
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={images.map((im) => im.id)} strategy={horizontalListSortingStrategy}>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
              {images.map((image, idx) => {
                const slotIndex = slots.findIndex((s) => s.image?.id === image.id);
                return (
                  <SortableSceneThumb
                    key={image.id}
                    image={image}
                    index={idx}
                    roleLabel={t(
                      `instant.orderRole.${ORDER_ROLE_KEY_SUFFIXES[Math.min(idx, ORDER_ROLE_KEY_SUFFIXES.length - 1)]}` as never
                    )}
                    dragLabel={t("instant.step2.drag")}
                    busy={uploadBusy || Boolean(disabled)}
                    removeDisabled={attachedCount <= minImages}
                    onReplace={() => {
                      setReplaceIndex(slotIndex >= 0 ? slotIndex : idx);
                      replaceInputRef.current?.click();
                    }}
                    onRemove={() => {
                      if (attachedCount <= minImages) {
                        setUploadError(
                          t("instant.fullRerender.images.minWarning", { min: minImages })
                        );
                        return;
                      }
                      if (slotIndex >= 0) {
                        onSlotsChange(removeFullRerenderSlotAt(slots, slotIndex));
                      }
                    }}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      : null}

      {attachedCount < maxImages ?
        <button
          type="button"
          disabled={uploadBusy || disabled}
          onClick={() => addInputRef.current?.click()}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-[#0067B1]/30 bg-[#0067B1]/5 px-4 py-3 text-sm font-semibold text-[#0067B1] disabled:opacity-50"
        >
          {uploadBusy ?
            t("instant.fullRerender.images.uploading")
          : t("instant.fullRerender.images.add")}
        </button>
      : null}

      <p className="mt-2 text-xs text-zinc-500">
        {t("instant.step1.counter", { count: attachedCount, max: maxImages })}
      </p>

      <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3">
        <p className="text-xs font-semibold text-zinc-800">
          {t("instant.fullRerender.images.previewTitle")}
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("instant.fullRerender.images.previewBefore")}
            </p>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {initialPreview.map((src, index) => (
                <div
                  key={`before-${initialImageIds[index] ?? index}`}
                  className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100"
                >
                  {src ?
                    <SafePreviewImage src={src} alt="" fill className="object-cover" sizes="40px" />
                  : null}
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
              {t("instant.fullRerender.images.previewAfter")}
            </p>
            <div className="mt-2 flex gap-1 overflow-x-auto">
              {images.map((image) => (
                <div
                  key={`after-${image.id}`}
                  className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100"
                >
                  <SafePreviewImage
                    image={toPreviewInput(image)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <ul className="mt-3 space-y-1 text-[11px] text-zinc-600">
          <li>
            {t("instant.fullRerender.images.statsScenes", { count: attachedCount })}
          </li>
          <li>
            {t("instant.fullRerender.images.statsDuration", {
              seconds: outputPlan.storyboardDurationSeconds,
            })}
          </li>
          {audit.addedCount > 0 ?
            <li>{t("instant.fullRerender.images.statsAdded", { count: audit.addedCount })}</li>
          : null}
          {audit.removedCount > 0 ?
            <li>{t("instant.fullRerender.images.statsRemoved", { count: audit.removedCount })}</li>
          : null}
          {audit.replacedCount > 0 ?
            <li>{t("instant.fullRerender.images.statsReplaced", { count: audit.replacedCount })}</li>
          : null}
          {audit.reordered ?
            <li>{t("instant.fullRerender.images.statsReordered")}</li>
          : null}
        </ul>
      </div>
    </section>
  );
}
