/**
 * Quick Ad intent — thin specialization of Simple Studio (purpose=advertisement).
 * Public API preserved for existing Quick Ad UI + tests.
 */

import type { SimpleStudioPlatform } from "@/lib/simple-studio/catalog";
import {
  buildSimpleStudioPipelineMessage,
  inferSimpleStudioIntent,
  simpleStudioProjectName,
} from "@/lib/simple-studio/intent-infer";

export type QuickAdPlatform = SimpleStudioPlatform;

export type QuickAdIntent = {
  product: string | null;
  audience: string | null;
  location: string | null;
  purpose: "social_ad";
  tone: string;
  platforms: QuickAdPlatform[];
  cta: string;
  format: "9:16";
  durationSeconds: 20;
};

export function inferQuickAdIntent(input: {
  story: string;
  platforms?: QuickAdPlatform[];
}): QuickAdIntent {
  const base = inferSimpleStudioIntent({
    story: input.story,
    purpose: "advertisement",
    platforms: input.platforms,
  });
  return {
    product: base.product,
    audience: base.audience,
    location: base.location,
    purpose: "social_ad",
    tone: base.tone,
    platforms: base.platforms,
    cta: base.cta,
    format: "9:16",
    durationSeconds: 20,
  };
}

export function buildQuickAdPipelineMessage(input: {
  story: string;
  intent: QuickAdIntent;
  revisionInstruction?: string | null;
}): string {
  return buildSimpleStudioPipelineMessage({
    story: input.story,
    intent: {
      ...input.intent,
      purpose: "advertisement",
      durationSeconds: 20,
    },
    revisionInstruction: input.revisionInstruction,
  });
}

export function quickAdProjectName(intent: QuickAdIntent, story: string): string {
  return simpleStudioProjectName(
    {
      ...intent,
      purpose: "advertisement",
      durationSeconds: 20,
    },
    story,
  );
}
