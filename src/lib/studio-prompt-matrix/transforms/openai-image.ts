/**
 * S.6E — Explicit OpenAI image transform boundary.
 * Wraps existing scene-still prompt builder output; does not rewrite prompt quality.
 */

import type { ContinuityBundle } from "@/lib/studio-prompt-matrix/continuity-bundle";
import type { CreativeSpecification } from "@/lib/studio-prompt-matrix/creative-specification";
import {
  STUDIO_PROMPT_MATRIX_VERSION,
  STUDIO_PROVIDER_TRANSFORM_VERSION,
} from "@/lib/studio-prompt-matrix/types";
import type { PromptBuilderOutput } from "@/types/studio-prompt-builder";

export type OpenAiImageTransformRequest = {
  provider: "openai_image";
  matrixVersion: typeof STUDIO_PROMPT_MATRIX_VERSION;
  providerTransformVersion: typeof STUDIO_PROVIDER_TRANSFORM_VERSION;
  prompt: string;
  stylePrompt: string;
  continuityPrompt: string;
  sectionNames: string[];
  aspectRatio: string | null;
  experience: CreativeSpecification["experience"];
  continuityCharacterIds: string[];
  continuityLocationId: string | null;
  continuityPropIds: string[];
  continuityWorldId: string | null;
  /** Scene T2I pixel conditioning remains PARTIAL — refs listed for honesty, not claimed as conditioned. */
  referenceUrls: string[];
  pixelConditioning: "partial_text_qa";
};

export function transformOpenAiImageFromSceneStill(input: {
  specification: CreativeSpecification;
  continuity: ContinuityBundle;
  builderOutput: PromptBuilderOutput;
}): OpenAiImageTransformRequest {
  const sections = input.builderOutput.sections;
  return {
    provider: "openai_image",
    matrixVersion: STUDIO_PROMPT_MATRIX_VERSION,
    providerTransformVersion: STUDIO_PROVIDER_TRANSFORM_VERSION,
    prompt: input.builderOutput.prompt,
    stylePrompt: input.builderOutput.stylePrompt,
    continuityPrompt: input.builderOutput.continuityPrompt,
    sectionNames: Object.keys(sections).filter(
      (k) => Boolean(sections[k as keyof typeof sections])
    ),
    aspectRatio: input.specification.aspectRatio.resolved,
    experience: input.specification.experience,
    continuityCharacterIds: [...input.specification.continuity.characterIds],
    continuityLocationId: input.specification.continuity.locationId,
    continuityPropIds: [...input.specification.continuity.propIds],
    continuityWorldId: input.specification.continuity.worldId,
    referenceUrls: input.continuity.references.map((r) => r.url),
    pixelConditioning: "partial_text_qa",
  };
}
