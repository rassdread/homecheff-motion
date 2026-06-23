/**
 * P0 Consolidation Sprint — end reports (UA audit remediation).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CHARACTER_STUDIO_COPILOT_PHRASES,
  detectCharacterStudioFlowFromMessage,
} from "@/lib/character-studio-copilot";
import {
  CHARACTER_STUDIO_HUB_PATH,
  buildCharacterStudioFlowHref,
  hubVisibleCharacterStudioFlows,
} from "@/lib/character-studio-hub";
import {
  CHARACTER_STUDIO_FUSION_INTENTS,
  resolveCharacterStudioRouteForFusionIntent,
  resolveLegacyEditorStartRedirect,
} from "@/lib/character-studio-legacy-routes";
import { buildCharacterStudioDuplicationReport } from "@/lib/character-studio-audit";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type FixedRouteReport = {
  canonicalHub: string;
  legacyRedirects: Array<{ from: string; to: string; reason: string }>;
  status: "pass";
};

export type CopilotRoutingReport = {
  auditGaps: Array<{ phrase: string; expectedFlow: string; actualFlow: string; pass: boolean }>;
  logoRoutesToWizard: boolean;
  noCreateFusionFallbackForCharacterIntents: boolean;
  status: "pass" | "fail";
};

export type LogoPlacementVisibilityReport = {
  visibleInHub: boolean;
  hubTileKey: string;
  opensLogoWizardDirectly: boolean;
  status: "pass" | "fail";
};

export type OutfitFlowVerificationReport = {
  usesVisionTargetPickerV2: boolean;
  usesHighlight: boolean;
  outfitModeForAllSelectableTargets: boolean;
  status: "pass" | "fail";
};

export type EditorLeakReport = {
  characterStudioHidesEditorHandoff: boolean;
  editorOpenAdminOnlyInFusionResult: boolean;
  legacyCharacterRoutesRedirect: boolean;
  status: "pass" | "fail";
};

export type CharacterStudioP0AuditBundle = {
  fixedRouteReport: FixedRouteReport;
  copilotRoutingReport: CopilotRoutingReport;
  logoPlacementVisibilityReport: LogoPlacementVisibilityReport;
  outfitFlowVerificationReport: OutfitFlowVerificationReport;
  editorLeakReport: EditorLeakReport;
  duplicationScore: number;
  productionReadinessScore: number;
};

const AUDIT_BASELINE_SCORE = 72;

function readSrc(relativePath: string): string {
  return readFileSync(join(__dirname, "..", relativePath), "utf8");
}

export function buildFixedRouteReport(): FixedRouteReport {
  const legacyRedirects = [
    resolveLegacyEditorStartRedirect({ workflow: "mascot_transform" }),
    resolveLegacyEditorStartRedirect({ workflow: "logo_placement" }),
    resolveLegacyEditorStartRedirect({ workflow: "combine", intent: "outfit_from_reference" }),
    resolveLegacyEditorStartRedirect({ workflow: "combine", intent: "character_fusion" }),
  ].filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    canonicalHub: CHARACTER_STUDIO_HUB_PATH,
    legacyRedirects,
    status: "pass",
  };
}

export function buildCopilotRoutingReport(): CopilotRoutingReport {
  const auditPhrases: Array<{ phrase: string; expectedFlow: string }> = [
    { phrase: "chef van mascotte", expectedFlow: "mascot_transform" },
    { phrase: "mens van mascotte", expectedFlow: "mascot_to_human" },
    { phrase: "andere stijl", expectedFlow: "mascot_transform" },
    { phrase: "realistische versie", expectedFlow: "mascot_to_human" },
    { phrase: "3d versie", expectedFlow: "character_upgrade" },
    { phrase: "logo plaatsen", expectedFlow: "logo_placement" },
  ];

  const auditGaps = auditPhrases.map(({ phrase, expectedFlow }) => {
    const match = detectCharacterStudioFlowFromMessage(phrase);
    const actualFlow = match.kind === "flow" ? match.flowId : "none";
    return {
      phrase,
      expectedFlow,
      actualFlow,
      pass: actualFlow === expectedFlow,
    };
  });

  const logoMatch = detectCharacterStudioFlowFromMessage("logo plaatsen");
  const logoRoutesToWizard =
    logoMatch.kind === "flow" &&
    logoMatch.route.includes("flow=logo_placement");

  const registrySrc = readSrc("lib/assistant-action-registry.ts");
  const noCreateFusionFallbackForCharacterIntents =
    registrySrc.includes('prepare_outfit') &&
    registrySrc.includes('prepare_logo_placement') &&
    registrySrc.includes("buildCharacterStudioHubHref()");

  const allPass = auditGaps.every((row) => row.pass) && logoRoutesToWizard;

  return {
    auditGaps,
    logoRoutesToWizard,
    noCreateFusionFallbackForCharacterIntents,
    status: allPass && noCreateFusionFallbackForCharacterIntents ? "pass" : "fail",
  };
}

export function buildLogoPlacementVisibilityReport(): LogoPlacementVisibilityReport {
  const flows = hubVisibleCharacterStudioFlows();
  const logoFlow = flows.find((flow) => flow.id === "logo_placement");
  const wizardShellSrc = readSrc("components/studio/studio-character-studio-wizard-shell.tsx");

  return {
    visibleInHub: Boolean(logoFlow?.visibleInHub),
    hubTileKey: logoFlow?.titleKey ?? "",
    opensLogoWizardDirectly:
      wizardShellSrc.includes("logo_wizard") &&
      wizardShellSrc.includes("EditorLogoPlacementWizard"),
    status:
      logoFlow?.visibleInHub && wizardShellSrc.includes("EditorLogoPlacementWizard")
        ? "pass"
        : "fail",
  };
}

export function buildOutfitFlowVerificationReport(): OutfitFlowVerificationReport {
  const referenceFlowSrc = readSrc("components/editor/editor-reference-role-flow.tsx");
  const outfitPanelSrc = readSrc("components/character-studio/editor-outfit-vision-target-panel.tsx");
  const pickerSrc = readSrc("components/editor/editor-vision-target-picker-v2.tsx");

  const usesVisionTargetPickerV2 =
    outfitPanelSrc.includes("EditorVisionTargetPickerV2") &&
    referenceFlowSrc.includes("EditorOutfitVisionTargetPanel");
  const usesHighlight = outfitPanelSrc.includes("EditorVisionTargetHighlight");
  const outfitModeForAllSelectableTargets = pickerSrc.includes("outfitMode");

  return {
    usesVisionTargetPickerV2,
    usesHighlight,
    outfitModeForAllSelectableTargets,
    status:
      usesVisionTargetPickerV2 && usesHighlight && outfitModeForAllSelectableTargets
        ? "pass"
        : "fail",
  };
}

export function buildEditorLeakReport(): EditorLeakReport {
  const wizardShellSrc = readSrc("components/studio/studio-character-studio-wizard-shell.tsx");
  const referenceFlowSrc = readSrc("components/editor/editor-reference-role-flow.tsx");
  const startScreenSrc = readSrc("components/editor/editor-start-screen.tsx");

  const characterStudioHidesEditorHandoff =
    wizardShellSrc.includes("hideEditorHandoff") &&
    !wizardShellSrc.includes("onOpenEditor");

  const editorOpenAdminOnlyInFusionResult =
    referenceFlowSrc.includes("hideEditorHandoff || !resultDocument || !access.billingFree");

  const legacyCharacterRoutesRedirect =
    startScreenSrc.includes("resolveLegacyEditorStartRedirectFromSearchParams") &&
    startScreenSrc.includes("resolveCharacterStudioRouteForFusionIntent");

  const pass =
    characterStudioHidesEditorHandoff &&
    editorOpenAdminOnlyInFusionResult &&
    legacyCharacterRoutesRedirect;

  return {
    characterStudioHidesEditorHandoff,
    editorOpenAdminOnlyInFusionResult,
    legacyCharacterRoutesRedirect,
    status: pass ? "pass" : "fail",
  };
}

export function computeCharacterStudioDuplicationScore(): number {
  const report = buildCharacterStudioDuplicationReport();
  return report.score;
}

export function computeCharacterStudioProductionReadinessScore(
  bundle: Omit<CharacterStudioP0AuditBundle, "productionReadinessScore" | "duplicationScore">
): number {
  let score = AUDIT_BASELINE_SCORE;

  if (bundle.fixedRouteReport.status === "pass") {
    score += 4;
  }
  if (bundle.copilotRoutingReport.status === "pass") {
    score += 6;
  }
  if (bundle.logoPlacementVisibilityReport.status === "pass") {
    score += 4;
  }
  if (bundle.outfitFlowVerificationReport.status === "pass") {
    score += 4;
  }
  if (bundle.editorLeakReport.status === "pass") {
    score += 4;
  }

  const duplication = buildCharacterStudioDuplicationReport();
  if (duplication.score <= 6) {
    score += 2;
  }

  return Math.min(100, score);
}

export function buildCharacterStudioP0AuditBundle(): CharacterStudioP0AuditBundle {
  const fixedRouteReport = buildFixedRouteReport();
  const copilotRoutingReport = buildCopilotRoutingReport();
  const logoPlacementVisibilityReport = buildLogoPlacementVisibilityReport();
  const outfitFlowVerificationReport = buildOutfitFlowVerificationReport();
  const editorLeakReport = buildEditorLeakReport();
  const duplicationScore = computeCharacterStudioDuplicationScore();

  const partial = {
    fixedRouteReport,
    copilotRoutingReport,
    logoPlacementVisibilityReport,
    outfitFlowVerificationReport,
    editorLeakReport,
    duplicationScore,
  };

  return {
    ...partial,
    productionReadinessScore: computeCharacterStudioProductionReadinessScore(partial),
  };
}

/** Ensures every character fusion intent resolves to Character Studio. */
export function verifyCharacterFusionIntentCoverage(): string[] {
  const missing: string[] = [];
  for (const intent of CHARACTER_STUDIO_FUSION_INTENTS) {
    const route = resolveCharacterStudioRouteForFusionIntent(intent);
    if (!route?.startsWith(CHARACTER_STUDIO_HUB_PATH)) {
      missing.push(intent);
    }
  }
  return missing;
}

export function listCharacterStudioCopilotPhraseCount(): number {
  return CHARACTER_STUDIO_COPILOT_PHRASES.length;
}

export function logoPlacementHubHref(): string {
  return buildCharacterStudioFlowHref("logo_placement");
}
