"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { STORYBOARD_FRAME_SCROLL_INSET_PX } from "@/lib/storyboard-frame-scroll";
import { StoryboardEditorLegacy } from "@/components/instant/storyboard-editor";
import { FullRerenderImageEditor } from "@/components/instant/full-rerender-image-editor";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useFullRerenderDraft } from "@/hooks/use-full-rerender-draft";
import {
  formatDraftBootstrapDiagnostics,
  shouldShowFullRerenderDraftDiagnostics,
} from "@/lib/full-rerender-draft-diagnostics";
import { parseInstantMode } from "@/lib/instant-premium-mode-types";
import { patchConceptFlowDebug } from "@/lib/concept-flow-debug-state";
import { traceConceptFlow } from "@/lib/concept-flow-trace";
import { hasUsableConceptSlots } from "@/lib/full-rerender-concept-bootstrap";
import { buildInitialFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
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
import { ConceptVersionIdentitySection } from "@/components/videos/concept-version-identity-section";
import type { MotionVersionCatalog } from "@/lib/motion-version-catalog";
import {
  formatVersionIdentityResultLabel,
  resolveTargetLanguageCode,
  suggestVersionNameForLanguage,
  type VersionIdentityLanguageCode,
} from "@/lib/version-identity";
import type { DraftLineageResponse, FullRerenderResponse } from "@/types/animation-api";

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
  onMounted?: () => void;
  onFlowDebug?: (patch: {
    bootstrapStarted?: boolean;
    bootstrapFinished?: boolean;
    draftFetchPending?: boolean;
    loadState?: string;
    slotsCount?: number;
    lastError?: string | null;
  }) => void;
  /** When set, show version-creation preview and clarify NL v3 → NL v4 in render confirm. */
  draftLineage?: DraftLineageResponse | null;
  bundleCatalog?: MotionVersionCatalog | null;
  defaultLanguageCode?: string;
};

