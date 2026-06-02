"use client";

import Image from "next/image";
import {
  MAX_EXTRA_LINES,
  MAX_FINALE_FOOTER_CHARS,
  MAX_HERO_FINALE_TEXT_CHARS,
  MAX_SEQUENCE_LINES,
  STORY_SCENE_DURATION_OPTIONS,
  splitSubtitleMultilineInput,
  type SceneOverlayTemplate,
} from "@/lib/story-overlay-templates";
import { useActiveTranslator } from "@/i18n/client";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";
import { StoryboardFieldHint } from "@/components/instant/storyboard-field-hint";
import { StoryboardOverlayPreview } from "@/components/instant/storyboard-overlay-preview";

export type StoryboardImage = {
  id: string;
  previewUrl: string;
};

type StoryboardEditorProps = {
  images: StoryboardImage[];
  sceneTexts: InstantSceneTextDraft[];
  imageCount: number;
  expandedIndex: number | null;
  onExpandedIndexChange: (index: number | null) => void;
  onSceneChange: (index: number, patch: Partial<InstantSceneTextDraft>) => void;
  onMoveScene: (index: number, direction: "up" | "down") => void;
  onDuplicateTextFromPrevious: (index: number) => void;
  onClearText: (index: number) => void;
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

function sceneHasText(scene: InstantSceneTextDraft): boolean {
  if (scene.heroText.trim() || scene.title.trim() || scene.subtitle.trim()) {
    return true;
  }
  if (scene.extraLines.some((line) => line.trim())) {
    return true;
  }
  if (scene.lines.some((line) => line.trim())) {
    return true;
  }
  if (scene.heroFinaleText.trim()) {
    return true;
  }
  return false;
}

function draftTransitionSeconds(scene: InstantSceneTextDraft): number {
  return scene.transitionDurationSeconds ?? scene.durationSeconds;
}

function sceneHeaderLabel(
  scene: InstantSceneTextDraft,
  index: number,
  imageCount: number,
  t: ReturnType<typeof useActiveTranslator>
): string {
  const templateLabel = t(`instant.overlay.template.${scene.template}` as never);
  if (index >= imageCount - 1) {
    return `${t("instant.storyboard.finalFrameLabel")} · ${templateLabel}`;
  }
  return `${draftTransitionSeconds(scene)}s → ${templateLabel}`;
}

function setTransitionDuration(
  seconds: (typeof STORY_SCENE_DURATION_OPTIONS)[number]
): Partial<InstantSceneTextDraft> {
  return {
    transitionDurationSeconds: seconds,
    durationSeconds: seconds,
  };
}

export function StoryboardEditor({
  images,
  sceneTexts,
  imageCount,
  expandedIndex,
  onExpandedIndexChange,
  onSceneChange,
  onMoveScene,
  onDuplicateTextFromPrevious,
  onClearText,
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
        const image = images[index];
        const expanded = expandedIndex === index;
        const collapsed = sceneHasText(scene) && !expanded;
        const sequenceLines =
          showSequenceFields(scene.template) ? defaultSequenceLines(scene) : scene.lines;

        return (
          <div
            key={image?.id ?? index}
            className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm"
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-3 py-3 text-left"
              onClick={() => onExpandedIndexChange(expanded ? null : index)}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
                {image?.previewUrl ?
                  <Image
                    src={image.previewUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="56px"
                    unoptimized
                  />
                : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t("instant.storyboard.frameLabel", { index: index + 1 })}
                </p>
                <p className="truncate text-sm font-medium text-zinc-900">
                  {sceneHeaderLabel(scene, index, imageCount, t)}
                </p>
              </div>
              <span className="text-xs text-zinc-400">{expanded ? "▲" : "▼"}</span>
            </button>

            {!collapsed || expanded ?
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
                </div>

                <label className="block text-xs text-zinc-500">
                  {t("instant.overlay.templateLabel")}
                  <select
                    value={scene.template}
                    onChange={(e) => {
                      const template = e.target.value as SceneOverlayTemplate;
                      if (template === "sequence") {
                        onSceneChange(index, {
                          template,
                          lines: defaultSequenceLines(scene),
                        });
                        return;
                      }
                      onSceneChange(index, { template });
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

                {showHeadlineField(scene.template) ?
                  <label className="block text-xs text-zinc-500">
                    <StoryboardFieldHint
                      label={t("instant.overlay.heroText")}
                      hint={t("instant.storyboard.hint.heroText")}
                    />
                    <textarea
                      value={scene.heroText}
                      onChange={(e) => onSceneChange(index, { heroText: e.target.value })}
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
                        onChange={(e) => onSceneChange(index, { title: e.target.value })}
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
                        onChange={(e) => {
                          const split = splitSubtitleMultilineInput(e.target.value, scene.extraLines);
                          onSceneChange(index, split);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && e.shiftKey) {
                            e.preventDefault();
                            if (scene.extraLines.length >= MAX_EXTRA_LINES) {
                              return;
                            }
                            onSceneChange(index, {
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
                        <div key={lineIndex} className="flex gap-2">
                          <label className="block min-w-0 flex-1 text-xs text-zinc-500">
                            {t("instant.storyboard.extraLineLabel", { index: lineIndex + 1 })}
                            <input
                              type="text"
                              value={line}
                              onChange={(e) => {
                                const next = [...scene.extraLines];
                                next[lineIndex] = e.target.value;
                                onSceneChange(index, { extraLines: next });
                              }}
                              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                              placeholder={t("instant.storyboard.extraLinePlaceholder")}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => {
                              const next = scene.extraLines.filter((_, i) => i !== lineIndex);
                              onSceneChange(index, { extraLines: next });
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
                          onClick={() =>
                            onSceneChange(index, { extraLines: [...scene.extraLines, ""] })
                          }
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
                      <div key={lineIndex} className="flex gap-2">
                        <label className="block min-w-0 flex-1 text-xs text-zinc-500">
                          {t("instant.overlay.sequenceLineLabel", { index: lineIndex + 1 })}
                          <input
                            type="text"
                            value={line}
                            onChange={(e) => {
                              const next = [...sequenceLines];
                              next[lineIndex] = e.target.value;
                              onSceneChange(index, { lines: next });
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
                              onSceneChange(index, { lines: next.length > 0 ? next : [""] });
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
                        onClick={() => onSceneChange(index, { lines: [...sequenceLines, ""] })}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                      >
                        {t("instant.overlay.addSequenceLine")}
                      </button>
                    : null}
                    <label className="flex items-center gap-2 text-xs text-zinc-600">
                      <input
                        type="checkbox"
                        checked={scene.heroFinale}
                        onChange={(e) => onSceneChange(index, { heroFinale: e.target.checked })}
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
                          onChange={(e) => onSceneChange(index, { heroFinaleText: e.target.value })}
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
                      onChange={(e) => onSceneChange(index, { finaleFooter: e.target.value })}
                      maxLength={MAX_FINALE_FOOTER_CHARS}
                      className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900"
                      placeholder={t("instant.storyboard.finaleFooterPlaceholder")}
                    />
                  </label>
                : null}

                <StoryboardOverlayPreview
                  scene={scene}
                  isFinalFrame={index >= frameCount - 1}
                  variant={index >= frameCount - 1 ? "final_frame" : "inline"}
                  className="mt-1"
                />

                <label className="block text-xs text-zinc-500">
                  <StoryboardFieldHint
                    label={t("instant.overlay.accentWords")}
                    hint={t("instant.storyboard.hint.accentWords")}
                  />
                  <input
                    type="text"
                    value={scene.accentWords}
                    onChange={(e) => onSceneChange(index, { accentWords: e.target.value })}
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
                            onClick={() => onSceneChange(index, setTransitionDuration(seconds))}
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
      })}
    </div>
  );
}
