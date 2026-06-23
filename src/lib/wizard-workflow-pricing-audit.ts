/**
 * Wizard Pricing Architecture Audit — reuse/extend map (Phase 11).
 */

export type WizardPricingAuditAction = "reuse" | "extend" | "replace" | "remove" | "leave";

export type WizardPricingArchitectureEntry = {
  system: string;
  path: string;
  action: WizardPricingAuditAction;
  note: string;
};

export const WIZARD_PRICING_ARCHITECTURE_AUDIT: WizardPricingArchitectureEntry[] = [
  {
    system: "Fusion workflow render credits",
    path: "src/lib/editor-fusion-workflow-credits.ts",
    action: "reuse",
    note: "Canonical per-intent render pricing — resolveWizardWorkflowPrice delegates here.",
  },
  {
    system: "Premium vision analysis credits",
    path: "src/lib/editor-premium-vision-credits.ts",
    action: "reuse",
    note: "5 credits per uncached reference — folded into total price, not shown separately to users.",
  },
  {
    system: "Unified wizard pricing resolver",
    path: "src/lib/wizard-workflow-pricing.ts",
    action: "extend",
    note: "Single resolveWizardWorkflowPrice() for all wizard-first flows.",
  },
  {
    system: "Wizard credit pre-flight",
    path: "src/lib/wizard-credit-reservation.ts",
    action: "extend",
    note: "Client validation before pipeline; server reserve/capture/refund unchanged.",
  },
  {
    system: "Studio credit authorization",
    path: "src/server/studio-account/studio-credit-authorization.ts",
    action: "reuse",
    note: "Wallet reserve/capture/refund — no second credit system.",
  },
  {
    system: "Premium vision billing",
    path: "src/server/editor/editor-premium-vision-billing.ts",
    action: "reuse",
    note: "Analysis billing at render time after user clicks Make.",
  },
  {
    system: "Fusion render credit gate",
    path: "src/app/api/editor/fusion/render/route.ts",
    action: "reuse",
    note: "Render billing via withStudioCreditGate + overrideCredits from workflow table.",
  },
  {
    system: "Fusion wizard render pipeline",
    path: "src/lib/editor-fusion-wizard-render.ts",
    action: "extend",
    note: "Pre-flight total credit check added; analysis then render sequence unchanged.",
  },
  {
    system: "Legacy fusion wizard credits panel",
    path: "src/components/editor/editor-fusion-wizard-credits-panel.tsx",
    action: "replace",
    note: "Replaced by EditorWizardWorkflowPricingPanel in wizard-first flows.",
  },
  {
    system: "Editor generation cost panel",
    path: "src/components/editor/editor-generation-cost-panel.tsx",
    action: "leave",
    note: "Non-wizard editor flows only; hidden in wizardSummary plan panel.",
  },
  {
    system: "LocalStorage editor credits",
    path: "src/lib/editor-generation-gate.ts",
    action: "leave",
    note: "Legacy demo gate — wizards still use useEditorUserAccess until wallet hook migration.",
  },
  {
    system: "Character Studio wizard shell",
    path: "src/components/studio/studio-character-studio-wizard-shell.tsx",
    action: "reuse",
    note: "Routes to wizards that now share unified pricing UI.",
  },
];

export function buildWizardPricingArchitectureAuditReport(): {
  entries: WizardPricingArchitectureEntry[];
  reuseCount: number;
  extendCount: number;
  replaceCount: number;
} {
  const entries = WIZARD_PRICING_ARCHITECTURE_AUDIT;
  return {
    entries,
    reuseCount: entries.filter((e) => e.action === "reuse").length,
    extendCount: entries.filter((e) => e.action === "extend").length,
    replaceCount: entries.filter((e) => e.action === "replace").length,
  };
}