const DRAFT_BOOTSTRAP_TIMEOUT_MS = 30_000;

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
  onMounted,
  onFlowDebug,
  draftLineage = null,
  bundleCatalog = null,
  defaultLanguageCode = "nl",
}: FullRerenderEditorProps) {
  const t = useActiveTranslator();
  const router = useRouter();
  const session = useAuthSession();
  const showDraftDiagnostics = shouldShowFullRerenderDraftDiagnostics(
    session.user?.role === "admin"
  );
  const instantMode = parseInstantMode(instantModeRaw);
  const initialImageIds = useMemo(() => images.map((img) => img.id), [images]);

  const [slots, setSlots] = useState<FullRerenderEditorSlot[]>([]);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [targetLanguage, setTargetLanguage] = useState<VersionIdentityLanguageCode>(() =>
    resolveTargetLanguageCode(null, draftLineage?.sourceLanguage ?? defaultLanguageCode)
  );
  const [versionNameAuto, setVersionNameAuto] = useState(true);
  const [userIntent, setUserIntent] = useState(instantUserIntent ?? "");
  const [transitionSeconds, setTransitionSeconds] = useState(instantTransitionSeconds);
  const [bootstrapReady, setBootstrapReady] = useState(false);
  const [draftFetchPending, setDraftFetchPending] = useState(false);
  const [draftLoadState, setDraftLoadState] = useState<
    ReturnType<typeof useFullRerenderDraft>["loadState"]
  >("idle");
  const [draftBootstrapDiagnostics, setDraftBootstrapDiagnostics] = useState<
    ReturnType<typeof useFullRerenderDraft>["bootstrapDiagnostics"]
  >(null);
  const queuePersistAfterBootstrapRef = useRef(false);
  const bootstrapFinishedRef = useRef(false);

  const syncFlowDebug = useCallback(
    (patch: Parameters<NonNullable<FullRerenderEditorProps["onFlowDebug"]>>[0]) => {
      onFlowDebug?.(patch);
      patchConceptFlowDebug({ projectId, ...patch });
    },
    [onFlowDebug, projectId]
  );

  useEffect(() => {
    onMounted?.();
  }, [onMounted]);

  const modalBodyRef = useRef<HTMLDivElement>(null);
  const modalHeaderRef = useRef<HTMLElement>(null);
  const [scrollInsetTopPx, setScrollInsetTopPx] = useState(
    STORYBOARD_FRAME_SCROLL_INSET_PX + 72
  );

  const buildLocalDraft = useCallback(
    () =>
      buildInitialFullRerenderDraftPayload({
        images: images.map((img) => ({
          id: img.id,
          previewUrl: img.previewUrl,
          fileName: null,
        })),
        instantSceneTexts,
        instantUserIntent,
        instantTransitionSeconds,
        instantMode: instantModeRaw,
      }),
    [
      images,
      instantSceneTexts,
      instantUserIntent,
      instantTransitionSeconds,
      instantModeRaw,
    ]
  );

  const draft = useFullRerenderDraft({
    projectId,
    enabled: draftLoadState === "ready",
    slots,
    versionNote,
    targetLanguage,
    userIntent,
    transitionSeconds,
    instantMode,
    expandedIndex,
    initialImageIds,
    ready: bootstrapReady && draftLoadState === "ready",
    buildLocalDraft,
  });

  const bootstrapDraftRef = useRef(draft.bootstrapDraft);
  useEffect(() => {
    bootstrapDraftRef.current = draft.bootstrapDraft;
  });

  const applyProjectFallbackSlots = useCallback(() => {
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
  }, [images, instantSceneTexts, instantTransitionSeconds, instantUserIntent]);

  const applyBootstrapResult = useCallback(
    (loaded: NonNullable<Awaited<ReturnType<typeof draft.bootstrapDraft>>>) => {
      setDraftBootstrapDiagnostics(loaded.diagnostics);
      if (loaded.slots.length > 0) {
        setSlots(loaded.slots);
        setExpandedIndex(loaded.expandedIndex ?? 0);
        const resolvedLang = resolveTargetLanguageCode(
          loaded.targetLanguage,
          draftLineage?.sourceLanguage ?? defaultLanguageCode
        );
        setTargetLanguage(resolvedLang);
        const loadedNote = loaded.versionNote.trim();
        if (loadedNote) {
          setVersionNote(loadedNote);
          setVersionNameAuto(false);
        } else if (draftLineage) {
          setVersionNote(
            suggestVersionNameForLanguage({
              languageCode: resolvedLang,
              catalog: bundleCatalog,
            })
          );
          setVersionNameAuto(true);
        } else {
          setVersionNote("");
          setVersionNameAuto(true);
        }
        setUserIntent(loaded.userIntent);
        setTransitionSeconds(loaded.transitionSeconds);
      } else {
        applyProjectFallbackSlots();
      }
      setDraftLoadState(loaded.loadState);
      setBootstrapReady(true);
      bootstrapFinishedRef.current = true;
      queuePersistAfterBootstrapRef.current =
        loaded.loadState === "ready" && !loaded.draftPersisted;
      syncFlowDebug({
        bootstrapFinished: true,
        draftFetchPending: false,
        loadState: loaded.loadState,
        slotsCount: loaded.slots.length,
      });
      if (loaded.loadState === "ready") {
        traceConceptFlow("ready", { projectId, slotsCount: loaded.slots.length });
      }
    },
    [
      applyProjectFallbackSlots,
      bundleCatalog,
      defaultLanguageCode,
      draftLineage,
      projectId,
      syncFlowDebug,
    ]
  );

  useEffect(() => {
    if (!bootstrapReady || draftLoadState !== "ready" || !queuePersistAfterBootstrapRef.current) {
      return;
    }
    queuePersistAfterBootstrapRef.current = false;
    void draft.persistNow();
  }, [bootstrapReady, draftLoadState, draft]);

  const runDraftBootstrap = useCallback(async () => {
    setDraftFetchPending(true);
    bootstrapFinishedRef.current = false;
    syncFlowDebug({ bootstrapStarted: true, bootstrapFinished: false, draftFetchPending: true });
    traceConceptFlow("bootstrap start", { projectId });
    const timeout = window.setTimeout(() => {
      if (bootstrapFinishedRef.current) {
        return;
      }
      const msg = "Concept bootstrap timed out.";
      traceConceptFlow("bootstrap fail", { projectId, error: msg });
      applyProjectFallbackSlots();
      setDraftLoadState("error");
      setError(msg);
      setBootstrapReady(true);
      bootstrapFinishedRef.current = true;
      setDraftFetchPending(false);
      syncFlowDebug({
        bootstrapFinished: true,
        draftFetchPending: false,
        loadState: "error",
        lastError: msg,
        slotsCount: slots.length,
      });
    }, DRAFT_BOOTSTRAP_TIMEOUT_MS);
    try {
      const loaded = await bootstrapDraftRef.current();
      window.clearTimeout(timeout);
      if (!loaded) {
        traceConceptFlow("bootstrap fail", { projectId, error: "No bootstrap result." });
        applyProjectFallbackSlots();
        setDraftLoadState("error");
        setError(t("projects.concept.loadFailed" as TranslationKey));
        setBootstrapReady(true);
        bootstrapFinishedRef.current = true;
        syncFlowDebug({
          bootstrapFinished: true,
          draftFetchPending: false,
          loadState: "error",
          lastError: "No bootstrap result.",
        });
        return;
      }
      applyBootstrapResult(loaded);
    } catch (e) {
      window.clearTimeout(timeout);
      const msg = e instanceof Error ? e.message : "Bootstrap failed.";
      traceConceptFlow("bootstrap fail", { projectId, error: msg });
      applyProjectFallbackSlots();
      setDraftLoadState("error");
      setError(msg);
      setBootstrapReady(true);
      bootstrapFinishedRef.current = true;
      syncFlowDebug({
        bootstrapFinished: true,
        draftFetchPending: false,
        loadState: "error",
        lastError: msg,
      });
    } finally {
      setDraftFetchPending(false);
      syncFlowDebug({ draftFetchPending: false });
    }
  }, [applyBootstrapResult, applyProjectFallbackSlots, projectId, slots.length, syncFlowDebug, t]);

  const bootstrappedForProjectRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || bootstrappedForProjectRef.current === projectId) {
      return;
    }
    bootstrappedForProjectRef.current = projectId;
    void runDraftBootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once per projectId
  }, [projectId]);

  const handleRetryDraftLoad = useCallback(() => {
    bootstrappedForProjectRef.current = null;
    void runDraftBootstrap();
  }, [runDraftBootstrap]);

  const handleStartWithoutConcept = useCallback(() => {
    draft.skipDraftPersistence();
    applyProjectFallbackSlots();
    setDraftLoadState("skipped");
    setBootstrapReady(true);
    setDraftFetchPending(false);
  }, [applyProjectFallbackSlots, draft]);

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

    const resultPreview =
      draftLineage
        ? formatVersionIdentityResultLabel(
            targetLanguage,
            versionNote.trim() ||
              suggestVersionNameForLanguage({
                languageCode: targetLanguage,
                catalog: bundleCatalog,
              })
          )
        : "";
    const confirmMessage =
      draftLineage ?
        t("projects.renderPreview.confirm", {
          current: `${draftLineage.sourceLanguageLabel} ${draftLineage.sourceVersionDisplay}`,
          result: resultPreview,
          bundle: draftLineage.bundleDisplayName ?? "",
        })
      : isInstantPremiumTestMode()
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
        sourceLanguage: draftLineage?.sourceLanguage ?? defaultLanguageCode,
        targetLanguage,
        versionName: versionNote.trim() || undefined,
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
  }, [
    slots,
    instantMode,
    projectId,
    draft,
    draftLineage,
    targetLanguage,
    versionNote,
    bundleCatalog,
    defaultLanguageCode,
    onRenderStart,
    onSuccess,
    onClose,
    onError,
    router,
    t,
  ]);

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

  const showConceptSpinner = draftFetchPending;

  if (showConceptSpinner) {
    return (
      <div className={layout === "page" ? "py-12 text-center text-sm text-zinc-600" : shellClass}>
        <p>{t("projects.concept.loading")}</p>
      </div>
    );
  }

  const projectHasImages = images.some((img) => img.previewUrl.trim().length > 0);
  const showEmptyProjectState =
    bootstrapReady && !hasUsableConceptSlots(slots) && !projectHasImages;

  const showDraftLoadBanner =
    draftLoadState === "error" || draftLoadState === "storage_unavailable";
  const draftLoadBannerMessage =
    draftLoadState === "storage_unavailable"
      ? t("projects.concept.storageUnavailable" as TranslationKey)
      : t("projects.concept.loadFailed" as TranslationKey);

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
        {showDraftLoadBanner ?
          <div
            className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
            role="alert"
          >
            <p className="font-medium">{draftLoadBannerMessage}</p>
            {draft.loadError && draftLoadState === "error" ?
              <p className="mt-1 text-xs text-amber-900/90">{draft.loadError}</p>
            : null}
            {showDraftDiagnostics && (draftBootstrapDiagnostics ?? draft.bootstrapDiagnostics) ?
              <pre className="mt-2 overflow-x-auto rounded-lg bg-white/80 p-2 font-mono text-[10px] text-amber-950">
                {formatDraftBootstrapDiagnostics(
                  draftBootstrapDiagnostics ?? draft.bootstrapDiagnostics!
                ).join("\n")}
              </pre>
            : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRetryDraftLoad}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950"
              >
                {t("projects.concept.retryLoad" as TranslationKey)}
              </button>
              <button
                type="button"
                onClick={handleStartWithoutConcept}
                className="rounded-full bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white"
              >
                {t("projects.concept.startWithoutDraft" as TranslationKey)}
              </button>
              <Link
                href={backHref}
                className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950"
              >
                {t("projects.concept.backToProject" as TranslationKey)}
              </Link>
            </div>
          </div>
        : null}
        {showDraftDiagnostics ?
          <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[10px] text-zinc-700">
            <p className="font-semibold text-zinc-900">{t("projects.concept.debugTitle" as TranslationKey)}</p>
            <ul className="mt-1 space-y-0.5">
              <li>projectId: {projectId}</li>
              <li>hasProjectImages: {String(projectHasImages)}</li>
              <li>draftLoadState: {draftLoadState}</li>
              <li>draftFetchPending: {String(draftFetchPending)}</li>
              <li>bootstrapReady: {String(bootstrapReady)}</li>
              <li>slotsCount: {slots.length}</li>
              <li>usableSlots: {String(hasUsableConceptSlots(slots))}</li>
              {draftBootstrapDiagnostics ?
                <>
                  <li>lastGetStatus: {draftBootstrapDiagnostics.getStatus}</li>
                  <li>lastGetOk: {String(draftBootstrapDiagnostics.getOk)}</li>
                  <li>
                    lastPostStatus:{" "}
                    {draftBootstrapDiagnostics.postStatus == null
                      ? "—"
                      : draftBootstrapDiagnostics.postStatus}
                  </li>
                  <li>
                    lastPostOk:{" "}
                    {draftBootstrapDiagnostics.postOk == null
                      ? "—"
                      : String(draftBootstrapDiagnostics.postOk)}
                  </li>
                </>
              : null}
              {draft.loadError ?
                <li>lastError: {draft.loadError}</li>
              : null}
            </ul>
          </div>
        : null}
      </header>

      <div ref={modalBodyRef} className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {draftLineage ?
          <ConceptVersionIdentitySection
            lineage={draftLineage}
            targetLanguage={targetLanguage}
            onTargetLanguageChange={(code) => {
              setTargetLanguage(code);
              if (versionNameAuto || !versionNote.trim()) {
                setVersionNote(
                  suggestVersionNameForLanguage({
                    languageCode: code,
                    catalog: bundleCatalog,
                  })
                );
                setVersionNameAuto(true);
              }
            }}
            versionName={versionNote}
            onVersionNameChange={(value) => {
              setVersionNameAuto(false);
              setVersionNote(value);
            }}
            bundleCatalog={bundleCatalog}
            disabled={busy}
            showSourceLink={layout !== "page"}
          />
        : null}
        {showEmptyProjectState ?
          <p className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
            {t("projects.concept.emptyProject" as TranslationKey)}
          </p>
        : null}
        {!showEmptyProjectState && !hasUsableConceptSlots(slots) ?
          <p className="mb-4 text-sm text-zinc-600">{t("instant.fullRerender.images.minWarning", { min: 2 })}</p>
        : null}
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
                footerLines: [""],
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
          {busy ? t("instant.fullRerender.busy") : t("projects.concept.renderNewVersion")}
        </button>
      </footer>
    </div>
  );
}
