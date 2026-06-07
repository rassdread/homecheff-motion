"use client";

import { useMemo } from "react";
import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { StudioDirectorProfile } from "@/lib/studio-director-profiles";
import type { StudioPromptStyleProfile } from "@/lib/studio-prompt-style-profiles";
import { useActiveTranslator } from "@/i18n/client";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioSceneDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";

type StudioScenePromptPreviewProps = {
  scene: StudioSceneDetail;
  styleProfile: StudioPromptStyleProfile;
  directorProfile?: StudioDirectorProfile;
  characters?: StudioCharacterListItem[];
  locations?: StudioLocationListItem[];
  props?: StudioPropListItem[];
  worlds?: StudioWorldProfileListItem[];
};

function PromptBlock({ label, body }: { label: string; body: string }) {
  if (!body.trim()) {
    return null;
  }
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</h4>
      <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">{body}</p>
    </div>
  );
}

export function StudioScenePromptPreview({
  scene,
  styleProfile,
  directorProfile,
  characters = [],
  locations = [],
  props = [],
  worlds = [],
}: StudioScenePromptPreviewProps) {
  const t = useActiveTranslator();
  const output = useMemo(
    () =>
      buildScenePromptFromInput(
        studioSceneDetailToPromptInput(scene, styleProfile, directorProfile, {
          sourceEntities: { characters, locations, props, worlds },
        })
      ),
    [scene, styleProfile, directorProfile, characters, locations, props, worlds]
  );

  const tierLabel =
    output.metadata.qualityTier === "strong"
      ? t("studio.prompt.quality.strong")
      : output.metadata.qualityTier === "good"
        ? t("studio.prompt.quality.good")
        : t("studio.prompt.quality.weak");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[#006D52]">{t("studio.prompt.previewTitle")}</p>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
          {t("studio.prompt.quality.label")}: {tierLabel} ({output.metadata.qualityScore})
        </span>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t("studio.prompt.scenePrompt")}
        </h4>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-900">
          {output.prompt}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PromptBlock label={t("studio.prompt.section.characters")} body={output.sections.characters} />
        <PromptBlock label={t("studio.prompt.section.location")} body={output.sections.location} />
        <PromptBlock label={t("studio.prompt.section.props")} body={output.sections.props} />
        <PromptBlock label={t("studio.prompt.section.action")} body={output.sections.action} />
        <PromptBlock label={t("studio.prompt.section.emotion")} body={output.sections.emotion} />
        <PromptBlock label={t("studio.prompt.section.director")} body={output.sections.director} />
        <PromptBlock label={t("studio.prompt.section.camera")} body={output.sections.camera} />
        <PromptBlock label={t("studio.prompt.section.visualStyle")} body={output.sections.visualStyle} />
        <PromptBlock label={t("studio.prompt.section.identity")} body={output.sections.identity} />
        <PromptBlock
          label={t("studio.prompt.section.continuity")}
          body={output.sections.continuity}
        />
      </div>

      <p className="text-xs text-zinc-500">
        {t("studio.prompt.versionHint", {
          version: String(output.metadata.promptVersion),
          date: new Date(output.metadata.generatedAt).toLocaleString(),
        })}
      </p>
    </div>
  );
}
