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
import { useActiveTranslator, useLocale } from "@/i18n/client";
import { LockedTextLayersEditor, type LockedTextLayerDraft } from "@/components/instant/locked-text-layers-editor";
import {
  createLockedTextLayer,
  type TextImplyingChipId,
  TEXT_IMPLYING_CHIP_IDS,
} from "@/lib/locked-text-layer";
import {
  type InstantPremiumContinuityStrength,
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
import type {
  CreateAnimationProjectImageInput,
  InstantPremiumCreateAndGenerateErrorBody,
  InstantPremiumCreateAndGenerateOkBody,
  UploadImageResponse,
} from "@/types/animation-api";

const MIN_IMAGES = 3;

function extractInstantPremiumCreateProjectId(body: unknown, pageOrigin: string): string | null {
  if (!body || typeof body !== "object") {
    return null;
  }
  const o = body as Record<string, unknown>;
  const rawId = o.projectId;
  if (typeof rawId === "string" && rawId.trim()) {
    return rawId.trim();
  }
  const route = o.progressRoute;
  if (typeof route !== "string" || !route.trim()) {
    return null;
  }
  const trimmed = route.trim();
  try {
    const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, pageOrigin);
    const id = url.searchParams.get("projectId")?.trim();
    return id && id.length > 0 ? id : null;
  } catch {
    const q = trimmed.indexOf("?");
    if (q < 0) {
      return null;
    }
    const id = new URLSearchParams(trimmed.slice(q + 1)).get("projectId")?.trim();
    return id && id.length > 0 ? id : null;
  }
}
const MAX_IMAGES = 5;
const ORDER_ROLE_KEY_SUFFIXES = ["start", "detail", "context", "extra", "end"] as const;

const STYLE_OPTIONS: { id: InstantPremiumStylePreset; blurbKey: string }[] = [
  { id: "food_promo", blurbKey: "instant.style.food_promo.blurb" },
  { id: "clean_business", blurbKey: "instant.style.clean_business.blurb" },
  { id: "social_boost", blurbKey: "instant.style.social_boost.blurb" },
];

const CHIP_UI: { id: InstantPremiumChipId; labelKey: string; appendKey: string }[] = [
  { id: "slow_zoom_in", labelKey: "instant.chip.slow_zoom_in", appendKey: "instant.chipAppend.slow_zoom_in" },
  { id: "cinematic_soft", labelKey: "instant.chip.cinematic_soft", appendKey: "instant.chipAppend.cinematic_soft" },
  { id: "subtle_pan", labelKey: "instant.chip.subtle_pan", appendKey: "instant.chipAppend.subtle_pan" },
  { id: "close_up_focus", labelKey: "instant.chip.close_up_focus", appendKey: "instant.chipAppend.close_up_focus" },
  { id: "focus_details", labelKey: "instant.chip.focus_details", appendKey: "instant.chipAppend.focus_details" },
  { id: "subject_centered", labelKey: "instant.chip.subject_centered", appendKey: "instant.chipAppend.subject_centered" },
  {
    id: "food_appetizing",
    labelKey: "instant.chip.food_appetizing",
    appendKey: "instant.chipAppend.food_appetizing",
  },
  { id: "more_dynamic", labelKey: "instant.chip.more_dynamic", appendKey: "instant.chipAppend.more_dynamic" },
  { id: "ai_decide", labelKey: "instant.chip.ai_decide", appendKey: "instant.chipAppend.ai_decide" },
];

const TEXT_CHIP_UI: { id: TextImplyingChipId; labelKey: string }[] = [
  { id: "text_caption", labelKey: "instant.textChip.caption" },
  { id: "text_cta", labelKey: "instant.textChip.cta" },
  { id: "text_price", labelKey: "instant.textChip.price" },
  { id: "text_slogan", labelKey: "instant.textChip.slogan" },
  { id: "text_product_title", labelKey: "instant.textChip.productTitle" },
  { id: "text_menu_label", labelKey: "instant.textChip.menuLabel" },
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
  roleLabel,
  dragLabel,
}: {
  item: LocalImage;
  index: number;
  roleLabel: string;
  dragLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
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
          {dragLabel}
        </button>
      </div>
      <p className="mt-1.5 text-center text-[10px] font-semibold text-zinc-500">
        {index + 1} · {roleLabel}
      </p>
    </div>
  );
}

