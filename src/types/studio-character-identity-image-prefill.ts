import type { CharacterIdentityFormValues } from "@/lib/studio-character-identity-fields";

/** Raw vision extraction JSON from reference image analysis. */
export type CharacterReferenceImageAnalysis = {
  name?: string;
  role?: string;
  characterType?: string;
  visualStyle?: string;
  shapeLanguage?: string;
  energy?: string;
  personality?: string;
  clothing?: string;
  accessories?: string;
  colorTheme?: string;
  colorNotes?: string;
  appearanceMemory?: string;
  forbiddenElements?: string;
  usageContext?: string;
  voiceDirection?: string;
  confidence?: number;
  safetyNotes?: string[];
};

export type CharacterReferenceImageRole =
  | "primary"
  | "reference"
  | "closeup"
  | "outfit"
  | "style";

export type CharacterIdentityImagePrefillInput = {
  imageUrls: string[];
  imageRoles?: CharacterReferenceImageRole[];
  userDescription?: string;
  intendedUsage?: string;
};

export type CharacterIdentityImagePrefillResult = {
  prefill: Partial<CharacterIdentityFormValues>;
  voiceDirectionHint: string;
  confidence: number;
  missingFields: string[];
  safetyNotes: string[];
};
