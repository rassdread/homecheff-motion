/**
 * Portable location identity for future Motion / Scene Composer integration.
 * No Vidu wiring in Studio V3.
 */

export type LocationSnapshot = {
  id: string;
  name: string;
  category: string;
  description: string;
  referenceImageUrl: string;
};
