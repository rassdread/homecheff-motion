/**
 * Preview vs production prompt parity validation.
 */

import { buildScenePromptFromInput } from "@/lib/studio-prompt-builder";
import {
  buildPromptSourceEntitiesFromSceneDetail,
  buildSceneDirectorContextLines,
} from "@/lib/studio-prompt-source-entities";
import { studioSceneDetailToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { PromptBuilderOutput, PromptBuilderSections } from "@/types/studio-prompt-builder";
import type { StudioSceneDetail, StudioWorldProfileListItem } from "@/types/studio-api";

export type PromptParitySectionDiff = {
  section: keyof PromptBuilderSections;
  preview: string;
  production: string;
  equal: boolean;
};

export type PromptParityReport = {
  parity: boolean;
  promptEqual: boolean;
  sectionDiffs: PromptParitySectionDiff[];
  previewPromptLength: number;
  productionPromptLength: number;
  missingInProduction: string[];
};

function sectionDiffs(
  preview: PromptBuilderOutput,
  production: PromptBuilderOutput
): PromptParitySectionDiff[] {
  const keys = Object.keys(preview.sections) as Array<keyof PromptBuilderSections>;
  return keys.map((section) => {
    const a = preview.sections[section]?.trim() ?? "";
    const b = production.sections[section]?.trim() ?? "";
    return { section, preview: a, production: b, equal: a === b };
  });
}

/** Compare preview path vs production path for the same scene + libraries. */
export function comparePreviewAndProductionPrompts(params: {
  scene: StudioSceneDetail;
  styleProfile?: string;
  directorProfile?: string;
  worlds?: StudioWorldProfileListItem[];
  characters?: StudioSceneDetail["characters"];
  locations?: StudioSceneDetail["location"][];
  props?: StudioSceneDetail["props"];
}): PromptParityReport {
  const sourceEntities = buildPromptSourceEntitiesFromSceneDetail(
    params.scene,
    params.worlds ?? []
  );
  if (params.characters?.length) {
    sourceEntities.characters = params.characters;
  }
  if (params.locations?.length) {
    sourceEntities.locations = params.locations.filter(Boolean) as typeof sourceEntities.locations;
  }
  if (params.props?.length) {
    sourceEntities.props = params.props;
  }

  const directorContextLines = buildSceneDirectorContextLines(params.scene, sourceEntities);
  const input = studioSceneDetailToPromptInput(
    params.scene,
    params.styleProfile,
    params.directorProfile,
    { sourceEntities, directorContextLines }
  );

  const preview = buildScenePromptFromInput(input);
  const production = buildScenePromptFromInput(input);

  const diffs = sectionDiffs(preview, production);
  const missingInProduction = diffs
    .filter((d) => !d.equal && d.preview && !d.production)
    .map((d) => d.section);

  return {
    parity: preview.prompt.trim() === production.prompt.trim(),
    promptEqual: preview.prompt.trim() === production.prompt.trim(),
    sectionDiffs: diffs,
    previewPromptLength: preview.prompt.length,
    productionPromptLength: production.prompt.length,
    missingInProduction,
  };
}

/** Assert production includes identity + director sections when libraries present. */
export function productionPromptHasIdentityContext(output: PromptBuilderOutput): boolean {
  const identity = output.sections.identity?.trim() ?? "";
  const directorIdentity = output.sections.directorIdentity?.trim() ?? "";
  const continuity = output.sections.continuity?.trim() ?? "";
  return Boolean(identity || directorIdentity || continuity);
}
