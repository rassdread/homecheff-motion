"use client";

import { useCallback, useMemo, useState } from "react";
import { StoryboardEditorLegacy } from "@/components/instant/storyboard-editor";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { useActiveTranslator } from "@/i18n/client";
import { buildSceneTextDraftsFromProject } from "@/lib/instant-scene-text-editor";
import { instantSceneTextFromDraft } from "@/lib/instant-scene-text-draft";
import {
  instantExportUserErrorMessage,
  postRebuildFinalVideo,
  type RebuildFinalVideoResponse,
} from "@/lib/instant-export-client";
import { TextLanguageRenderProgressPanel } from "@/components/instant/text-language-render-progress-panel";
import { resolveTextRerenderProgress } from "@/lib/text-language-render-progress";

type StoryboardImage = { id: string; previewUrl: string };

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  instantSceneTexts: unknown;
  images?: StoryboardImage[];
  imageCount?: number;
  onSuccess?: (response: RebuildFinalVideoResponse) => void;
  onError?: (message: string) => void;
  onRenderStart?: () => void;
};

type ContentProps = Omit<Props, "open"> & {
  frameCount: number;
};

function TextRerenderEditorModalContent({
  onClose,
  projectId,
  instantSceneTexts,
  images = [],
  frameCount,
  onSuccess,
  onError,
  onRenderStart,
}: ContentProps) {
  const t = useActiveTranslator();
  const [sceneTexts, setSceneTexts] = useState<InstantSceneTextDraft[]>(() =>
    buildSceneTextDraftsFromProject(instantSceneTexts, frameCount)
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [versionNote, setVersionNote] = useState("");

  const editorImages = useMemo((): StoryboardImage[] => {
    return Array.from({ length: frameCount }, (_, index) =>
      images[index] ?? { id: `rerender-frame-${index}`, previewUrl: "" }
    );
  }, [frameCount, images]);

  const handleRender = useCallback(async () => {
    setBusy(true);
    setError("");
    onRenderStart?.();
    try {
      const payload = sceneTexts.map((scene, index) =>
        instantSceneTextFromDraft(scene, index, sceneTexts.length)
      );
      const result = await postRebuildFinalVideo(projectId, {
        sceneTexts: payload,
        versionNote: versionNote.trim() || undefined,
      });
      if (result.networkError) {
        const msg = instantExportUserErrorMessage({
          kind: result.errorKind ?? "network",
          abortedMessage: t("instant.textRerender.aborted"),
          networkMessage: t("instant.textRerender.failed"),
          httpMessage: result.data.error,
        });
        setError(msg);
        onError?.(msg);
        return;
      }
      if (!result.ok) {
        const msg =
          result.data.error ?? result.data.rebuild?.message ?? t("instant.textRerender.failed");
        setError(msg);
        onError?.(msg);
        return;
      }
      if (result.data.rebuild?.clipsReady === false) {
        const msg =
          result.data.rebuild?.message ?? t("instant.textRerender.segmentsMissing");
        setError(msg);
        onError?.(msg);
        return;
      }
      if (result.data.rebuild?.ok) {
        onSuccess?.(result.data);
        onClose();
        return;
      }
      const msg =
        result.data.rebuild?.message ??
        (result.data.rebuild?.finalVideoUrlPresent ?
          t("instant.progress.rebuildFinalFailedKeepsPrevious")
        : t("instant.textRerender.failed"));
      setError(msg);
      onError?.(msg);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("instant.textRerender.failed");
      setError(msg);
      onError?.(msg);
    } finally {
      setBusy(false);
    }
  }, [onClose, onError, onRenderStart, onSuccess, projectId, sceneTexts, t]);

  const savingProgress = resolveTextRerenderProgress({ localPhase: busy ? "saving" : "idle" });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="text-rerender-editor-title"
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-zinc-200 bg-white shadow-xl sm:rounded-2xl">
        <div className="border-b border-zinc-100 px-4 py-4 sm:px-6">
          <h2 id="text-rerender-editor-title" className="text-lg font-semibold text-zinc-900">
            {t("instant.textRerender.editorTitle")}
          </h2>
          <p className="mt-1 text-sm text-zinc-600">{t("instant.textRerender.editorHint")}</p>
          <p className="mt-2 rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2 text-[11px] text-zinc-600">
            {t("instant.textRerender.readingOrderHint")}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {error ?
            <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          : null}
          {busy ? (
            <TextLanguageRenderProgressPanel progress={savingProgress} className="mb-4" />
          ) : null}
          <StoryboardEditorLegacy
            sceneIds={sceneTexts.map((_, index) => `rerender-${index}`)}
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
            onDuplicateTextFromPrevious={(index) => {
              if (index <= 0) {
                return;
              }
              const source = sceneTexts[index - 1];
              if (!source) {
                return;
              }
              setSceneTexts((prev) =>
                prev.map((row, rowIndex) =>
                  rowIndex === index ?
                    {
                      ...row,
                      template: source.template,
                      heroText: source.heroText,
                      title: source.title,
                      subtitle: source.subtitle,
                      extraLines: [...source.extraLines],
                      accentWords: source.accentWords,
                      lines: [...source.lines],
                      heroFinale: source.heroFinale,
                      heroFinaleText: source.heroFinaleText,
                      overlayLayerStyles: { ...source.overlayLayerStyles },
                    }
                  : row
                )
              );
            }}
            onClearText={(index) => {
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
              );
            }}
          />
          <label className="mt-4 block text-xs text-zinc-600">
            {t("projectDetail.versions.noteLabel")}
            <textarea
              value={versionNote}
              onChange={(e) => setVersionNote(e.target.value)}
              rows={2}
              maxLength={240}
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              placeholder={t("projectDetail.versions.notePlaceholder")}
            />
          </label>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-4 sm:px-6">
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleRender()}
            className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {busy ? t("instant.textRerender.busy") : t("instant.textRerender.render")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm text-zinc-700 disabled:opacity-50"
          >
            {t("instant.videoVersions.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TextRerenderEditorModal({
  open,
  instantSceneTexts,
  images = [],
  imageCount,
  ...rest
}: Props) {
  if (!open) {
    return null;
  }

  const frameCount = Math.max(
    imageCount ?? images.length,
    buildSceneTextDraftsFromProject(instantSceneTexts, imageCount ?? images.length).length,
    1
  );

  return (
    <TextRerenderEditorModalContent
      key={`${rest.projectId}:${frameCount}:${JSON.stringify(instantSceneTexts ?? null)}`}
      {...rest}
      instantSceneTexts={instantSceneTexts}
      images={images}
      frameCount={frameCount}
    />
  );
}
