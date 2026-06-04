import { buildActionPrompt } from "@/lib/studio-prompt-action-builder";
import { buildCameraPrompt } from "@/lib/studio-prompt-camera-builder";
import { buildCharactersPrompt } from "@/lib/studio-prompt-character-builder";
import { buildContinuityPrompt } from "@/lib/studio-prompt-continuity-builder";
import { buildEmotionPrompt } from "@/lib/studio-prompt-emotion-builder";
import { buildLocationPrompt } from "@/lib/studio-prompt-location-builder";
import { buildPropsPrompt } from "@/lib/studio-prompt-prop-builder";
import { scorePromptQuality } from "@/lib/studio-prompt-quality";
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
    camera: buildCameraPrompt(input.scene.camera),
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

export function buildScenePrompt(
  scene: SceneSnapshot,
  styleProfile?: StudioPromptStyleProfile | string,
  memoryBundle?: SceneMemoryBundle
): PromptBuilderOutput {
  const input = sceneSnapshotToPromptInput(scene, styleProfile);
  return buildScenePromptFromInput(
    memoryBundle ? { ...input, memoryBundle } : input
  );
}
