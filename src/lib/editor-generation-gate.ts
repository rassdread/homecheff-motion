import {
  TIER_ALLOWS_BULK_SEQUENCES,
  TIER_ALLOWS_MULTI_GENERATION,
  TIER_ALLOWS_PREMIUM_UPSCALE,
} from "@/lib/editor-generation-access-config";
import { estimateEditorGenerationCost } from "@/lib/editor-generation-cost";
import type {
  EditorGenerationAccountingRecord,
  EditorGenerationWorkflow,
  EditorUserAccessSnapshot,
  EstimateEditorGenerationCostOptions,
  GenerationAccessDecision,
  GenerationAccessPath,
  GenerationCostProfile,
} from "@/types/editor-generation-access";

export function resolveEditorUserAccess(input: {
  role?: string;
  credits?: number;
  tier?: EditorUserAccessSnapshot["tier"];
  billingFree?: boolean;
}): EditorUserAccessSnapshot {
  if (input.billingFree || input.role === "admin") {
    return {
      tier: "premium",
      credits: input.credits ?? 9999,
      role: input.role,
      billingFree: true,
    };
  }
  if (input.role === "power") {
    return {
      tier: input.tier ?? "plus",
      credits: input.credits ?? 30,
      role: input.role,
    };
  }
  return {
    tier: input.tier ?? "free",
    credits: input.credits ?? 3,
    role: input.role ?? "user",
  };
}

export function checkGenerationAccess(input: {
  user: EditorUserAccessSnapshot;
  workflow: EditorGenerationWorkflow;
  options?: EstimateEditorGenerationCostOptions;
  preferAd?: boolean;
  useCredits?: boolean;
}): GenerationAccessDecision {
  const cost = estimateEditorGenerationCost(input.workflow, input.options);
  const { user } = input;

  if (user.billingFree) {
    return allowedDecision(cost, "free", "editor.generation.disclosure.free");
  }

  if (cost.premiumRequired && user.tier === "free" && !input.useCredits) {
    if (user.credits >= cost.creditCost) {
      return allowedDecision(cost, "credits", "editor.generation.disclosure.credits", {
        count: cost.generationCount,
        credits: cost.creditCost,
      });
    }
    return blockedDecision(cost, "premium_required", "editor.generation.disclosure.premiumRequired", {
      count: cost.generationCount,
      credits: cost.creditCost,
    });
  }

  if (cost.subscriptionRequired && user.tier === "free" && !TIER_ALLOWS_MULTI_GENERATION[user.tier]) {
    if (user.credits >= cost.creditCost && input.useCredits) {
      return allowedDecision(cost, "credits", "editor.generation.disclosure.credits", {
        count: cost.generationCount,
        credits: cost.creditCost,
      });
    }
    return blockedDecision(cost, "subscription_required", "editor.generation.disclosure.subscriptionRequired", {
      count: cost.generationCount,
      credits: cost.creditCost,
    });
  }

  if (
    input.options?.upscaleMode === "maximum_detail" &&
    !TIER_ALLOWS_PREMIUM_UPSCALE[user.tier] &&
    !input.useCredits
  ) {
    return blockedDecision(cost, "premium_required", "editor.generation.disclosure.premiumUpscale");
  }

  if (
    input.options?.outputMode === "sequence" &&
    (input.options.stepCount ?? 1) >= 6 &&
    !TIER_ALLOWS_BULK_SEQUENCES[user.tier] &&
    user.credits < cost.creditCost
  ) {
    return blockedDecision(cost, "premium_required", "editor.generation.disclosure.premiumSequence", {
      count: cost.generationCount,
    });
  }

  if (input.preferAd && cost.adEligible) {
    return allowedDecision(cost, "ad", "editor.generation.disclosure.adEligible", {
      count: cost.generationCount,
    });
  }

  if (user.credits >= cost.creditCost) {
    return allowedDecision(cost, "credits", "editor.generation.disclosure.credits", {
      count: cost.generationCount,
      credits: cost.creditCost,
    });
  }

  if (cost.adEligible) {
    return allowedDecision(cost, "ad", "editor.generation.disclosure.adOrCredits", {
      count: cost.generationCount,
      credits: cost.creditCost,
    });
  }

  if (user.tier === "premium" || user.tier === "plus") {
    return allowedDecision(cost, "subscription", "editor.generation.disclosure.included", {
      count: cost.generationCount,
    });
  }

  return blockedDecision(cost, "insufficient_credits", "editor.generation.disclosure.insufficientCredits", {
    count: cost.generationCount,
    credits: cost.creditCost,
  });
}

