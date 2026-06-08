import { fetchSameOriginJson, sameOriginApiPath } from "@/lib/client-api-fetch";
import type {
  CharacterIdentityImagePrefillInput,
  CharacterReferenceImageAnalysis,
  CharacterReferenceImageRole,
} from "@/types/studio-character-identity-image-prefill";
import type { CharacterIdentityPrefillResult } from "@/types/studio-character-identity-prefill";

export type CharacterIdentityImagePrefillApiResponse = CharacterIdentityPrefillResult & {
  analysis: CharacterReferenceImageAnalysis;
};

export async function analyzeCharacterReferenceImagesApi(
  body: CharacterIdentityImagePrefillInput & { locale?: "en" | "nl" }
) {
  return fetchSameOriginJson<CharacterIdentityImagePrefillApiResponse>(
    sameOriginApiPath("/api/studio/characters/analyze-reference-images"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
}

export type ImagePrefillSlot = {
  id: string;
  role: CharacterReferenceImageRole;
  previewUrl: string;
  storageKey: string;
  uploading?: boolean;
};

export const IMAGE_PREFILL_ROLE_OPTIONS: CharacterReferenceImageRole[] = [
  "primary",
  "reference",
  "closeup",
  "outfit",
  "style",
];

export const MAX_IMAGE_PREFILL_SLOTS = 5;
