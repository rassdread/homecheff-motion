import { buildMotionInstantIdentityPromptBlock } from "@/lib/motion-instant-identity-enrichment";
import type { MotionIdentityProfile } from "@/types/motion-preset-engine";
import type { MotionReferenceVisionSignals } from "@/lib/motion-reference-vision-signals";

const CONSISTENCY_RULES = [
  "Never redesign the subject — preserve face, hair, skin tone, body shape, clothing, accessories, mascot traits, logo marks, and brand colors.",
  "Do not add random accessories, change outfit palette, or morph identity between frames.",
  "Keep the uploaded subject visually linked to the source reference throughout the entire clip.",
];

export type MotionIdentityLockBlock = {
  identityBlock: string;
  consistencyRules: string[];
  combinedPromptBlock: string;
};

/** Motion Identity Lock — structured enforcement for all render paths. */
export function buildMotionIdentityLock(input: {
  profile: MotionIdentityProfile;
  visionSignals?: MotionReferenceVisionSignals[];
}): MotionIdentityLockBlock {
  const primaryVision = input.visionSignals?.[0]?.visionAnalysis ?? null;
  const identityBlock = buildMotionInstantIdentityPromptBlock({
    sourceName: input.profile.primaryReferenceId ?? "uploaded subject",
    visionAnalysis: primaryVision,
    analysisCached: input.profile.analysisCached,
  });

  const sections: string[] = [
    "MOTION IDENTITY LOCK",
    identityBlock,
  ];

  if (input.profile.face.length) {
    sections.push(`Face identity: ${input.profile.face.join("; ")}.`);
  }
  if (input.profile.hair.length) {
    sections.push(`Hair identity: ${input.profile.hair.join("; ")}.`);
  }
  if (input.profile.bodyProportions.length) {
    sections.push(`Body identity: ${input.profile.bodyProportions.join("; ")}.`);
  }
  if (input.profile.clothing.length) {
    sections.push(`Clothing identity: ${input.profile.clothing.join("; ")}.`);
  }
  if (input.profile.accessories.length || input.profile.jewelry.length || input.profile.glasses.length) {
    sections.push(
      `Accessory identity: ${[...input.profile.accessories, ...input.profile.jewelry, ...input.profile.glasses].join("; ")}.`
    );
  }
  if (input.profile.mascotTraits.length) {
    sections.push(`Mascot identity: ${input.profile.mascotTraits.join("; ")}.`);
  }
  if (input.profile.logoTraits.length || input.profile.brandColors.length) {
    sections.push(
      `Brand identity: ${[...input.profile.logoTraits, ...input.profile.brandColors].join("; ")}.`
    );
  }
  if (input.profile.styleDnaSummary.length) {
    sections.push(`Style DNA: ${input.profile.styleDnaSummary.join("; ")}.`);
  }

  sections.push(`Consistency rules: ${CONSISTENCY_RULES.join(" ")}`);

  if (input.profile.intelligencePromptBlock) {
    sections.push(input.profile.intelligencePromptBlock);
  }

  const combinedPromptBlock = sections.join("\n\n");
  return {
    identityBlock,
    consistencyRules: CONSISTENCY_RULES,
    combinedPromptBlock,
  };
}

export function motionIdentityLockPromptBlock(
  profile: MotionIdentityProfile,
  visionSignals?: MotionReferenceVisionSignals[]
): string {
  return buildMotionIdentityLock({ profile, visionSignals }).combinedPromptBlock;
}
