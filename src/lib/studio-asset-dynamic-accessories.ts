import type { AssetWizardDraft } from "@/lib/studio-asset-wizard-draft";
import type { AssetSemanticRecord } from "@/types/studio-asset-semantic-record";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { DynamicAccessoryItem } from "@/types/studio-asset-generation-workbench";

const ACCESSORY_TOKEN_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bglobe\b/i, label: "globe" },
  { pattern: /\btie\b/i, label: "tie" },
  { pattern: /\bcoat\b|jacket/i, label: "coat" },
  { pattern: /\bhat\b|cap\b|chef hat/i, label: "hat" },
  { pattern: /\bglasses\b|spectacles/i, label: "glasses" },
  { pattern: /\bbackpack\b|bag\b/i, label: "backpack" },
  { pattern: /\btool\b|wrench|hammer|spoon|knife/i, label: "tools" },
  { pattern: /\bbadge\b|emblem/i, label: "badge" },
  { pattern: /\bapron\b/i, label: "apron" },
  { pattern: /\bglove\b/i, label: "gloves" },
  { pattern: /\bshoe\b|boot/i, label: "footwear" },
  { pattern: /\bscarf\b/i, label: "scarf" },
  { pattern: /\bplant\b|flower|leaf/i, label: "plant" },
  { pattern: /\blogo\b/i, label: "logo" },
];

const HOMECHEFF_BRAND_ONLY = new Set(["globe", "chef hat", "chef attributes", "garden attributes"]);

function isHomeCheffBrand(vision?: AssetVisionAnalysis | null, record?: AssetSemanticRecord | null): boolean {
  const brand = `${vision?.brandIdentity ?? ""} ${vision?.assetFamily ?? ""} ${record?.brandIdentity ?? ""} ${record?.assetFamily ?? ""}`.toLowerCase();
  return /homecheff|home cheff/.test(brand);
}

function tokenizeAccessoryText(text: string): string[] {
  const found = new Set<string>();
  for (const { pattern, label } of ACCESSORY_TOKEN_PATTERNS) {
    if (pattern.test(text)) {
      found.add(label);
    }
  }
  return [...found];
}

export function extractDynamicAccessoriesFromVision(params: {
  vision: AssetVisionAnalysis;
  semanticRecord?: AssetSemanticRecord | null;
}): DynamicAccessoryItem[] {
  const { vision, semanticRecord } = params;
  const homeCheff = isHomeCheffBrand(vision, semanticRecord);
  const corpus = [
    ...vision.keyFeatures,
    vision.identityFingerprint.accessoryPattern ?? "",
    ...vision.suggestedChange,
    ...vision.suggestedPreserve,
    semanticRecord?.appearanceMemory ?? "",
    ...(semanticRecord?.keyFeatures ?? []),
  ].join(" ");

  const labels = tokenizeAccessoryText(corpus);
  const items: DynamicAccessoryItem[] = [];

  for (const label of labels) {
    if (!homeCheff && (label === "globe" || label === "plant")) {
      continue;
    }
    const isMarker = vision.identityFingerprint.identityShapeMarkers?.some((m) =>
      m.toLowerCase().includes(label)
    );
    items.push({
      id: label.replace(/\s+/g, "_"),
      label,
      source: "vision",
      action: isMarker ? "identity_marker" : "keep",
      confidence: isMarker ? 0.9 : 0.75,
    });
  }

  if (items.length === 0 && vision.keyFeatures.length > 0) {
    for (const feature of vision.keyFeatures.slice(0, 6)) {
      const trimmed = feature.trim();
      if (!trimmed || trimmed.length < 3) {
        continue;
      }
      if (!homeCheff && HOMECHEFF_BRAND_ONLY.has(trimmed.toLowerCase())) {
        continue;
      }
      items.push({
        id: trimmed.toLowerCase().replace(/\s+/g, "_").slice(0, 40),
        label: trimmed,
        source: "keyFeatures",
        action: "keep",
        confidence: 0.6,
      });
    }
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function seedDynamicAccessoriesFromDraft(draft: AssetWizardDraft): DynamicAccessoryItem[] {
  if (!draft.sourceVisionAnalysis) {
    return draft.dynamicAccessories;
  }
  if (draft.dynamicAccessories.length > 0) {
    return draft.dynamicAccessories;
  }
  return extractDynamicAccessoriesFromVision({ vision: draft.sourceVisionAnalysis });
}

export function buildDynamicAccessoriesPromptBlock(items: DynamicAccessoryItem[]): string {
  if (items.length === 0) {
    return "";
  }
  const lines = items.map((item) => {
    switch (item.action) {
      case "remove":
        return `Remove ${item.label}.`;
      case "replace":
        return `Replace ${item.label} with neutral alternative.`;
      case "identity_marker":
        return `Preserve ${item.label} as identity marker.`;
      default:
        return `Keep ${item.label}.`;
    }
  });
  return `Accessory instructions: ${lines.join(" ")}`;
}

export function shouldShowDynamicAccessories(draft: AssetWizardDraft): boolean {
  return Boolean(draft.sourceVisionAnalysis) && seedDynamicAccessoriesFromDraft(draft).length > 0;
}
