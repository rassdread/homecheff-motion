"use client";

import { useActiveTranslator } from "@/i18n/client";
import {
  buildStoryboardOverlayPreviewLines,
  storyboardPreviewHasContent,
  type StoryboardOverlayPreviewLine,
} from "@/lib/storyboard-overlay-preview";
import { STORY_PREVIEW_TYPOGRAPHY_CLASS } from "@/lib/story-overlay-typography-scale";
import { previewInlineStyleForLayer } from "@/lib/story-overlay-layer-styles";
import type { InstantSceneTextDraft } from "@/components/instant/instant-mode-panel";

type Props = {
  scene: InstantSceneTextDraft;
  isFinalFrame?: boolean;
  variant?: "inline" | "final_frame";
  className?: string;
};

function previewLineClass(line: StoryboardOverlayPreviewLine, isFinalFrame: boolean): string {
  if (line.kind === "headline" || line.kind === "hero_finale") {
    return line.kind === "hero_finale"
      ? STORY_PREVIEW_TYPOGRAPHY_CLASS.heroFinale
      : STORY_PREVIEW_TYPOGRAPHY_CLASS.headline;
  }
  if (line.kind === "title") {
    return STORY_PREVIEW_TYPOGRAPHY_CLASS.title;
  }
  if (line.kind === "footer") {
    return STORY_PREVIEW_TYPOGRAPHY_CLASS.footer;
  }
  if (line.kind === "subtitle") {
    return isFinalFrame
      ? STORY_PREVIEW_TYPOGRAPHY_CLASS.subtitle
      : `mt-1.5 ${STORY_PREVIEW_TYPOGRAPHY_CLASS.extraLine}`;
  }
  if (line.kind === "extra_line") {
    return STORY_PREVIEW_TYPOGRAPHY_CLASS.extraLine;
  }
  if (line.kind === "sequence_line") {
    return STORY_PREVIEW_TYPOGRAPHY_CLASS.sequenceLine;
  }
  return STORY_PREVIEW_TYPOGRAPHY_CLASS.extraLine;
}

export function StoryboardOverlayPreview({
  scene,
  isFinalFrame = false,
  variant = "inline",
  className = "",
}: Props) {
  const t = useActiveTranslator();
  const lines = buildStoryboardOverlayPreviewLines(scene, { isFinalFrame });
  const hasContent = storyboardPreviewHasContent(lines);

  const shellClass =
    variant === "final_frame"
      ? "rounded-xl border border-zinc-800 bg-gradient-to-b from-zinc-900 via-zinc-900 to-black px-4 py-5 shadow-inner"
      : "rounded-xl border border-zinc-200 bg-zinc-900/95 px-3 py-3";

  return (
    <div className={`${shellClass} ${className}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {variant === "final_frame"
          ? t("instant.storyboard.preview.finalFrameTitle")
          : t("instant.storyboard.preview.liveTitle")}
      </p>
      {hasContent ?
        <div className="mt-3 space-y-1.5">
          {lines.map((line) => (
            <div key={line.id}>
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                {line.beatNumber != null
                  ? t(line.labelKey as never, { n: line.beatNumber })
                  : t(line.labelKey as never)}
              </p>
              <p
                className={`whitespace-pre-wrap ${previewLineClass(line, isFinalFrame)}`}
                style={previewInlineStyleForLayer(
                  scene.overlayLayerStyles?.[line.styleLayer],
                  line.kind === "headline" || line.kind === "hero_finale" ? 1.1 : 1
                )}
              >
                {line.text}
              </p>
            </div>
          ))}
        </div>
      : <p className="mt-2 text-xs italic text-zinc-500">
          {t("instant.storyboard.preview.empty")}
        </p>
      }
    </div>
  );
}
