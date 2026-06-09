export const PRODUCTION_OUTPUT_PROFILES = [
  "animation_ready",
  "web_ready",
  "social_ready",
  "presentation_ready",
  "print_ready",
  "merchandise_ready",
  "packaging_ready",
] as const;

export type ProductionOutputProfileId = (typeof PRODUCTION_OUTPUT_PROFILES)[number];

export type ProductionOutputSpec = {
  id: ProductionOutputProfileId;
  labelKey: string;
  descriptionKey: string;
  recommendedWidth: number;
  recommendedHeight: number;
  safeMarginPercent: number;
  formats: Array<"png" | "jpg" | "webp" | "svg" | "pdf">;
  exportNotesKey: string;
};

export const PRODUCTION_OUTPUT_SPECS: Record<ProductionOutputProfileId, ProductionOutputSpec> = {
  animation_ready: {
    id: "animation_ready",
    labelKey: "editor.outputProfile.animationReady",
    descriptionKey: "editor.outputProfile.animationReadyDesc",
    recommendedWidth: 1024,
    recommendedHeight: 1024,
    safeMarginPercent: 5,
    formats: ["png", "webp"],
    exportNotesKey: "editor.outputProfile.animationReadyNotes",
  },
  web_ready: {
    id: "web_ready",
    labelKey: "editor.outputProfile.webReady",
    descriptionKey: "editor.outputProfile.webReadyDesc",
    recommendedWidth: 1600,
    recommendedHeight: 900,
    safeMarginPercent: 4,
    formats: ["webp", "jpg", "png"],
    exportNotesKey: "editor.outputProfile.webReadyNotes",
  },
  social_ready: {
    id: "social_ready",
    labelKey: "editor.outputProfile.socialReady",
    descriptionKey: "editor.outputProfile.socialReadyDesc",
    recommendedWidth: 1080,
    recommendedHeight: 1920,
    safeMarginPercent: 8,
    formats: ["jpg", "png", "webp"],
    exportNotesKey: "editor.outputProfile.socialReadyNotes",
  },
  presentation_ready: {
    id: "presentation_ready",
    labelKey: "editor.outputProfile.presentationReady",
    descriptionKey: "editor.outputProfile.presentationReadyDesc",
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    safeMarginPercent: 6,
    formats: ["png", "pdf"],
    exportNotesKey: "editor.outputProfile.presentationReadyNotes",
  },
  print_ready: {
    id: "print_ready",
    labelKey: "editor.outputProfile.printReady",
    descriptionKey: "editor.outputProfile.printReadyDesc",
    recommendedWidth: 4096,
    recommendedHeight: 4096,
    safeMarginPercent: 10,
    formats: ["png", "pdf"],
    exportNotesKey: "editor.outputProfile.printReadyNotes",
  },
  merchandise_ready: {
    id: "merchandise_ready",
    labelKey: "editor.outputProfile.merchandiseReady",
    descriptionKey: "editor.outputProfile.merchandiseReadyDesc",
    recommendedWidth: 3000,
    recommendedHeight: 3000,
    safeMarginPercent: 12,
    formats: ["png", "pdf", "svg"],
    exportNotesKey: "editor.outputProfile.merchandiseReadyNotes",
  },
  packaging_ready: {
    id: "packaging_ready",
    labelKey: "editor.outputProfile.packagingReady",
    descriptionKey: "editor.outputProfile.packagingReadyDesc",
    recommendedWidth: 3500,
    recommendedHeight: 2500,
    safeMarginPercent: 12,
    formats: ["png", "pdf", "svg"],
    exportNotesKey: "editor.outputProfile.packagingReadyNotes",
  },
};

export function resolveProductionOutputSpec(profile: ProductionOutputProfileId): ProductionOutputSpec {
  return PRODUCTION_OUTPUT_SPECS[profile];
}

export function listSupportedFormats(profile: ProductionOutputProfileId): string[] {
  return [...PRODUCTION_OUTPUT_SPECS[profile].formats];
}

export function formatEpsLimitationNote(): string {
  return "EPS vector export is not supported in-app. Use SVG or PDF and convert in Illustrator/InDesign for print workflows.";
}
