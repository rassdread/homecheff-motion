"use client";

import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { STUDIO_TOOL_IDS, type StudioToolId } from "@/lib/studio-tool-id";

const TOOL_LABEL_KEYS: Record<StudioToolId, TranslationKey> = {
  production: "studio.tools.production",
  productionHistory: "studio.tools.productionHistory",
  creationAssistant: "studio.tools.creationAssistant",
  creativeReview: "studio.tools.creativeReview",
  storyArchitecture: "studio.tools.storyArchitecture",
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

type Props = {
  activeTool: StudioToolId;
  onToolChange: (tool: StudioToolId) => void;
  disabled?: boolean;
};

export function StudioToolStrip({ activeTool, onToolChange, disabled = false }: Props) {
  const t = useActiveTranslator();

  return (
    <div
      className="border-t border-zinc-200 bg-white/95 backdrop-blur"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="mx-auto max-w-[1600px] overflow-x-auto px-2 py-2 sm:px-4">
        <div className="flex min-w-max gap-1" role="tablist" aria-label={t("studio.tools.stripLabel")}>
          {STUDIO_TOOL_IDS.map((tool) => {
            const active = activeTool === tool;
            return (
              <button
                key={tool}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => onToolChange(tool)}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-semibold transition sm:px-4 sm:text-sm ${
                  active ?
                    "bg-[#0067B1]/10 text-[#0067B1]"
                  : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
                }`}
              >
                {t(TOOL_LABEL_KEYS[tool])}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
