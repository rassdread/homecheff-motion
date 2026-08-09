"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import {
  isStudioPrimaryTool,
  STUDIO_TOOL_GROUPS,
  type StudioToolGroupId,
} from "@/lib/studio-tool-groups";
import { STUDIO_TOOL_IDS, type StudioToolId } from "@/lib/studio-tool-id";

const TOOL_LABEL_KEYS: Record<StudioToolId, TranslationKey> = {
  production: "studio.tools.production",
  insights: "studio.tools.insights",
  productionHistory: "studio.tools.productionHistory",
  creationAssistant: "studio.tools.creationAssistant",
  creativeReview: "studio.tools.creativeReview",
  storyArchitecture: "studio.tools.storyArchitecture",
  directorPreferences: "studio.tools.directorPreferences",
  creativeDirector: "studio.tools.creativeDirector",
  story: "studio.tools.story",
  characters: "studio.tools.characters",
  locations: "studio.tools.locations",
  props: "studio.tools.props",
  world: "studio.tools.world",
  visual: "studio.tools.visual",
  consistency: "studio.tools.consistency",
  continuity: "studio.tools.continuity",
  voice: "studio.tools.voice",
  music: "studio.tools.music",
  sound: "studio.tools.sound",
  text: "studio.tools.text",
  subtitles: "studio.tools.subtitles",
  render: "studio.tools.render",
  versions: "studio.tools.versions",
  translate: "studio.tools.translate",
  export: "studio.tools.export",
};

const GROUP_LABEL_KEYS: Record<StudioToolGroupId, TranslationKey> = {
  create: "studio.tools.group.create",
  story: "studio.tools.group.story",
  audio: "studio.tools.group.audio",
  post: "studio.tools.group.post",
  direct: "studio.tools.group.direct",
  more: "studio.tools.group.more",
};

type Props = {
  activeTool: StudioToolId;
  onToolChange: (tool: StudioToolId) => void;
  disabled?: boolean;
  /** vertical compact rail for mobile landscape */
  variant?: "bottom" | "side";
};

export function StudioToolStrip({
  activeTool,
  onToolChange,
  disabled = false,
  variant = "bottom",
}: Props) {
  const t = useActiveTranslator();
  const [showAll, setShowAll] = useState(() => !isStudioPrimaryTool(activeTool));

  const visibleTools = useMemo(() => {
    if (showAll) {
      return STUDIO_TOOL_IDS;
    }
    const primary = STUDIO_TOOL_IDS.filter(isStudioPrimaryTool);
    if (!primary.includes(activeTool)) {
      return [...primary, activeTool];
    }
    return primary;
  }, [activeTool, showAll]);

  const isSide = variant === "side";

  return (
    <div
      className={
        isSide ?
          "flex h-full w-[72px] shrink-0 flex-col border-r border-zinc-200 bg-white/95 backdrop-blur"
        : "border-t border-zinc-200 bg-white/95 backdrop-blur"
      }
      style={
        isSide ? undefined : { paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }
      }
      data-testid={isSide ? "studio-tool-rail-side" : "studio-tool-strip"}
      data-studio-tools-expanded={showAll ? "true" : "false"}
    >
      <div
        className={
          isSide ?
            "flex flex-1 flex-col gap-1 overflow-y-auto px-1 py-2"
          : "mx-auto w-full overflow-x-auto px-2 py-2 sm:px-4"
        }
      >
        <div
          className={isSide ? "flex flex-col gap-1" : "flex min-w-max gap-1"}
          role="tablist"
          aria-label={t("studio.tools.stripLabel")}
        >
          {visibleTools.map((tool) => {
            const active = activeTool === tool;
            return (
              <button
                key={tool}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onToolChange(tool)}
                className={
                  isSide ?
                    `min-h-11 w-full rounded-lg px-1 py-2 text-[10px] font-semibold leading-tight transition ${
                      active ?
                        "bg-[#0067B1]/10 text-[#0067B1]"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                    }`
                  : `shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                      active ?
                        "bg-[#0067B1]/10 text-[#0067B1]"
                      : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                    }`
                }
              >
                {t(TOOL_LABEL_KEYS[tool])}
              </button>
            );
          })}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setShowAll((v) => !v)}
            className={
              isSide ?
                "min-h-11 w-full rounded-lg border border-zinc-200 px-1 py-2 text-[10px] font-semibold text-zinc-700"
              : "shrink-0 rounded-full border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 sm:px-4 sm:text-sm"
            }
            aria-expanded={showAll}
          >
            {showAll ? t("studio.tools.showLess") : t("studio.tools.showMore")}
          </button>
        </div>
        {showAll && !isSide ?
          <div className="mt-2 flex flex-wrap gap-2 px-1" aria-hidden>
            {STUDIO_TOOL_GROUPS.map((group) => (
              <span
                key={group.id}
                className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500"
              >
                {t(GROUP_LABEL_KEYS[group.id])}
              </span>
            ))}
          </div>
        : null}
      </div>
    </div>
  );
}
