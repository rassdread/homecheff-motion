import { detectBodyVisibilityFromVision } from "@/lib/studio-asset-animation-readiness";
import { mapVisionJsonToAnalysis } from "@/lib/studio-asset-vision-analysis";
import type { AssetVisionAnalysis, AssetVisionObjectType } from "@/types/studio-asset-vision-analysis";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

function labelsFromDetections(detections: ObjectDetection[]): string[] {
  return detections.map((d) => d.label.toLowerCase());
}

function inferObjectType(labels: string[], fileName?: string): AssetVisionObjectType {
  const haystack = `${labels.join(" ")} ${fileName ?? ""}`.toLowerCase();
  if (/mascot|globe.?man|brand character/.test(haystack)) {
    return "mascot";
  }
  if (/\blogo\b|emblem|brand mark/.test(haystack)) {
    return "logo";
  }
  if (/product|packaging|box|bottle|package/.test(haystack)) {
    return "product";
  }
  if (labels.some((l) => l === "person" || l.includes("face"))) {
    return "human";
  }
  if (labels.some((l) => /cat|dog|bird|horse|bear/.test(l))) {
    return "animal";
  }
  return "character";
}

/** Build provisional vision analysis from RT-DETR detections — no premium API cost. */
export function buildProvisionalVisionFromDetections(input: {
  detections: ObjectDetection[];
  fileName?: string;
  width?: number;
  height?: number;
}): AssetVisionAnalysis {
  const labels = labelsFromDetections(input.detections);
  const objectType = inferObjectType(labels, input.fileName);
  const hasPerson = labels.some((l) => l === "person" || l.includes("face"));
  const hasSportsGear = labels.some((l) => /sports ball|skateboard|tennis/.test(l));
  const hasProduct = labels.some((l) =>
    /bottle|cup|bowl|laptop|cell phone|book|vase|cake|pizza|sandwich/.test(l)
  );
  const portrait =
    input.width && input.height ? input.height >= input.width * 1.05 : true;
  const fullBodyHint =
    hasPerson && !portrait
      ? "full figure visible"
      : hasPerson
        ? "portrait upper body"
        : objectType === "product"
          ? "product hero shot"
          : "subject centered";

  const vision = mapVisionJsonToAnalysis(
    {
      objectType: objectType === "human" ? "Human" : objectType,
      visualStyle: hasPerson ? (portrait ? "Photo portrait" : "Photo full body") : "Product or brand reference",
      keyFeatures: [
        ...labels.slice(0, 6).map((l) => l.replace(/_/g, " ")),
        ...(hasSportsGear ? ["sports context"] : []),
      ],
      suggestedPreserve: hasPerson
        ? ["face", "hair", "clothing", "skin tone", "body proportions"]
        : objectType === "mascot"
          ? ["mascot design", "brand colors", "silhouette"]
          : objectType === "logo" || objectType === "product"
            ? ["brand colors", "logo shape", "product form"]
            : ["visual identity"],
      environmentHints: portrait ? "portrait framing" : "wide framing",
      faceStructure: hasPerson ? "detected face region" : undefined,
      proportions: portrait ? "portrait" : "full body",
      silhouette: fullBodyHint,
      confidence: input.detections.length > 0 ? 0.62 : 0.35,
    },
    { sourceName: input.fileName ?? "upload" }
  );

  return vision;
}

export function countFacesFromDetections(detections: ObjectDetection[]): number {
  const personCount = detections.filter((d) => d.label.toLowerCase() === "person" && d.confidence >= 0.35).length;
  return Math.max(personCount, detections.some((d) => /face/.test(d.label.toLowerCase())) ? 1 : 0);
}

export function bodyVisibilityFromVision(vision: AssetVisionAnalysis | null): ReturnType<typeof detectBodyVisibilityFromVision> {
  if (!vision) {
    return "unknown";
  }
  return detectBodyVisibilityFromVision(vision);
}
