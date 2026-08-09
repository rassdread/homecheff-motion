/**
 * S.6G — Deep-link builders for Experience Packs (path + query only).
 */

import type { StudioProductExperienceId } from "@/lib/studio-creative-director/product-experience-ids";
import type { StudioProductMode } from "@/lib/studio-creative-director/types";

export function buildExperiencePackHref(input: {
  experienceId: StudioProductExperienceId;
  mode?: StudioProductMode;
  entryFan?: string;
  intent?: string;
  photoIntent?: string;
  preset?: string;
  flow?: string;
}): string {
  const mode = (input.mode ?? "QUICK").toLowerCase();
  const params = new URLSearchParams({
    experience: input.experienceId,
    mode,
  });
  if (input.entryFan) params.set("entryFan", input.entryFan);
  if (input.intent) params.set("intent", input.intent);
  if (input.photoIntent) params.set("photoIntent", input.photoIntent);
  if (input.preset) params.set("preset", input.preset);
  if (input.flow) params.set("flow", input.flow);
  return `/studio/experience?${params.toString()}`;
}

/** P0 pack chooser cards for Quick Mode. */
export const P0_EXPERIENCE_PACKS: StudioProductExperienceId[] = [
  "BUSINESS_RESTAURANT",
  "BUSINESS_HOMECHEFF",
  "PEOPLE_LINKEDIN_PHOTO",
  "CREATIVE_ANIMATION",
  "IDENTITY_OUTFIT",
];
