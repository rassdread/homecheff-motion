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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { AppCard } from "@/components/ui/app-card";
import { GradientButton } from "@/components/ui/gradient-button";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  INSTANT_PREMIUM_STYLE_LABELS,
  type InstantPremiumChipId,
  type InstantPremiumStylePreset,
} from "@/lib/instant-premium-prompt";
import { brand } from "@/lib/brand";
import {
  getClientImagePreprocessOptionsForRole,
  preprocessImageFile,
} from "@/lib/image-preprocess";
import { MAX_RAW_ANIMATION_IMAGE_BYTES } from "@/lib/animation-upload-limits";
import { getMaxWorkingImageBytesForUploadRole } from "@/lib/media-export-constants";
import type { CreateAnimationProjectImageInput, UploadImageResponse } from "@/types/animation-api";

const MIN_IMAGES = 3;
const MAX_IMAGES = 5;
const ORDER_ROLE_LABELS = ["Start (hook)", "Detail", "Context", "Extra", "End (CTA)"] as const;

const STYLE_OPTIONS: { id: InstantPremiumStylePreset; blurb: string }[] = [
  { id: "food_promo", blurb: "Warm light, appetizing tones" },
  { id: "clean_business", blurb: "Minimal, smooth, professional" },
  { id: "social_boost", blurb: "Energetic yet controlled" },
];

const CHIP_UI: { id: InstantPremiumChipId; label: string; append: string }[] = [
  { id: "slow_zoom_in", label: "Slow zoom in", append: "Slow zoom in. " },
  { id: "cinematic_soft", label: "Cinematic soft motion", append: "Cinematic soft motion. " },
  { id: "subtle_pan", label: "Subtle pan movement", append: "Subtle pan movement. " },
  { id: "close_up_focus", label: "Close-up focus", append: "Close-up focus. " },
  { id: "focus_details", label: "Focus on details", append: "Focus on details. " },
  { id: "subject_centered", label: "Keep subject centered", append: "Keep the subject centered. " },
  {
    id: "food_appetizing",
    label: "Make food look more appetizing",
    append: "Make the food look more appetizing. ",
  },
  { id: "more_dynamic", label: "Slightly more dynamic", append: "Slightly more dynamic motion. " },
  { id: "ai_decide", label: "Let AI decide", append: "" },
];

type LocalImage = {
  id: string;
  originalFileName: string;
  workingPreviewUrl: string;
  thumbnailPreviewUrl: string;
  mimeType: string;
  sizeBytes: number;
  optimizedBlob: Blob;
  thumbnailBlob: Blob;
};

