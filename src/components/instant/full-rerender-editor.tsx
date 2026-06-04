"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STORYBOARD_FRAME_SCROLL_INSET_PX } from "@/lib/storyboard-frame-scroll";
import { StoryboardEditorLegacy } from "@/components/instant/storyboard-editor";
import { FullRerenderImageEditor } from "@/components/instant/full-rerender-image-editor";
import { useActiveTranslator } from "@/i18n/client";
import { useFullRerenderDraft } from "@/hooks/use-full-rerender-draft";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import {
  buildFullRerenderSlotsFromProject,
  countFullRerenderAttachedImages,
  fullRerenderSlotsToStoryboardImages,
  moveFullRerenderSlotAt,
  patchFullRerenderSceneTextAt,
  validateFullRerenderSlotsForRender,
} from "@/lib/full-rerender-editor-slots";
import type { FullRerenderEditorSlot } from "@/lib/full-rerender-editor-types";
import {
  instantExportUserErrorMessage,
  postFullRerenderInstantProject,
} from "@/lib/instant-export-client";
import { isInstantPremiumTestMode } from "@/lib/quick-full-rerender";
import type { FullRerenderResponse } from "@/types/animation-api";

type StoryboardImage = { id: string; previewUrl: string };

export type FullRerenderEditorProps = {
  projectId: string;
  instantSceneTexts: unknown;
  instantUserIntent?: string | null;
  instantTransitionSeconds?: number;
  instantMode?: string | null;
  images?: StoryboardImage[];
  uploadRole?: string;
  backHref?: string;
  layout?: "page" | "modal";
  onClose?: () => void;
  onSuccess?: (response: FullRerenderResponse) => void;
  onError?: (message: string) => void;
  onRenderStart?: () => void;
  onDraftDeleted?: () => void;
};

function saveStatusLabelKey(
  status: ReturnType<typeof useFullRerenderDraft>["saveStatus"]
): "projects.concept.saveStatus.saved" | "projects.concept.saveStatus.saving" | "projects.concept.saveStatus.unsaved" | null {
  if (status === "saved") {
    return "projects.concept.saveStatus.saved";
  }
  if (status === "saving") {
    return "projects.concept.saveStatus.saving";
  }
  if (status === "dirty" || status === "error") {
    return "projects.concept.saveStatus.unsaved";
  }
  return null;
}