function allowedDecision(
  cost: GenerationCostProfile,
  accessPath: GenerationAccessPath,
  disclosureKey: string,
  disclosureParams?: Record<string, string | number>
): GenerationAccessDecision {
  return {
    allowed: true,
    cost,
    accessPath,
    disclosureKey,
    disclosureParams,
  };
}

function blockedDecision(
  cost: GenerationCostProfile,
  blockedReason: GenerationAccessDecision["blockedReason"],
  disclosureKey: string,
  disclosureParams?: Record<string, string | number>
): GenerationAccessDecision {
  return {
    allowed: false,
    blockedReason,
    cost,
    disclosureKey,
    disclosureParams,
  };
}

export function calculateSuccessfulCreditDeduction(input: {
  creditCost: number;
  generationCount: number;
  successfulOutputs: number;
  failedOutputs: number;
}): number {
  if (input.generationCount <= 0) {
    return 0;
  }
  const perOutput = input.creditCost / input.generationCount;
  return Math.round(perOutput * input.successfulOutputs);
}

export function deductCreditsAfterSuccess(
  user: EditorUserAccessSnapshot,
  creditsToDeduct: number
): EditorUserAccessSnapshot {
  if (user.billingFree || creditsToDeduct <= 0) {
    return user;
  }
  return {
    ...user,
    credits: Math.max(0, user.credits - creditsToDeduct),
  };
}

const ACCOUNTING_STORAGE_KEY = "hc_editor_generation_accounting";

export function recordGenerationAccounting(
  record: EditorGenerationAccountingRecord
): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const existing = JSON.parse(window.localStorage.getItem(ACCOUNTING_STORAGE_KEY) ?? "[]") as EditorGenerationAccountingRecord[];
    existing.unshift(record);
    window.localStorage.setItem(ACCOUNTING_STORAGE_KEY, JSON.stringify(existing.slice(0, 200)));
  } catch {
    // ignore storage failures
  }
}

export function listGenerationAccountingRecords(): EditorGenerationAccountingRecord[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    return JSON.parse(window.localStorage.getItem(ACCOUNTING_STORAGE_KEY) ?? "[]") as EditorGenerationAccountingRecord[];
  } catch {
    return [];
  }
}

export function createAccountingRecord(input: {
  workflow: EditorGenerationWorkflow;
  cost: GenerationCostProfile;
  successfulOutputs: number;
  failedOutputs: number;
  accessPath: GenerationAccessPath;
  user: EditorUserAccessSnapshot;
  adWatched?: boolean;
}): EditorGenerationAccountingRecord {
  const creditsCharged = calculateSuccessfulCreditDeduction({
    creditCost: input.cost.creditCost,
    generationCount: input.cost.generationCount,
    successfulOutputs: input.successfulOutputs,
    failedOutputs: input.failedOutputs,
  });

  return {
    id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workflow: input.workflow,
    generationCount: input.cost.generationCount,
    successfulOutputs: input.successfulOutputs,
    failedOutputs: input.failedOutputs,
    providerCostEstimate: input.cost.estimatedProviderCostUsd,
    creditsCharged,
    adWatched: input.adWatched ?? false,
    subscriptionTier: input.user.tier,
    accessPath: input.accessPath,
    createdAt: new Date().toISOString(),
  };
}

export function persistUserCredits(user: EditorUserAccessSnapshot): void {
  if (typeof window === "undefined" || user.billingFree) {
    return;
  }
  try {
    window.localStorage.setItem("hc_editor_user_credits", String(user.credits));
  } catch {
    // ignore
  }
}

export function loadPersistedUserCredits(): number | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  try {
    const raw = window.localStorage.getItem("hc_editor_user_credits");
    if (!raw) {
      return undefined;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