function SortableThumb({
  item,
  index,
}: {
  item: LocalImage;
  index: number;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const role = ORDER_ROLE_LABELS[Math.min(index, ORDER_ROLE_LABELS.length - 1)];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative w-[100px] shrink-0 snap-center sm:w-[120px] ${
        isDragging ? "z-20 opacity-90" : ""
      }`}
    >
      <div className="rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-100">
          <Image
            src={item.workingPreviewUrl}
            alt=""
            fill
            className="object-cover"
            sizes="120px"
            unoptimized
          />
        </div>
        <button
          type="button"
          className="mt-2 w-full touch-none rounded-lg bg-zinc-900 py-2 text-[11px] font-medium text-white active:bg-zinc-700"
          {...attributes}
          {...listeners}
        >
          Drag
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">
        {index + 1} · {role}
      </p>
    </div>
  );
}

export default function InstantPremiumPage() {
  const router = useRouter();
  const session = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState("");
  const [stylePreset, setStylePreset] = useState<InstantPremiumStylePreset>("food_promo");
  const [durationSec, setDurationSec] = useState<8 | 15>(8);
  const [motionText, setMotionText] = useState("");
  const [chips, setChips] = useState<InstantPremiumChipId[]>([]);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedChipSet = useMemo(() => new Set(chips), [chips]);

  const onDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    setImages((items) => {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex < 0 || newIndex < 0) {
        return items;
      }
      return arrayMove(items, oldIndex, newIndex);
    });
  }, []);

  const toggleChip = useCallback((id: InstantPremiumChipId) => {
    if (id === "ai_decide") {
      setChips(["ai_decide"]);
      return;
    }
    setChips((prev) => {
      const withoutAi = prev.filter((c) => c !== "ai_decide");
      if (withoutAi.includes(id)) {
        return withoutAi.filter((c) => c !== id);
      }
      const next = [...withoutAi, id];
      return next.slice(-3);
    });
    const def = CHIP_UI.find((c) => c.id === id);
    if (def?.append) {
      setMotionText((t) => (t.includes(def.append.trim()) ? t : `${t}${def.append}`));
    }
  }, []);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const room = MAX_IMAGES - images.length;
      if (room <= 0) {
        setError(`You can add at most ${MAX_IMAGES} images.`);
        return;
      }
      const take = list.slice(0, room);
      const role = session.user?.role?.trim() || "user";
      const oversized = take.filter((f) => f.size > MAX_RAW_ANIMATION_IMAGE_BYTES).length;
      const safe = take.filter(
        (f) => f.size <= MAX_RAW_ANIMATION_IMAGE_BYTES && f.type.startsWith("image/")
      );
      if (safe.length === 0) {
        setError(oversized > 0 ? "One or more images are too large." : "Only image files are allowed.");
        return;
      }
      setError("");
      try {
        const processed = await Promise.all(
          safe.map(async (file) => {
            const p = await preprocessImageFile(file, getClientImagePreprocessOptionsForRole(role));
            const id = `${file.name}-${file.lastModified}-${Math.random().toString(36).slice(2, 9)}`;
            return {
              id,
              originalFileName: file.name,
              optimizedBlob: p.optimizedBlob,
              thumbnailBlob: p.thumbnailBlob,
              workingPreviewUrl: URL.createObjectURL(p.optimizedBlob),
              thumbnailPreviewUrl: URL.createObjectURL(p.thumbnailBlob),
              mimeType: p.mimeType,
              sizeBytes: p.optimizedBlob.size,
            } satisfies LocalImage;
          })
        );
        setImages((prev) => [...prev, ...processed]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const maxMb =
          Math.round((getMaxWorkingImageBytesForUploadRole(role) / (1024 * 1024)) * 10) / 10;
        setError(
          msg.includes("too large")
            ? "Image was too large. We automatically optimized it for you."
            : `Could not process images (target max ~${maxMb}MB).`
        );
      }
    },
    [images.length, session.user?.role]
  );

  const uploadToBlob = useCallback(async (img: LocalImage): Promise<UploadImageResponse> => {
    const formData = new FormData();
    formData.append(
      "workingImage",
      new File([img.optimizedBlob], `working-${img.id}`, { type: img.mimeType })
    );
    formData.append(
      "thumbnailImage",
      new File([img.thumbnailBlob], `thumb-${img.id}`, { type: img.mimeType })
    );
    formData.append("originalFileName", img.originalFileName);
    formData.append("mimeType", img.mimeType);
    formData.append("sizeBytes", String(img.sizeBytes));
    formData.append("clientUploadId", img.id);
    const res = await fetch("/api/uploads/images", { method: "POST", body: formData });
    if (!res.ok) {
      throw new Error("Upload failed");
    }
    return (await res.json()) as UploadImageResponse;
  }, []);

  const startCheckout = useCallback(async () => {
    if (images.length < MIN_IMAGES) {
      setError(`Select at least ${MIN_IMAGES} images.`);
      return;
    }
    setCheckoutBusy(true);
    setError("");
    try {
      const uploaded: CreateAnimationProjectImageInput[] = [];
      for (const img of images) {
        const up = await uploadToBlob(img);
        uploaded.push({
          fileName: img.originalFileName,
          previewUrl: up.thumbnailUrl,
          storageKey: up.workingStorageKey,
          workingImageUrl: up.workingImageUrl,
          mimeType: img.mimeType,
          sizeBytes: img.sizeBytes,
        });
      }
      const body = {
        images: uploaded,
        stylePreset,
        duration: durationSec,
        aspectRatio,
        userIntent: motionText.trim() || null,
        selectedChips: chips,
      };
      const res = await fetch("/api/instant-premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string;
        skipPayment?: boolean;
        url?: string;
        error?: string;
      };
      if (data.skipPayment) {
        if (!data.projectId) {
          throw new Error("Test mode response did not include projectId.");
        }
        router.push(`/animate?resume=${encodeURIComponent(data.projectId)}`);
        return;
      }
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Checkout could not start.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
    } finally {
      setCheckoutBusy(false);
    }
  }, [aspectRatio, chips, durationSec, images, motionText, router, stylePreset, uploadToBlob]);

  if (!session.resolved) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <AppCard>
            <p className="text-sm text-zinc-600">Loading…</p>
          </AppCard>
        </div>
      </main>
    );
  }

  if (!session.user) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <AppCard>
            <h1 className="text-xl font-semibold">Sign in required</h1>
            <p className="mt-2 text-sm text-zinc-600">Instant Premium needs an account.</p>
            <div className="mt-6 flex gap-3">
              <GradientButton href="/login">Log in</GradientButton>
              <Link href="/signup" className="text-sm font-medium text-emerald-800 underline">
                Sign up
              </Link>
            </div>
          </AppCard>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen flex-1 ${brand.softGradientBg}`}>
      <div className="mx-auto w-full max-w-lg px-4 py-8 pb-24 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              {brand.productName}
            </p>
            <h1 className="text-2xl font-bold tracking-tight">Instant Premium Video</h1>
          </div>
          <Link href="/animate" className="text-xs font-medium text-zinc-600 underline">
            Classic flow
          </Link>
        </div>

        <div className="mb-4 flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full ${i + 1 <= step ? "bg-emerald-600" : "bg-zinc-200"}`}
            />
          ))}
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        {step === 1 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">1 · Upload images</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Add {MIN_IMAGES}–{MAX_IMAGES} photos. Order can be changed in the next step.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const fl = e.target.files;
                if (fl) {
                  void addFiles(fl);
                }
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-4 w-full rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/40 py-8 text-sm font-medium text-emerald-900"
            >
              Tap to choose images
            </button>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {images.map((im) => (
                <div key={im.id} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-100">
                  <Image src={im.workingPreviewUrl} alt="" fill className="object-cover" sizes="120px" unoptimized />
                  <button
                    type="button"
                    className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white"
                    onClick={() => {
                      URL.revokeObjectURL(im.workingPreviewUrl);
                      URL.revokeObjectURL(im.thumbnailPreviewUrl);
                      setImages((prev) => prev.filter((x) => x.id !== im.id));
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-zinc-500">
              {images.length} / {MAX_IMAGES} images
            </p>
            <GradientButton
              type="button"
              className="mt-6 w-full"
              disabled={images.length < MIN_IMAGES}
              onClick={() => setStep(2)}
            >
              Continue
            </GradientButton>
          </AppCard>
        ) : null}

        {step === 2 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">2 · Reorder</h2>
            <p className="mt-1 text-sm text-zinc-600">Drag horizontally. This order is sent to the AI.</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={images.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {images.map((im, idx) => (
                    <SortableThumb key={im.id} item={im} index={idx} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(1)}>
                Back
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(3)}>
                Continue
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 3 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">3 · Style</h2>
            <div className="mt-4 grid gap-3">
              {STYLE_OPTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStylePreset(s.id)}
                  className={`rounded-2xl border p-4 text-left transition ${
                    stylePreset === s.id ? "border-emerald-500 bg-emerald-50" : "border-zinc-200 bg-white"
                  }`}
                >
                  <p className="font-semibold">{INSTANT_PREMIUM_STYLE_LABELS[s.id]}</p>
                  <p className="mt-1 text-sm text-zinc-600">{s.blurb}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(2)}>
                Back
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(4)}>
                Continue
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 4 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">4 · Duration</h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => setDurationSec(8)}
                className={`rounded-2xl border p-4 text-left ${
                  durationSec === 8 ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                <p className="font-semibold">8 seconds</p>
                <p className="text-sm text-zinc-600">Fast & engaging</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">€1.99</p>
              </button>
              <button
                type="button"
                onClick={() => setDurationSec(15)}
                className={`rounded-2xl border p-4 text-left ${
                  durationSec === 15 ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                <p className="font-semibold">15 seconds</p>
                <p className="text-sm text-zinc-600">More detail & storytelling</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">€2.99</p>
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(3)}>
                Back
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(5)}>
                Continue
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 5 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">5 · Motion & feeling</h2>
            <label className="mt-3 block text-sm font-medium text-zinc-800">What kind of motion or feeling do you want?</label>
            <textarea
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Optional — e.g. calm, premium, cozy kitchen light…"
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-xs text-zinc-400">{motionText.length}/500</p>
            <p className="mt-4 text-sm font-medium text-zinc-800">Or choose a motion</p>
            <p className="text-xs text-zinc-500">Pick 1–3 motions (optional); max 3 selected</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {CHIP_UI.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selectedChipSet.has(c.id) ? "border-emerald-600 bg-emerald-100 text-emerald-950" : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p className="group relative mt-4 inline-flex cursor-help text-xs text-zinc-500">
              <span className="border-b border-dotted border-zinc-400">Why motion isn’t magic</span>
              <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-64 rounded-lg border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700 shadow-lg group-hover:block group-focus-within:block">
                Motion and feeling can be influenced, but real actions (walking, cooking, etc.) are not guaranteed. The AI keeps movement cinematic and controlled.
              </span>
            </p>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(4)}>
                Back
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(6)}>
                Continue
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 6 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">6 · Aspect ratio</h2>
            <p className="mt-1 text-sm text-zinc-600">Default is vertical — best for Reels & TikTok.</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setAspectRatio("9:16")}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium ${
                  aspectRatio === "9:16" ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                Vertical 9:16
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium ${
                  aspectRatio === "16:9" ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                Horizontal 16:9
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(5)}>
                Back
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(7)}>
                Continue
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 7 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">7 · Pay & generate</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <span className="text-zinc-500">Style:</span> {INSTANT_PREMIUM_STYLE_LABELS[stylePreset]}
              </li>
              <li>
                <span className="text-zinc-500">Duration:</span> {durationSec}s —{" "}
                {durationSec === 8 ? "€1.99" : "€2.99"}
              </li>
              <li>
                <span className="text-zinc-500">Format:</span> {aspectRatio}
              </li>
              <li>
                <span className="text-zinc-500">Images:</span> {images.length}
              </li>
            </ul>
            <p className="mt-4 text-xs text-zinc-500">
              Secure checkout with Stripe. After payment you&apos;ll return here, then we open the progress screen.
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              If test mode is enabled on the server, payment is skipped automatically.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" className="w-full rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(6)}>
                Back
              </button>
              <GradientButton type="button" className="w-full" disabled={checkoutBusy} onClick={() => void startCheckout()}>
                {checkoutBusy
                  ? "Preparing…"
                  : `Pay ${durationSec === 8 ? "€1.99" : "€2.99"} with Stripe / Generate video (test mode)`}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}
      </div>
    </main>
  );
}