export default function InstantPremiumPage() {
  const router = useRouter();
  const t = useActiveTranslator();
  const [locale] = useLocale();
  const session = useAuthSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [images, setImages] = useState<LocalImage[]>([]);
  const [error, setError] = useState("");
  const [stylePreset, setStylePreset] = useState<InstantPremiumStylePreset>("food_promo");
  const [durationSec, setDurationSec] = useState<8 | 15>(8);
  const [motionText, setMotionText] = useState("");
  const [continuityStrength, setContinuityStrength] =
    useState<InstantPremiumContinuityStrength>("balanced");
  const [chips, setChips] = useState<(InstantPremiumChipId | TextImplyingChipId)[]>([]);
  const [lockedTextMode, setLockedTextMode] = useState(true);
  const [lockedTextLayers, setLockedTextLayers] = useState<LockedTextLayerDraft[]>([]);
  const [chipTextBySlot, setChipTextBySlot] = useState<Partial<Record<TextImplyingChipId, string>>>({});
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [premiumMode] = useState<"test" | "paid">(() => {
    if (typeof document === "undefined") {
      return "test";
    }
    const mode = document.body.dataset.instantPremiumMode;
    return mode === "paid" ? "paid" : "test";
  });
  const styleLabel = useCallback(
    (style: InstantPremiumStylePreset) => t(`instant.style.${style}.title` as never),
    [t]
  );

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

  const toggleChip = useCallback((id: InstantPremiumChipId | TextImplyingChipId) => {
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
    const append = def ? t(def.appendKey as never) : "";
    if (append.trim()) {
      setMotionText((text) => (text.includes(append.trim()) ? text : `${text}${append}`));
    }
  }, [t]);

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      const room = MAX_IMAGES - images.length;
      if (room <= 0) {
        setError(t("instant.errors.maxImages", { max: MAX_IMAGES }));
        return;
      }
      const take = list.slice(0, room);
      const role = session.user?.role?.trim() || "user";
      const oversized = take.filter((f) => f.size > MAX_RAW_ANIMATION_IMAGE_BYTES).length;
      const safe = take.filter(
        (f) => f.size <= MAX_RAW_ANIMATION_IMAGE_BYTES && f.type.startsWith("image/")
      );
      if (safe.length === 0) {
        setError(
          oversized > 0
            ? t("instant.errors.fileTooLarge")
            : t("instant.errors.invalidImageType")
        );
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
            ? t("instant.errors.autoOptimized")
            : t("instant.errors.processFailed", { max: maxMb })
        );
      }
    },
    [images.length, session.user?.role, t]
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
      throw new Error(t("instant.errors.uploadFailed"));
    }
    return (await res.json()) as UploadImageResponse;
  }, [t]);

  const startCheckout = useCallback(async () => {
    if (images.length < MIN_IMAGES) {
      setError(t("instant.errors.minImages", { min: MIN_IMAGES }));
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
      const explicitLayers = lockedTextLayers
        .filter((l) => l.text.trim())
        .map((l) =>
          createLockedTextLayer({
            id: l.id,
            text: l.text,
            language: l.language,
            x: l.x,
            y: l.y,
            animation: l.animation,
            startMs: l.startMs,
            durationMs: l.durationMs,
            endMs: l.endMs,
            fontFamily: l.fontFamily,
            fontSize: l.fontSize,
            fontWeight: l.fontWeight,
            color: l.color,
            backgroundColor: l.backgroundColor,
            textAlign: l.textAlign,
          })
        );
      const body = {
        images: uploaded,
        stylePreset,
        duration: durationSec,
        aspectRatio,
        uiLanguage: locale,
        userIntent: motionText.trim() || null,
        selectedChips: chips,
        continuityStrength,
        lockedTextMode,
        lockedTextLayers: explicitLayers,
        chipTextBySlot,
      };
      if (premiumMode === "test") {
        const testResponse = await fetch("/api/instant-premium/create-and-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const responseText = await testResponse.text();
        let parsedBody: unknown = null;
        try {
          parsedBody = responseText ? JSON.parse(responseText) : null;
        } catch {
          parsedBody = null;
        }
        console.info(
          "[hc-instant-premium-client]",
          JSON.stringify({
            action: "test_mode_generate_response",
            httpStatus: testResponse.status,
            responseJson: responseText,
          })
        );
        const pageOrigin =
          typeof window !== "undefined" ? window.location.origin : "http://localhost";
        const resolvedProjectId = extractInstantPremiumCreateProjectId(parsedBody, pageOrigin);
        const isAdmin = session.user?.role?.trim() === "admin";
        const adminSuffix =
          isAdmin && responseText.length > 0
            ? ` ${responseText.length > 4000 ? `${responseText.slice(0, 4000)}…` : responseText}`
            : "";

        if (!testResponse.ok) {
          const errBody = parsedBody as Partial<InstantPremiumCreateAndGenerateErrorBody> | null;
          const msg = errBody?.error ?? t("instant.errors.checkoutFailed");
          throw new Error(`${msg}${adminSuffix}`);
        }

        const okBody = parsedBody as Partial<InstantPremiumCreateAndGenerateOkBody> | null;
        if (!resolvedProjectId) {
          throw new Error(`${t("instant.errors.testModeBadResponse")}${adminSuffix}`);
        }

        const progressRoute =
          typeof okBody?.progressRoute === "string" && okBody.progressRoute.trim()
            ? okBody.progressRoute.trim()
            : `/animate/instant/progress?projectId=${encodeURIComponent(resolvedProjectId)}`;

        console.info("[hc-instant-premium]", {
          action: "redirect_to_progress",
          projectId: resolvedProjectId,
          projectType: "instant_premium",
          progressRoute,
        });
        router.push(progressRoute);
        return;
      }

      const res = await fetch("/api/instant-premium/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        projectId?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? t("instant.errors.checkoutStartFailed"));
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : t("instant.errors.checkoutFailed"));
    } finally {
      setCheckoutBusy(false);
    }
  }, [
    aspectRatio,
    chipTextBySlot,
    chips,
    continuityStrength,
    durationSec,
    images,
    locale,
    lockedTextLayers,
    lockedTextMode,
    motionText,
    premiumMode,
    router,
    session.user,
    stylePreset,
    t,
    uploadToBlob,
  ]);

  if (!session.resolved) {
    return (
      <main className={`flex-1 ${brand.softGradientBg}`}>
        <div className="mx-auto w-full max-w-lg px-4 py-10">
          <AppCard>
            <p className="text-sm text-zinc-600">{t("instant.loading")}</p>
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
            <h1 className="text-xl font-semibold">{t("instant.auth.requiredTitle")}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t("instant.auth.requiredDescription")}</p>
            <div className="mt-6 flex gap-3">
              <GradientButton href="/login">{t("instant.auth.login")}</GradientButton>
              <Link href="/signup" className="text-sm font-medium text-emerald-800 underline">
                {t("instant.auth.signup")}
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
            <h1 className="text-2xl font-bold tracking-tight">{t("instant.title")}</h1>
          </div>
          <Link href="/animate" className="text-xs font-medium text-zinc-600 underline">
            {t("instant.classicFlow")}
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
            <h2 className="text-lg font-semibold">{t("instant.step1.title")}</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {t("instant.step1.description", { min: MIN_IMAGES, max: MAX_IMAGES })}
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
              {t("instant.step1.pick")}
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
              {t("instant.step1.counter", { count: images.length, max: MAX_IMAGES })}
            </p>
            <GradientButton
              type="button"
              className="mt-6 w-full"
              disabled={images.length < MIN_IMAGES}
              onClick={() => setStep(2)}
            >
              {t("instant.common.continue")}
            </GradientButton>
          </AppCard>
        ) : null}

        {step === 2 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step2.title")}</h2>
            <p className="mt-1 text-sm text-zinc-600">{t("instant.step2.description")}</p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={images.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {images.map((im, idx) => (
                    <SortableThumb
                      key={im.id}
                      item={im}
                      index={idx}
                      roleLabel={t(
                        `instant.orderRole.${ORDER_ROLE_KEY_SUFFIXES[Math.min(idx, ORDER_ROLE_KEY_SUFFIXES.length - 1)]}` as never
                      )}
                      dragLabel={t("instant.step2.drag")}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(1)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(3)}>
                {t("instant.common.continue")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 3 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step3.title")}</h2>
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
                  <p className="font-semibold">{styleLabel(s.id)}</p>
                  <p className="mt-1 text-sm text-zinc-600">{t(s.blurbKey as never)}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(2)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(4)}>
                {t("instant.common.continue")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 4 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step4.title")}</h2>
            <div className="mt-4 grid gap-3">
              <button
                type="button"
                onClick={() => setDurationSec(8)}
                className={`rounded-2xl border p-4 text-left ${
                  durationSec === 8 ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                <p className="font-semibold">{t("instant.step4.option8.title")}</p>
                <p className="text-sm text-zinc-600">{t("instant.step4.option8.subtitle")}</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">€1.99</p>
              </button>
              <button
                type="button"
                onClick={() => setDurationSec(15)}
                className={`rounded-2xl border p-4 text-left ${
                  durationSec === 15 ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                <p className="font-semibold">{t("instant.step4.option15.title")}</p>
                <p className="text-sm text-zinc-600">{t("instant.step4.option15.subtitle")}</p>
                <p className="mt-2 text-lg font-bold text-emerald-800">€2.99</p>
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(3)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(5)}>
                {t("instant.common.continue")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 5 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step5.title")}</h2>
            <label className="mt-3 block text-sm font-medium text-zinc-800">{t("instant.step5.label")}</label>
            <textarea
              value={motionText}
              onChange={(e) => setMotionText(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder={t("instant.step5.placeholder")}
              className="mt-2 w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-right text-xs text-zinc-400">{motionText.length}/500</p>
            <p className="mt-4 text-sm font-medium text-zinc-800">{t("instant.step5.chipsTitle")}</p>
            <p className="text-xs text-zinc-500">{t("instant.step5.chipsHelp")}</p>
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
                  {t(c.labelKey as never)}
                </button>
              ))}
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-800">{t("instant.step5.continuityTitle")}</p>
            <p className="text-xs text-zinc-500">{t("instant.step5.continuityHelp")}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setContinuityStrength("balanced")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  continuityStrength === "balanced"
                    ? "border-emerald-600 bg-emerald-100 text-emerald-950"
                    : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                {t("instant.step5.continuityBalanced")}
              </button>
              <button
                type="button"
                onClick={() => setContinuityStrength("strict")}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  continuityStrength === "strict"
                    ? "border-emerald-600 bg-emerald-100 text-emerald-950"
                    : "border-zinc-200 bg-white text-zinc-700"
                }`}
              >
                {t("instant.step5.continuityStrict")}
              </button>
            </div>
            <p className="group relative mt-4 inline-flex cursor-help text-xs text-zinc-500">
              <span className="border-b border-dotted border-zinc-400">{t("instant.step5.tooltipTitle")}</span>
              <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-64 rounded-lg border border-zinc-200 bg-white p-2 text-[11px] text-zinc-700 shadow-lg group-hover:block group-focus-within:block">
                {t("instant.step5.tooltipBody")}
              </span>
            </p>
            <p className="mt-5 text-sm font-medium text-zinc-800">{t("instant.step5.textChipsTitle")}</p>
            <p className="text-xs text-zinc-500">{t("instant.step5.textChipsHelp")}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {TEXT_CHIP_UI.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selectedChipSet.has(c.id)
                      ? "border-amber-600 bg-amber-100 text-amber-950"
                      : "border-zinc-200 bg-white text-zinc-700"
                  }`}
                >
                  {t(c.labelKey as never)}
                </button>
              ))}
            </div>
            {TEXT_IMPLYING_CHIP_IDS.some((id) => selectedChipSet.has(id)) ? (
              <div className="mt-3 space-y-2">
                {TEXT_CHIP_UI.filter((c) => selectedChipSet.has(c.id)).map((c) => (
                  <label key={c.id} className="block text-xs text-zinc-700">
                    {t(c.labelKey as never)}
                    <input
                      type="text"
                      maxLength={280}
                      value={chipTextBySlot[c.id] ?? ""}
                      onChange={(e) =>
                        setChipTextBySlot((prev) => ({ ...prev, [c.id]: e.target.value }))
                      }
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                    />
                  </label>
                ))}
              </div>
            ) : null}
            <LockedTextLayersEditor
              enabled={lockedTextMode}
              onEnabledChange={setLockedTextMode}
              layers={lockedTextLayers}
              onLayersChange={setLockedTextLayers}
            />
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(4)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(6)}>
                {t("instant.common.continue")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 6 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step6.title")}</h2>
            <p className="mt-1 text-sm text-zinc-600">{t("instant.step6.description")}</p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setAspectRatio("9:16")}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium ${
                  aspectRatio === "9:16" ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                {t("instant.step6.vertical")}
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio("16:9")}
                className={`flex-1 rounded-xl border py-3 text-sm font-medium ${
                  aspectRatio === "16:9" ? "border-emerald-500 bg-emerald-50" : "border-zinc-200"
                }`}
              >
                {t("instant.step6.horizontal")}
              </button>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="flex-1 rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(5)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="flex-1" onClick={() => setStep(7)}>
                {t("instant.common.continue")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}

        {step === 7 ? (
          <AppCard>
            <h2 className="text-lg font-semibold">{t("instant.step7.title")}</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-700">
              <li>
                <span className="text-zinc-500">{t("instant.step7.style")}:</span> {styleLabel(stylePreset)}
              </li>
              <li>
                <span className="text-zinc-500">{t("instant.step7.duration")}:</span> {durationSec}s —{" "}
                {durationSec === 8 ? "€1.99" : "€2.99"}
              </li>
              <li>
                <span className="text-zinc-500">{t("instant.step7.format")}:</span> {aspectRatio}
              </li>
              <li>
                <span className="text-zinc-500">{t("instant.step7.images")}:</span> {images.length}
              </li>
              <li>
                <span className="text-zinc-500">{t("instant.step7.continuity")}:</span>{" "}
                {continuityStrength === "strict"
                  ? t("instant.step5.continuityStrict")
                  : t("instant.step5.continuityBalanced")}
              </li>
            </ul>
            <p className="mt-4 text-xs text-zinc-500">
              {premiumMode === "paid"
                ? t("instant.step7.checkoutHelp")
                : t("instant.step7.testModeHelp")}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button type="button" className="w-full rounded-xl border border-zinc-200 py-3 text-sm" onClick={() => setStep(6)}>
                {t("instant.common.back")}
              </button>
              <GradientButton type="button" className="w-full" disabled={checkoutBusy} onClick={() => void startCheckout()}>
                {checkoutBusy
                  ? t("instant.step7.preparing")
                  : premiumMode === "paid"
                    ? t("instant.step7.ctaPaid", { price: durationSec === 8 ? "€1.99" : "€2.99" })
                    : t("instant.step7.ctaTest")}
              </GradientButton>
            </div>
          </AppCard>
        ) : null}
      </div>
    </main>
  );
}
