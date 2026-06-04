import {
  parseContinuityStrengthField,
  parseOptionalWorldProfileId,
  trimMemoryKeywords,
  trimMemoryText,
} from "@/lib/studio-memory-validation";

export type StudioLocationMemoryInput = {
  worldMemory?: string;
  visualIdentity?: string;
  environmentKeywords?: string;
  continuityNotes?: string;
  continuityStrength?: string;
  worldProfileId?: string | null;
};

export function parseLocationMemoryFields(raw: StudioLocationMemoryInput) {
  return {
    worldMemory: trimMemoryText(raw.worldMemory),
    visualIdentity: trimMemoryText(raw.visualIdentity),
    environmentKeywords: trimMemoryKeywords(raw.environmentKeywords),
    continuityNotes: trimMemoryText(raw.continuityNotes),
    continuityStrength: parseContinuityStrengthField(raw.continuityStrength),
    worldProfileId: parseOptionalWorldProfileId(raw.worldProfileId),
  };
}
