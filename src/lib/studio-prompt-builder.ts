import { buildActionPrompt } from "@/lib/studio-prompt-action-builder";
import { buildDirectorProfilePrompt } from "@/lib/studio-director-profiles";
import { buildCameraPrompt } from "@/lib/studio-prompt-camera-builder";
import { buildDirectorCameraPrompt } from "@/lib/studio-scene-director";
import { buildCharactersPrompt } from "@/lib/studio-prompt-character-builder";
import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import { buildEmotionPrompt } from "@/lib/studio-prompt-emotion-builder";
import { buildLocationPrompt } from "@/lib/studio-prompt-location-builder";
import { buildPropsPrompt } from "@/lib/studio-prompt-prop-builder";
import { scorePromptQuality } from "@/lib/studio-prompt-quality";
import { normalizeStudioDirectorProfile } from "@/lib/studio-director-profiles";
import {
  buildStyleProfilePrompt,
  type StudioPromptStyleProfile,
} from "@/lib/studio-prompt-style-profiles";
import {
  buildCorrectedPrompt,
  recommendationsToPromptPatches,
} from "@/lib/build-corrected-prompt";
import { sceneSnapshotToPromptInput } from "@/lib/studio-scene-to-prompt-input";
import type { SceneMemoryBundle } from "@/types/studio-memory-snapshots";
import {
  PROMPT_BUILDER_VERSION,
  type PromptBuilderInput,
  type PromptBuilderOutput,
  type PromptBuilderSections,
} from "@/types/studio-prompt-builder";
import type { SceneSnapshot } from "@/types/studio-scene-snapshot";

const QUALITY_INSTRUCTIONS =
  "High detail, coherent composition, natural lighting, no text overlays, no watermarks.";

function joinParagraphs(parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

function buildSceneContextSection(input: PromptBuilderInput): string {
  const title = input.scene.title.trim();
  const description = input.scene.description.trim();
  if (title && description) {
    return `${title}. ${description}`;
  }
  return title || description || "Storyboard scene.";
}

export function buildPromptSections(input: PromptBuilderInput): PromptBuilderSections {
  const stylePrompt = buildStyleProfilePrompt(input.styleProfile);
  const continuity = buildContinuityPrompt({
    characters: input.characters,
    location: input.location,
    props: input.props,
    memoryBundle: input.memoryBundle,
  });

  return {
    sceneContext: buildSceneContextSection(input),
    characters: buildCharactersPrompt(input.characters),
    location: buildLocationPrompt(input.location),
    props: buildPropsPrompt(input.props),
    action: buildActionPrompt(input.scene.action),
    emotion: buildEmotionPrompt(input.scene.emotion),
    camera:
      buildDirectorCameraPrompt({
        shotType: input.shotType,
        cameraMovement: input.cameraMovement,
        sceneEnergy: input.sceneEnergy,
        legacyCamera: input.scene.camera,
      }) || buildCameraPrompt(input.scene.camera),
    director: buildDirectorProfilePrompt(normalizeStudioDirectorProfile(input.directorProfile)),
    visualStyle: stylePrompt,
    qualityInstructions: QUALITY_INSTRUCTIONS,
    continuity,
  };
}

export function buildScenePromptFromInput(input: PromptBuilderInput): PromptBuilderOutput {
  const sections = buildPromptSections(input);
  const quality = scorePromptQuality(input);

  const bodyParts = [
    sections.location,
    sections.characters
      ? `${sections.characters}${sections.props ? `\n\nProps:\n${sections.props}` : ""}`
      : sections.props
        ? `Props:\n${sections.props}`
        : "",
    [sections.action, sections.emotion].filter(Boolean).join(" "),
    sections.director,
    sections.camera,
    sections.visualStyle,
    sections.qualityInstructions,
  ];

  let prompt = joinParagraphs(bodyParts);
  const corrections = input.correctionRecommendations ?? [];
  if (corrections.length > 0) {
    prompt = buildCorrectedPrompt(
      prompt,
      recommendationsToPromptPatches(corrections)
    );
  }
  const generatedAt = new Date().toISOString();

  return {
    prompt,
    stylePrompt: sections.visualStyle,
    continuityPrompt: sections.continuity,
    sections,
    metadata: {
      promptVersion: PROMPT_BUILDER_VERSION,
      generatedAt,
      sceneId: input.scene.sceneId,
      generatedPrompt: prompt,
      styleProfile: input.styleProfile,
      qualityScore: quality.score,
      qualityTier: quality.tier,
    },
  };
}

export type ScenePromptDirectorOptions = {
  directorProfile?: string;
  shotType?: string;
  cameraMovement?: string;
  sceneEnergy?: string;
};

export function buildScenePrompt(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string,
  memoryBundle?: SceneMemoryBundle,
  director?: ScenePromptDirectorOptions
): PromptBuilderOutput {
  const input = sceneSnapshotToPromptInput(scene, styleProfile, director?.directorProfile);
  const withDirector = {
    ...input,
    shotType: director?.shotType ?? scene.shotType,
    cameraMovement: director?.cameraMovement ?? scene.cameraMovement,
    sceneEnergy: director?.sceneEnergy ?? scene.sceneEnergy,
    directorProfile: director?.directorProfile
      ? normalizeStudioDirectorProfile(director.directorProfile)
      : input.directorProfile,
    ...(memoryBundle ? { memoryBundle } : {}),
  };
  return buildScenePromptFromInput(withDirector);
}
