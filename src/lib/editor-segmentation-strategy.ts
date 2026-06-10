import type { EditorSegmentationSource } from "@/types/homecheff-visual-editor";

export type SegmentationProviderRank = {
  provider: EditorSegmentationSource | "openai_vision" | "onnx_detector";
  qualityScore: number;
  speedScore: number;
  costScore: number;
  providesMasks: boolean;
  providesPolygons: boolean;
  providesMultiObject: boolean;
  notes: string;
  productionReady: boolean;
};

export type EditorSegmentationStrategy = {
  recommended: EditorSegmentationSource;
  fastest: EditorSegmentationSource;
  lowestCost: EditorSegmentationSource;
  bestQuality: EditorSegmentationSource;
  providers: SegmentationProviderRank[];
  productionPath: string;
};

function envSet(key: string): boolean {
  if (typeof process === "undefined") {
    return false;
  }
  return Boolean(process.env[key]?.trim());
}

export function auditEditorSegmentationProviders(): EditorSegmentationStrategy {
  const providers: SegmentationProviderRank[] = [
    {
      provider: "heuristic",
      qualityScore: 3,
      speedScore: 10,
      costScore: 10,
      providesMasks: false,
      providesPolygons: true,
      providesMultiObject: true,
      notes: "Template bboxes from vision labels — always available, no API cost",
      productionReady: true,
    },
    {
      provider: "vision_estimate",
      qualityScore: 4,
      speedScore: 9,
      costScore: 8,
      providesMasks: false,
      providesPolygons: false,
      providesMultiObject: true,
      notes: "OpenAI vision labels only — no mask/bbox geometry from API",
      productionReady: true,
    },
    {
      provider: "replicate_sam3",
      qualityScore: 8,
      speedScore: 5,
      costScore: 6,
      providesMasks: true,
      providesPolygons: true,
      providesMultiObject: true,
      notes: "Replicate SAM3 text-prompt segmentation — primary production path when REPLICATE_API_TOKEN set",
      productionReady: envSet("REPLICATE_API_TOKEN"),
    },
    {
      provider: "rembg",
      qualityScore: 7,
      speedScore: 6,
      costScore: 7,
      providesMasks: true,
      providesPolygons: true,
      providesMultiObject: false,
      notes: "Full-image alpha mask via REMBG_API_URL — fallback after Replicate",
      productionReady: envSet("REMBG_API_URL"),
    },
    {
      provider: "sam2",
      qualityScore: 9,
      speedScore: 4,
      costScore: 4,
      providesMasks: true,
      providesPolygons: true,
      providesMultiObject: true,
      notes: "Click/prompt segmentation — requires SAM2_SEGMENTATION_URL (not wired to editor yet)",
      productionReady: envSet("SAM2_SEGMENTATION_URL"),
    },
    {
      provider: "manual",
      qualityScore: 10,
      speedScore: 2,
      costScore: 10,
      providesMasks: true,
      providesPolygons: true,
      providesMultiObject: true,
      notes: "Lasso/manual outline — highest precision, user-driven",
      productionReady: true,
    },
    {
      provider: "onnx_detector",
      qualityScore: 7,
      speedScore: 7,
      costScore: 9,
      providesMasks: false,
      providesPolygons: false,
      providesMultiObject: true,
      notes: "RT-DETR/MobileNet in animation-export — bboxes only, not editor-integrated",
      productionReady: false,
    },
    {
      provider: "openai_vision",
      qualityScore: 5,
      speedScore: 5,
      costScore: 5,
      providesMasks: false,
      providesPolygons: false,
      providesMultiObject: true,
      notes: "Semantic labels + taxonomy — foundation for object-first UX, not pixel masks",
      productionReady: true,
    },
  ];

  const maskProviders = providers.filter((p) => p.providesMasks && p.productionReady);
  const bestQuality = [...maskProviders].sort((a, b) => b.qualityScore - a.qualityScore)[0];
  const fastest = [...providers].sort((a, b) => b.speedScore - a.speedScore)[0];
  const lowestCost = [...providers].sort((a, b) => b.costScore - a.costScore)[0];

  const replicateReady = envSet("REPLICATE_API_TOKEN");
  const rembgReady = envSet("REMBG_API_URL");
  const recommended: EditorSegmentationSource = replicateReady
    ? "replicate_sam3"
    : rembgReady
      ? "rembg"
      : "heuristic";

  return {
    recommended,
    fastest: fastest?.provider === "openai_vision" || fastest?.provider === "onnx_detector"
      ? "heuristic"
      : (fastest?.provider as EditorSegmentationSource) ?? "heuristic",
    lowestCost: "heuristic",
    bestQuality: bestQuality?.provider === "openai_vision" || bestQuality?.provider === "onnx_detector"
      ? "manual"
      : (bestQuality?.provider as EditorSegmentationSource) ?? "manual",
    providers,
    productionPath: replicateReady
      ? "Vision labels → Replicate SAM3 on select/click/prompt → SAM2/REMBG fallback → manual lasso"
      : rembgReady
        ? "Vision labels → heuristic bboxes → rembg on refine/remove → manual lasso fallback"
        : "Vision labels → heuristic bboxes → manual lasso for precision",
  };
}
