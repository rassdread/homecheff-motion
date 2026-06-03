"use client";

import { memo, useCallback, useDeferredValue, type ChangeEvent, type KeyboardEvent } from "react";
import {
  MAX_EXTRA_LINES,
  MAX_FINALE_FOOTER_CHARS,
  MAX_HERO_FINALE_TEXT_CHARS,
  MAX_SEQUENCE_LINES,
  STORY_SCENE_DURATION_OPTIONS,
  splitSubtitleMultilineInput,
  type SceneOverlayTemplate,
} from "@/lib/story-overlay-templates";
import {
  ANIMATION_SCENE_EMOTION_IDS,
  SCENE_ACTING_INTENSITIES,
  recommendSceneEmotion,
  type AnimationSceneEmotionId,
  type SceneActingIntensity,
} from "@/lib/animation-scene-emotions";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { StoryboardFieldHint } from "@/components/instant/storyboard-field-hint";
import { StoryboardOverlayPreview } from "@/components/instant/storyboard-overlay-preview";
import { SafePreviewImage } from "@/components/ui/safe-preview-image";
import type { WizardPreviewImageInput } from "@/lib/instant-wizard-preview-src";

export type StoryboardImage = WizardPreviewImageInput;

type StoryboardEditorProps = {
  sceneIds?: string[];
  images: (StoryboardImage | undefined)[];
  sceneTexts: InstantSceneTextDraft[];
  imageCount: number;
  /** Stable scene id — expansion is independent of text/content updates. */
  expandedSceneId: string | null;
  onExpandedSceneIdChange: (sceneId: string | null) => void;
  onSceneChange: (index: number, patch: Partial<InstantSceneTextDraft>) => void;
  onMoveScene: (index: number, direction: "up" | "down") => void;
  onDuplicateTextFromPrevious: (index: number) => void;
  onClearText: (index: number) => void;
  onDeleteScene?: (index: number) => void;
};

/** @deprecated Use expandedSceneId — kept for callers migrating from index. */
export type StoryboardEditorLegacyProps = Omit<
  StoryboardEditorProps,
  "expandedSceneId" | "onExpandedSceneIdChange"
> & {
  expandedIndex: number | null;
  onExpandedIndexChange: (index: number | null) => void;
};

const TEMPLATE_OPTIONS: SceneOverlayTemplate[] = ["auto", "hero", "scene", "sequence"];

function defaultSequenceLines(scene: InstantSceneTextDraft): string[] {
  if (scene.lines.length > 0) {
    return scene.lines;
  }
  if (scene.heroText.trim()) {
    return [scene.heroText, ""];
  }
  return ["", ""];
}

function showHeadlineField(template: SceneOverlayTemplate): boolean {
  return template === "auto" || template === "scene" || template === "hero";
}

function showTitleSubtitleFields(template: SceneOverlayTemplate): boolean {
  return template === "auto" || template === "scene" || template === "hero";
}

function showSequenceFields(template: SceneOverlayTemplate): boolean {
  return template === "sequence";
}

function draftTransitionSeconds(scene: InstantSceneTextDraft): number {
  return scene.transitionDurationSeconds ?? scene.durationSeconds;
}

function setTransitionDuration(
  seconds: (typeof STORY_SCENE_DURATION_OPTIONS)[number]
): Partial<InstantSceneTextDraft> {
  return {
    transitionDurationSeconds: seconds,
    durationSeconds: seconds,
  };
}

type StoryboardSceneRowProps = {
  sceneId: string;
  scene: InstantSceneTextDraft;
  image: StoryboardImage | undefined;
  index: number;
  frameCount: number;
  imageCount: number;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSceneChange: (index: number, patch: Partial<InstantSceneTextDraft>) => void;
  onMoveScene: (index: number, direction: "up" | "down") => void;
  onDuplicateTextFromPrevious: (index: number) => void;
  onClearText: (index: number) => void;
  onDeleteScene?: (index: number) => void;
};

