/**
 * Portable character identity for future Motion / Scene Composer integration.
 * No Vidu wiring in Studio V2.
 */

import type { CanonicalCharacterIdentity } from "@/types/studio-character-canonical-references";

export type CharacterSnapshot = {
  id: string;
  name: string;
  role: string;
  description: string;
  personality: string;
  referenceImageUrl: string;
  /** Canonical visual identity for Motion handoff (when full row available). */
  canonicalIdentity?: CanonicalCharacterIdentity;
};
