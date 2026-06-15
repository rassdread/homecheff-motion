"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PublishMediaEmptyCtaRow } from "@/components/publish/publish-media-empty-cta-row";
import { PublishMusicPanel } from "@/components/publish/publish-music-panel";
import { PublishSoundEffectsPanel } from "@/components/publish/publish-sound-effects-panel";
import { PublishSubtitlesPanel } from "@/components/publish/publish-subtitles-panel";
import { PublishTextOverlayPanel } from "@/components/publish/publish-text-overlay-panel";
import { PublishVoicePanel } from "@/components/publish/publish-voice-panel";
import { useActiveTranslator } from "@/i18n/client";
import { buildPublishAiProposal } from "@/lib/publish-ai-assistant";
import {
  applyProductionConfigToProject,
  isProductionSectionActive,
  loadPublishProductionFromProject,
  patchPublishProduction,
  productionNeedsEmptyStateCtas,
} from "@/lib/publish-media-production";
import { savePublishProject } from "@/lib/publish-overlay-session";
import { parseSrtContent, parseVttContent } from "@/lib/publish-overlay-timeline";
import type { PublishProject } from "@/types/publish-overlay";
import type {
  PublishProductionConfig,
  PublishProductionSectionId,
} from "@/types/publish-media-production";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  project: PublishProject;
  hcProject?: HomeCheffProjectPackage | null;
  onProjectChange: (project: PublishProject) => void;
  focusSection?: PublishProductionSectionId | null;
};

export function PublishMediaWorkspace({
  project,
  hcProject,
  onProjectChange,
  focusSection = null,
}: Props) {
  const t = useActiveTranslator();
  const sectionRefs = useRef<Partial<Record<PublishProductionSectionId, HTMLElement | null>>>({});
  const [activeFocus, setActiveFocus] = useState<PublishProductionSectionId | null>(focusSection);

  const production = useMemo(() => loadPublishProductionFromProject(project), [project]);
  const proposal = useMemo(() => buildPublishAiProposal({ project, hcProject }), [project, hcProject]);

  const persistProduction = useCallback(
    (nextProduction: PublishProductionConfig) => {
      const patched = patchPublishProduction(project, nextProduction);
      const applied = applyProductionConfigToProject(patched);
      onProjectChange(savePublishProject(applied));
    },
    [onProjectChange, project]
  );

  const patchSection = useCallback(
    (patch: Partial<PublishProductionConfig>) => {
      const current = loadPublishProductionFromProject(project);
      persistProduction({ ...current, ...patch });
    },
    [persistProduction, project]
  );

  const scrollToSection = (section: PublishProductionSectionId) => {
    setActiveFocus(section);
    sectionRefs.current[section]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const missingSections = useMemo((): PublishProductionSectionId[] => {
    const sections: PublishProductionSectionId[] = [
      "voice",
      "music",
      "soundEffects",
      "subtitles",
      "textOverlays",
    ];
    return sections.filter((section) => !isProductionSectionActive(production, section));
  }, [production]);

  const handleSrtImport = async (file: File) => {
    const text = await file.text();
    const segments = file.name.endsWith(".vtt") ? parseVttContent(text) : parseSrtContent(text);
    onProjectChange(
      savePublishProject({
        ...project,
        subtitles: [...project.subtitles, ...segments],
        updatedAt: new Date().toISOString(),
      })
    );
    patchSection({
      subtitles: {
        ...production.subtitles,
        mode: "srt_upload",
        label: `${production.subtitles.language.toUpperCase()} SRT`,
      },
    });
  };

  const showEmptyCtas = productionNeedsEmptyStateCtas(production) || missingSections.length > 0;

  return (
    <div className="space-y-4" data-testid="publish-media-workspace">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{t("publish.media.workspaceTitle" as never)}</h2>
        <p className="mt-1 text-sm text-zinc-600">{t("publish.media.workspaceLead" as never)}</p>
      </div>

      {showEmptyCtas ?
        <PublishMediaEmptyCtaRow onSelect={scrollToSection} missingSections={missingSections} />
      : null}

      <div
        ref={(el) => {
          sectionRefs.current.voice = el;
        }}
        className={activeFocus === "voice" ? "ring-2 ring-[#0067B1]/30 rounded-2xl" : ""}
      >
        <PublishVoicePanel
          value={production.voice}
          defaultScript={proposal.voiceOverScript}
          onChange={(voice) => patchSection({ voice })}
        />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.music = el;
        }}
        className={activeFocus === "music" ? "ring-2 ring-[#0067B1]/30 rounded-2xl" : ""}
      >
        <PublishMusicPanel
          value={production.music}
          suggestedMood={proposal.musicDirection}
          onChange={(music) => patchSection({ music })}
        />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.soundEffects = el;
        }}
        className={activeFocus === "soundEffects" ? "ring-2 ring-[#0067B1]/30 rounded-2xl" : ""}
      >
        <PublishSoundEffectsPanel
          value={production.soundEffects}
          onChange={(soundEffects) => patchSection({ soundEffects })}
        />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.subtitles = el;
        }}
        className={activeFocus === "subtitles" ? "ring-2 ring-[#0067B1]/30 rounded-2xl" : ""}
      >
        <PublishSubtitlesPanel
          value={production.subtitles}
          onChange={(subtitles) => patchSection({ subtitles })}
          onImportSrt={handleSrtImport}
        />
      </div>

      <div
        ref={(el) => {
          sectionRefs.current.textOverlays = el;
        }}
        className={activeFocus === "textOverlays" ? "ring-2 ring-[#0067B1]/30 rounded-2xl" : ""}
      >
        <PublishTextOverlayPanel
          value={production.textOverlays}
          onChange={(textOverlays) => patchSection({ textOverlays })}
        />
      </div>
    </div>
  );
}