const StoryboardSceneRow = memo(function StoryboardSceneRow({
  sceneId,
  scene,
  image,
  index,
  frameCount,
  imageCount,
  expanded,
  onToggleExpanded,
  onSceneChange,
  onMoveScene,
  onDuplicateTextFromPrevious,
  onClearText,
  onDeleteScene,
}: StoryboardSceneRowProps) {
  const t = useActiveTranslator();
  const previewScene = useDeferredValue(scene);
  const missingImage = !image;
  const sequenceLines =
    showSequenceFields(scene.template) ? defaultSequenceLines(scene) : scene.lines;

  const templateLabel = t(`instant.overlay.template.${scene.template}` as never);
  const headerLabel =
    index >= imageCount - 1 ?
      `${t("instant.storyboard.finalFrameLabel")} · ${templateLabel}`
    : `${draftTransitionSeconds(scene)}s → ${templateLabel}`;

  const patch = useCallback(
    (partial: Partial<InstantSceneTextDraft>) => onSceneChange(index, partial),
    [index, onSceneChange]
  );

  const resolvedAutoEmotion = recommendSceneEmotion({
    ...scene,
    sceneIndex: index,
    sceneCount: frameCount,
  });
  const resolvedEmotion =
    scene.emotionMode === "manual" && scene.emotion
      ? scene.emotion
      : (scene.autoEmotion ?? resolvedAutoEmotion);
  const selectValue =
    scene.emotionMode === "manual" && scene.emotion ? scene.emotion : "auto";

  return (
    <div
      data-scene-id={sceneId}
      className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
    >
      <button
        type="button"
        className="flex w-full items-center gap-3 px-3 py-3 text-left"
        onClick={onToggleExpanded}
        aria-expanded={expanded}
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
          <SafePreviewImage
            image={image}
            alt=""
            fill
            className="object-cover"
            sizes="56px"
            invalidLabelKey={
              missingImage ?
                "instant.preview.missingImageReupload"
              : "instant.preview.expiredReupload"
            }
            expiredLabelKey="instant.preview.expiredReupload"
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {t("instant.storyboard.frameLabel", { index: index + 1 })}
          </p>
          <p className="truncate text-sm font-medium text-zinc-900">{headerLabel}</p>
        </div>
        <span className="text-xs text-zinc-400">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded ?
        <div className="space-y-3 border-t border-zinc-50 px-3 pb-3 pt-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => onMoveScene(index, "up")}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 disabled:opacity-40"
            >
              {t("instant.storyboard.moveUp")}
            </button>
            <button
              type="button"
              disabled={index >= frameCount - 1}
              onClick={() => onMoveScene(index, "down")}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700 disabled:opacity-40"
            >
              {t("instant.storyboard.moveDown")}
            </button>
            {index > 0 ?
              <button
                type="button"
                onClick={() => onDuplicateTextFromPrevious(index)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700"
              >
                {t("instant.storyboard.duplicatePrevious")}
              </button>
            : null}
            <button
              type="button"
              onClick={() => onClearText(index)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-700"
            >
              {t("instant.storyboard.clearText")}
            </button>
            {onDeleteScene ?
              <button
                type="button"
                onClick={() => onDeleteScene(index)}
                className="rounded-lg border border-red-200 px-2.5 py-1 text-xs text-red-700"
              >
                {t("instant.storyboard.deleteScene")}
              </button>
            : null}
          </div>

          <label className="block text-xs text-zinc-500">
            {t("instant.overlay.templateLabel")}
            <select
              value={scene.template}
              onChange={(e) => {
                const template = e.target.value as SceneOverlayTemplate;
                if (template === "sequence") {
                  patch({
                    template,
                    lines: defaultSequenceLines(scene),
                  });
                  return;
                }
                patch({ template });
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {TEMPLATE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {t(`instant.overlay.template.${opt}` as never)}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-zinc-500">
            <StoryboardFieldHint
              label={t("instant.storyboard.emotionLabel")}
              hint={t("instant.storyboard.emotionHint")}
            />
            {scene.emotionMode !== "manual" ?
              <p className="mt-1 text-[11px] font-medium text-emerald-800">
                {t("instant.storyboard.emotion.autoSelected", {
                  emotion: t(`instant.storyboard.emotion.${resolvedEmotion}` as never),
                })}
              </p>
            : null}
            <select
              value={selectValue}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "auto") {
                  patch({
                    emotionMode: "auto",
                    autoEmotion: resolvedAutoEmotion,
                    emotion: undefined,
                  });
                  return;
                }
                patch({
                  emotionMode: "manual",
                  emotion: value as AnimationSceneEmotionId,
                });
              }}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="auto">{t("instant.storyboard.emotion.auto")}</option>
              {ANIMATION_SCENE_EMOTION_IDS.map((id) => (
                <option key={id} value={id}>
                  {t(`instant.storyboard.emotion.${id}` as never)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-zinc-500">{t("instant.storyboard.emotion.autoHelper")}</p>
          </label>

          <label className="block text-xs text-zinc-500">
            <StoryboardFieldHint
              label={t("instant.storyboard.actingIntensityLabel")}
              hint={t("instant.storyboard.actingIntensityHint")}
            />
            <select
              value={scene.actingIntensity}
              onChange={(e) =>
                patch({ actingIntensity: e.target.value as SceneActingIntensity })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              {SCENE_ACTING_INTENSITIES.map((id) => (
                <option key={id} value={id}>
                  {t(`instant.storyboard.actingIntensity.${id}` as never)}
                </option>
              ))}
            </select>
          </label>

          {showHeadlineField(scene.template) ?
            <label className="block text-xs text-zinc-500">
              <StoryboardFieldHint
                label={t("instant.overlay.heroText")}
                hint={t("instant.storyboard.hint.heroText")}
              />
              <textarea
                value={scene.heroText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  patch({ heroText: e.target.value })
                }
                rows={2}
                className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm uppercase text-zinc-900"
                placeholder={t("instant.overlay.heroTextPlaceholder")}
              />
            </label>
          : null}

          {showTitleSubtitleFields(scene.template) ?
            <>
              <label className="block text-xs text-zinc-500">
                <StoryboardFieldHint
                  label={t("instant.mode.sceneTitle")}
                  hint={t("instant.storyboard.hint.sceneTitle")}
                />
                <input
                  type="text"
                  value={scene.title}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => patch({ title: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                  placeholder={t("instant.mode.sceneTitlePlaceholder")}
                />
              </label>
              <label className="block text-xs text-zinc-500">
                <StoryboardFieldHint
                  label={t("instant.mode.sceneSubtitle")}
                  hint={t("instant.storyboard.hint.sceneSubtitle")}
                />
                <input
                  type="text"
                  value={scene.subtitle}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    const split = splitSubtitleMultilineInput(e.target.value, scene.extraLines);
                    patch(split);
                  }}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter" && e.shiftKey) {
                      e.preventDefault();
                      if (scene.extraLines.length >= MAX_EXTRA_LINES) {
                        return;
                      }
                      patch({
                        subtitle: scene.subtitle.trim(),
                        extraLines: [...scene.extraLines, ""],
                      });
                    }
                  }}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                  placeholder={t("instant.mode.sceneSubtitlePlaceholder")}
                />
              </label>
              <div className="space-y-2">
                <StoryboardFieldHint
                  label={t("instant.storyboard.extraLinesLabel")}
                  hint={t("instant.storyboard.hint.extraLines")}
                />
                {scene.extraLines.map((line, lineIndex) => (
                  <div key={`${sceneId}-extra-${lineIndex}`} className="flex gap-2">
                    <label className="block min-w-0 flex-1 text-xs text-zinc-500">
                      {t("instant.storyboard.extraLineLabel", { index: lineIndex + 1 })}
                      <input
                        type="text"
                        value={line}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                          const next = [...scene.extraLines];
                          next[lineIndex] = e.target.value;
                          patch({ extraLines: next });
                        }}
                        className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                        placeholder={t("instant.storyboard.extraLinePlaceholder")}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = scene.extraLines.filter((_, i) => i !== lineIndex);
                        patch({ extraLines: next });
                      }}
                      className="mt-5 shrink-0 text-xs text-zinc-400 hover:text-red-600"
                      aria-label={t("instant.storyboard.removeLine")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {scene.extraLines.length < MAX_EXTRA_LINES ?
                  <button
                    type="button"
                    onClick={() => patch({ extraLines: [...scene.extraLines, ""] })}
                    className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    {t("instant.storyboard.addExtraLine")}
                  </button>
                : null}
              </div>
            </>
          : null}

          {showSequenceFields(scene.template) ?
            <div className="space-y-2">
              <p className="text-xs leading-relaxed text-zinc-500">
                <StoryboardFieldHint
                  label={t("instant.overlay.sequenceHelper")}
                  hint={t("instant.storyboard.hint.sequenceLines")}
                />
              </p>
              {sequenceLines.map((line, lineIndex) => (
                <div key={`${sceneId}-seq-${lineIndex}`} className="flex gap-2">
                  <label className="block min-w-0 flex-1 text-xs text-zinc-500">
                    {t("instant.overlay.sequenceLineLabel", { index: lineIndex + 1 })}
                    <input
                      type="text"
                      value={line}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        const next = [...sequenceLines];
                        next[lineIndex] = e.target.value;
                        patch({ lines: next });
                      }}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                      placeholder={t("instant.overlay.sequenceLinePlaceholder")}
                    />
                  </label>
                  {sequenceLines.length > 1 ?
                    <button
                      type="button"
                      onClick={() => {
                        const next = sequenceLines.filter((_, i) => i !== lineIndex);
                        patch({ lines: next.length > 0 ? next : [""] });
                      }}
                      className="mt-5 shrink-0 text-xs text-zinc-400 hover:text-red-600"
                      aria-label={t("instant.storyboard.removeLine")}
                    >
                      ✕
                    </button>
                  : null}
                </div>
              ))}
              {sequenceLines.length < MAX_SEQUENCE_LINES ?
                <button
                  type="button"
                  onClick={() => patch({ lines: [...sequenceLines, ""] })}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                >
                  {t("instant.overlay.addSequenceLine")}
                </button>
              : null}
              <label className="flex items-center gap-2 text-xs text-zinc-600">
                <input
                  type="checkbox"
                  checked={scene.heroFinale}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    patch({ heroFinale: e.target.checked })
                  }
                  className="rounded border-zinc-300"
                />
                {t("instant.storyboard.heroFinaleToggle")}
              </label>
              {scene.heroFinale ?
                <label className="block text-xs text-zinc-500">
                  <StoryboardFieldHint
                    label={t("instant.storyboard.heroFinaleText")}
                    hint={t("instant.storyboard.hint.heroFinale")}
                  />
                  <p className="mt-0.5 text-[11px] text-zinc-400">
                    {t("instant.storyboard.heroFinaleHelper")}
                  </p>
                  <textarea
                    value={scene.heroFinaleText}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                      patch({ heroFinaleText: e.target.value })
                    }
                    rows={3}
                    maxLength={MAX_HERO_FINALE_TEXT_CHARS}
                    className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm uppercase text-zinc-900"
                    placeholder={t("instant.storyboard.heroFinalePlaceholder")}
                  />
                </label>
              : null}
            </div>
          : null}

          {index >= frameCount - 1 ?
            <label className="block text-xs text-zinc-500">
              <StoryboardFieldHint
                label={t("instant.storyboard.finaleFooterLabel")}
                hint={t("instant.storyboard.hint.finaleFooter")}
              />
              <input
                type="text"
                value={scene.finaleFooter}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  patch({ finaleFooter: e.target.value })
                }
                maxLength={MAX_FINALE_FOOTER_CHARS}
                className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                placeholder={t("instant.storyboard.finaleFooterPlaceholder")}
              />
            </label>
          : null}

          <StoryboardOverlayPreview
            scene={previewScene}
            isFinalFrame={index >= frameCount - 1}
            variant={index >= frameCount - 1 ? "final_frame" : "inline"}
            className="mt-1 min-h-[4.5rem]"
          />

          <label className="block text-xs text-zinc-500">
            <StoryboardFieldHint
              label={t("instant.overlay.accentWords")}
              hint={t("instant.storyboard.hint.accentWords")}
            />
            <input
              type="text"
              value={scene.accentWords}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                patch({ accentWords: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
              placeholder={t("instant.overlay.accentWordsPlaceholder")}
            />
          </label>

          {index < imageCount - 1 ?
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3">
              <p className="text-xs font-medium text-zinc-800">
                {t("instant.storyboard.transitionToFrame", { index: index + 2 })}
              </p>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                {t("instant.storyboard.transitionDurationHint")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STORY_SCENE_DURATION_OPTIONS.map((seconds) => {
                  const selected = draftTransitionSeconds(scene) === seconds;
                  return (
                    <button
                      key={seconds}
                      type="button"
                      onClick={() => patch(setTransitionDuration(seconds))}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                        selected ?
                          "border-emerald-500 bg-emerald-50 text-emerald-900"
                        : "border-zinc-200 bg-white text-zinc-700"
                      }`}
                    >
                      {t(`instant.storyboard.duration.${seconds}` as never)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-zinc-500">
                {t("instant.storyboard.transitionTimingPreview", {
                  seconds: draftTransitionSeconds(scene),
                })}
              </p>
            </div>
          : (
            <p className="rounded-lg border border-zinc-100 bg-zinc-50 px-2.5 py-2 text-[11px] text-zinc-600">
              {t("instant.storyboard.finalFrameNoTransition")}
            </p>
          )}
        </div>
      : null}
    </div>
  );
});

function resolveExpandedSceneId(
  sceneIds: string[] | undefined,
  expandedIndex: number | null
): string | null {
  if (expandedIndex === null || expandedIndex < 0) {
    return null;
  }
  return sceneIds?.[expandedIndex] ?? null;
}

/** Index-based API for post-checkout editors. */
export function StoryboardEditorLegacy(props: StoryboardEditorLegacyProps) {
  const expandedSceneId = resolveExpandedSceneId(props.sceneIds, props.expandedIndex);
  return (
    <StoryboardEditor
      {...props}
      expandedSceneId={expandedSceneId}
      onExpandedSceneIdChange={(sceneId) => {
        if (!sceneId) {
          props.onExpandedIndexChange(null);
          return;
        }
        const index = props.sceneIds?.indexOf(sceneId) ?? -1;
        props.onExpandedIndexChange(index >= 0 ? index : null);
      }}
    />
  );
}

export function StoryboardEditor({
  sceneIds,
  images,
  sceneTexts,
  imageCount,
  expandedSceneId,
  onExpandedSceneIdChange,
  onSceneChange,
  onMoveScene,
  onDuplicateTextFromPrevious,
  onClearText,
  onDeleteScene,
}: StoryboardEditorProps) {
  const t = useActiveTranslator();

  if (images.length === 0 && imageCount <= 0) {
    return null;
  }

  const frameCount = Math.max(imageCount, images.length, sceneTexts.length);

  return (
    <div className="mt-6 space-y-3 border-t border-zinc-100 pt-6">
      <div>
        <p className="text-sm font-semibold text-zinc-900">{t("instant.storyboard.title")}</p>
        <p className="mt-1 text-xs leading-relaxed text-zinc-500">
          {t("instant.storyboard.subtitle")}
        </p>
      </div>

      {sceneTexts.slice(0, frameCount).map((scene, index) => {
        const sceneId = sceneIds?.[index] ?? `scene-index-${index}`;
        const expanded = expandedSceneId === sceneId;

        return (
          <StoryboardSceneRow
            key={sceneId}
            sceneId={sceneId}
            scene={scene}
            image={images[index]}
            index={index}
            frameCount={frameCount}
            imageCount={imageCount}
            expanded={expanded}
            onToggleExpanded={() =>
              onExpandedSceneIdChange(expanded ? null : sceneId)
            }
            onSceneChange={onSceneChange}
            onMoveScene={onMoveScene}
            onDuplicateTextFromPrevious={onDuplicateTextFromPrevious}
            onClearText={onClearText}
            onDeleteScene={onDeleteScene}
          />
        );
      })}
    </div>
  );
}
