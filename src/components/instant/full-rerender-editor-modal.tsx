"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { StoryboardEditorLegacy } from "@/components/instant/storyboard-editor";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { useActiveTranslator } from "@/i18n/client";
import { buildSceneTextDraftsFromProject } from "@/lib/instant-scene-text-editor";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import {
  instantExportUserErrorMessage,
  postFullRerenderInstantProject,
} from "@/lib/instant-export-client";
import type { FullRerenderResponse } from "@/types/animation-api";

type StoryboardImage = { id: string; previewUrl: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  instantSceneTexts: unknown;
  instantUserIntent?: string | null;
  instantTransitionSeconds?: number;
  images?: StoryboardImage[];
  imageCount?: number;
  onSuccess?: (response: FullRerenderResponse) => void;
  onError?: (message: string) => void;
  onRenderStart?: () => void;
};

function isInstantPremiumTestMode(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  return document.body.dataset.instantPremiumMode === "test";
}

function FullRerenderEditorModalContent({
  onClose,
  projectId,
  instantSceneTexts,
  instantUserIntent,
  instantTransitionSeconds = 5,
  images = [],
  frameCount,
  onSuccess,
  onError,
  onRenderStart,
}: Omit<Props, "open"> & { frameCount: number }) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>(() =>
    buildSceneTextDraftsFromProject(instantSceneTexts, frameCount)
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [versionNote, setVersionNote] = useState("");
  const [userIntent, setUserIntent] = useState(instantUserIntent ?? "");
  const [transitionSeconds, setTransitionSeconds] = useState(instantTransitionSeconds);

  const editorImages = useMemo((): StoryboardImage[] => {
    return Array.from({ length: frameCount }, (_, index) =>
      images[index] ?? { id: `full-rerender-frame-${index}`, previewUrl: "" }
    );
  }, [frameCount, images]);

  const handleRender = useCallback(async () => {
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
      const payload = sceneTexts.map((scene, index) =>
        instantSceneTextFromDraft(scene, index, sceneTexts.length)
      );
      const result = await postFullRerenderInstantProject(projectId, {
        sceneTexts: payload,
        instantUserIntent: userIntent,
        instantTransitionSeconds: transitionSeconds,
        versionNote: versionNote.trim() || undefined,
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
      onClose();
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
    sceneTexts,
    projectId,
    versionNote,
    userIntent,
    transitionSeconds,
    onRenderStart,
    onSuccess,
    onClose,
    onError,
    router,
    t,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-rerender-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl">
        <header className="border-b border-zinc-100 px-4 py-3 sm:px-6">
          <h2 id="full-rerender-title" className="text-lg font-semibold text-zinc-900">
            {t("instant.fullRerender.title")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("instant.fullRerender.subtitle")}</p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
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
            sceneIds={sceneTexts.map((_, index) => `full-rerender-${index}`)}
            images={editorImages}
            imageCount={frameCount}
            sceneTexts={sceneTexts}
            expandedIndex={expandedIndex}
            onExpandedIndexChange={setExpandedIndex}
            textStyleEditorMode="always"
            onSceneChange={(index, patch) =>
              setSceneTexts((prev) =>
                prev.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row))
              )
            }
            onMoveScene={() => undefined}
            onDeleteScene={() => undefined}
            onDuplicateTextFromPrevious={() => undefined}
            onClearText={(index) =>
              setSceneTexts((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ?
                    {
                      ...row,
                      heroText: "",
                      title: "",
                      subtitle: "",
                      extraLines: [],
                      accentWords: "",
                      lines: [],
                      heroFinaleText: "",
                      finaleFooter: "",
                      overlayLayerStyles: {},
                    }
                  : row
                )
              )
            }
          />
        </div>

        <footer className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
            disabled={busy}
          >
            {t("instant.videoVersions.cancel")}
          </button>
          <button
            type="button"
            onClick={() => void handleRender()}
            disabled={busy}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {busy ? t("instant.fullRerender.busy") : t("instant.fullRerender.confirm")}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function FullRerenderEditorModal(props: Props) {
  const frameCount = Math.max(props.imageCount ?? props.images?.length ?? 0, 1);
  if (!props.open) {
    return null;
  }
  return <FullRerenderEditorModalContent {...props} frameCount={frameCount} />;
}
