import {
  parseContinuityStrengthField,
  parseOptionalWorldProfileId,
  trimMemoryText,
} from "@/lib/studio-memory-validation";

export type StudioPropMemoryInput = {
  appearanceMemory?: string;
  brandingRules?: string;
  continuityNotes?: string;
  continuityStrength?: string;
  worldProfileId?: string | null;
};

export function parsePropMemoryFields(raw: StudioPropMemoryInput) {
  return {
    appearanceMemory: trimMemoryText(raw.appearanceMemory),
    brandingRules: trimMemoryText(raw.brandingRules),
    continuityNotes: trimMemoryText(raw.continuityNotes),
    continuityStrength: parseContinuityStrengthField(raw.continuityStrength),
    worldProfileId: parseOptionalWorldProfileId(raw.worldProfileId),
  };
}