export function FullRerenderEditor({
  projectId,
  instantSceneTexts,
  instantUserIntent,
  instantTransitionSeconds = 5,
  instantMode: instantModeRaw,
  images = [],
  uploadRole = "user",
  backHref = `/videos/${encodeURIComponent(projectId)}`,
  layout = "page",
  onClose,
  onSuccess,
  onError,
  onRenderStart,
  onDraftDeleted,
}: FullRerenderEditorProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const instantMode = parseInstantMode(instantModeRaw);
  const initialImageIds = useMemo(() => images.map((img) => img.id), [images]);

  const [slots, setSlots] = useState<FullRerenderEditorSlot[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [userIntent, setUserIntent] = useState(instantUserIntent ?? "");
  const [transitionSeconds, setTransitionSeconds] = useState(instantTransitionSeconds);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [bootstrapBusy, setBootstrapBusy] = useState(true);

  const modalBodyRef = useRef<HTMLDivElement>(null);
  const modalHeaderRef = useRef<HTMLElement>(null);
  const [scrollInsetTopPx, setScrollInsetTopPx] = useState(
    STORYBOARD_FRAME_SCROLL_INSET_PX + 72
  );

  const draft = useFullRerenderDraft({
    projectId,
    enabled: true,
    slots,
    versionNote,
    userIntent,
    transitionSeconds,
    instantMode,
    expandedIndex,
    initialImageIds,
    ready: bootstrapReady && slots.length > 0,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setBootstrapBusy(true);
      const loaded = await draft.bootstrapDraft();
      if (cancelled) {
        return;
      }
      if (loaded?.slots?.length) {
        setSlots(loaded.slots);
        setExpandedIndex(loaded.expandedIndex);
        setVersionNote(loaded.versionNote);
        setUserIntent(loaded.userIntent);
        setTransitionSeconds(loaded.transitionSeconds);
      } else {
        const fallback = buildFullRerenderSlotsFromProject({
          images: images.map((img) => ({
            id: img.id,
            previewUrl: img.previewUrl,
            fileName: null,
          })),
          instantSceneTexts,
          transitionSeconds: instantTransitionSeconds,
        });
        setSlots(fallback);
        setUserIntent(instantUserIntent ?? "");
        setTransitionSeconds(instantTransitionSeconds);
      }
      setBootstrapReady(true);
      setBootstrapBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useLayoutEffect(() => {
    const header = modalHeaderRef.current;
    if (!header) {
      return;
    }
    const update = () => {
      setScrollInsetTopPx(header.offsetHeight + STORYBOARD_FRAME_SCROLL_INSET_PX);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  const sceneCount = Math.max(countFullRerenderAttachedImages(slots), slots.length, 1);
  const editorImages = useMemo(() => fullRerenderSlotsToStoryboardImages(slots), [slots]);
  const sceneTexts = useMemo(() => slots.map((slot) => slot.text), [slots]);

  const statusKey = saveStatusLabelKey(draft.saveStatus);

  const handleRender = useCallback(async () => {
    const validationError = validateFullRerenderSlotsForRender({ slots, instantMode });
    if (validationError) {
      setError(validationError);
      onError?.(validationError);
      return;
    }

    await draft.persistNow();

    const confirmMessage = isInstantPremiumTestMode()
      ? t("instant.fullRerender.confirmPromptTestMode")
      : t("instant.fullRerender.confirmPrompt");
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setBusy(true);
    setError("");
    onRenderStart?.();
    try {
      const result = await postFullRerenderInstantProject(projectId, {
        rerenderSource: "editor",
      });
      if (result.networkError) {
        const msg = instantExportUserErrorMessage({
          kind: result.errorKind ?? "network",
          abortedMessage: t("instant.fullRerender.aborted"),
          networkMessage: t("instant.fullRerender.failed"),
          httpMessage: result.data.error,
        });
        setError(msg);
        onError?.(msg);
        return;
      }
      if (!result.ok) {
        const msg =
          result.data.fullRerender?.message ??
          result.data.error ??
          t("instant.fullRerender.failed");
        setError(msg);
        onError?.(msg);
        return;
      }
      onSuccess?.(result.data);
      onClose?.();
      const progressRoute =
        result.data.fullRerender?.progressRoute ??
        `/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`;
      router.push(progressRoute);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("instant.fullRerender.failed");
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }, [slots, instantMode, projectId, draft, onRenderStart, onSuccess, onClose, onError, router, t]);

  const handleSaveConcept = useCallback(async () => {
    const ok = await draft.persistNow();
    if (!ok) {
      setError(t("projects.concept.saveFailed"));
    }
  }, [draft, t]);

  const handleContinueEditing = useCallback(async () => {
    await draft.persistNow();
    if (layout === "modal") {
      onClose?.();
    } else {
      router.push(backHref);
    }
  }, [draft, layout, onClose, router, backHref]);

  const handleDeleteConcept = useCallback(async () => {
    if (!window.confirm(t("projects.concept.deleteConfirm"))) {
      return;
    }
    const ok = await draft.deleteDraft();
    if (!ok) {
      setError(t("projects.concept.deleteFailed"));
      return;
    }
    onDraftDeleted?.();
    if (layout === "modal") {
      onClose?.();
    } else {
      router.push("/videos?section=concepts");
    }
  }, [draft, layout, onClose, onDraftDeleted, router, t]);

  const shellClass =
    layout === "modal"
      ? "flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl"
      : "mx-auto flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm";

  if (bootstrapBusy || slots.length === 0) {
    return (
      <div className={layout === "page" ? "py-12 text-center text-sm text-zinc-600" : shellClass}>
        <p>{t("projects.concept.loading")}</p>
      </div>
    );
  }

  return (
    <div className={shellClass} role={layout === "modal" ? "dialog" : undefined} aria-modal={layout === "modal" ? true : undefined}>
      <header ref={modalHeaderRef} className="border-b border-zinc-100 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">
              {t("instant.fullRerender.editorTitle")}
            </h2>
            <p className="mt-1 text-sm text-zinc-600">{t("instant.fullRerender.editorSubtitle")}</p>
          </div>
          {statusKey ?
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                draft.saveStatus === "saved"
                  ? "bg-emerald-50 text-emerald-800"
                  : draft.saveStatus === "saving"
                    ? "bg-amber-50 text-amber-900"
                    : "bg-zinc-100 text-zinc-700"
              }`}
            >
              {t(statusKey)}
            </span>
          : null}
        </div>
        {draft.loadError ?
          <p className="mt-2 text-sm text-red-700">{draft.loadError}</p>
        : null}
      </header>

      <div ref={modalBodyRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        <FullRerenderImageEditor
          slots={slots}
          onSlotsChange={setSlots}
          initialImageIds={initialImageIds}
          initialPreviewUrls={images.map((img) => img.previewUrl)}
          instantMode={instantMode}
          transitionSeconds={transitionSeconds}
          uploadRole={uploadRole}
          disabled={busy}
        />

        <label className="mb-4 block text-sm text-zinc-700">
          <span className="font-medium">{t("instant.fullRerender.versionNoteLabel")}</span>
          <input
            type="text"
            value={versionNote}
            onChange={(e) => setVersionNote(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
            placeholder={t("instant.fullRerender.versionNotePlaceholder")}
          />
        </label>

        <label className="mb-4 block text-sm text-zinc-700">
          <span className="font-medium">{t("instant.fullRerender.userIntentLabel")}</span>
          <textarea
            value={userIntent}
            onChange={(e) => setUserIntent(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
          />
        </label>

        <label className="mb-4 block text-sm text-zinc-700">
          <span className="font-medium">{t("instant.fullRerender.pacingLabel")}</span>
          <select
            value={transitionSeconds}
            onChange={(e) => setTransitionSeconds(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2"
          >
            <option value={3}>{t("instant.fullRerender.pacingFast")}</option>
            <option value={5}>{t("instant.fullRerender.pacingStandard")}</option>
            <option value={8}>{t("instant.fullRerender.pacingCinematic")}</option>
          </select>
        </label>

        {error ?
          <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        : null}

        <StoryboardEditorLegacy
          sceneIds={slots.map((slot) => slot.sceneId)}
          images={editorImages}
          imageCount={sceneCount}
          sceneTexts={sceneTexts}
          expandedIndex={expandedIndex}
          onExpandedIndexChange={setExpandedIndex}
          textStyleEditorMode="optional"
          textStyleEditorContext="rerender"
          scrollContainerRef={modalBodyRef}
          scrollInsetTopPx={scrollInsetTopPx}
          onSceneChange={(index, patch) =>
            setSlots((prev) => patchFullRerenderSceneTextAt(prev, index, patch))
          }
          onMoveScene={(index, direction) => {
            const target = direction === "up" ? index - 1 : index + 1;
            setSlots((prev) => moveFullRerenderSlotAt(prev, index, direction));
            if (target >= 0) {
              setExpandedIndex(target);
            }
          }}
          onDeleteScene={() => undefined}
          onDuplicateTextFromPrevious={() => undefined}
          onClearText={(index) =>
            setSlots((prev) =>
              patchFullRerenderSceneTextAt(prev, index, {
                heroText: "",
                title: "",
                subtitle: "",
                headlineBeats: [],
                titleBeats: [],
                subtitleBeats: [],
                extraLines: [],
                accentWords: "",
                lines: [],
                heroFinaleText: "",
                finaleFooter: "",
                overlayLayerStyles: {},
              })
            )
          }
        />
      </div>

      <footer className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3 sm:px-6">
        {layout === "page" ?
          <Link
            href={backHref}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            {t("instant.videoVersions.cancel")}
          </Link>
        : (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            disabled={busy}
          >
            {t("instant.videoVersions.cancel")}
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleSaveConcept()}
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800"
        >
          {t("projects.concept.save")}
        </button>
        <button
          type="button"
          onClick={() => void handleContinueEditing()}
          disabled={busy}
          className="rounded-lg border border-[#0067B1]/30 px-4 py-2 text-sm font-medium text-[#0067B1]"
        >
          {t("projects.concept.continueEditing")}
        </button>
        <button
          type="button"
          onClick={() => void handleDeleteConcept()}
          disabled={busy}
          className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-800"
        >
          {t("projects.concept.delete")}
        </button>
        <button
          type="button"
          onClick={() => void handleRender()}
          disabled={busy}
          className="ml-auto rounded-lg bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? t("instant.fullRerender.busy") : t("projectDetail.rerenderChoices.newVersion.cta")}
        </button>
      </footer>
    </div>
  );
}
