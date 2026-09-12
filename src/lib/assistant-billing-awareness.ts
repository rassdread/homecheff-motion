import { resolveRegistryActionCreditCost } from "@/lib/studio-billing-sync";
import { buildAssistantBillingSummary } from "@/lib/billing-display-labels";
import { resolveCanonicalSpendableBalance } from "@/lib/studio-canonical-balance";
import type { AssistantStudioContext } from "@/types/assistant-studio-brain";
import type { AssistantBillingPreview } from "@/types/studio-billing";
import { resolveActionCreditCost } from "@/server/studio-account/studio-pricing-rule-service";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";
import type { StudioActionType } from "@/server/studio-account/studio-action-cost-registry";
import { prisma } from "@/lib/prisma";
import {
  getCentralHcWallet,
  isHcCentralAdapterReady,
} from "@/server/studio-account/hc-central-adapter";

function isNl(locale?: string): boolean {
  return !locale || locale.startsWith("nl");
}

async function resolveCanonicalAvailableCredits(userId?: string, fallbackStudio?: number): Promise<number> {
  if (!userId) {
    return Math.max(0, fallbackStudio ?? 0);
  }
  const wallet = await ensureStudioWallet(userId);
  const studioAvailable = Math.max(0, wallet.availableBalance);
  if (!isHcCentralAdapterReady()) {
    return studioAvailable;
  }
  const userRow = await prisma.user.findUnique({
    where: { id: userId },
    select: { centralUserId: true },
  });
  const centralUserId = userRow?.centralUserId?.trim() || null;
  if (!centralUserId) {
    return studioAvailable;
  }
  try {
    const central = await getCentralHcWallet(centralUserId);
    const canonical = resolveCanonicalSpendableBalance({
      studioAvailable,
      studioReserved: wallet.reservedBalance,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: Number(central.availableHc ?? 0),
        reservedHc: Number(central.reservedHc ?? 0),
      },
    });
    return canonical.spendable ?? studioAvailable;
  } catch {
    return studioAvailable;
  }
}

export async function buildAssistantBillingPreview(input: {
  userId?: string;
  actionType: StudioActionType | string;
  planId?: string;
  studio?: AssistantStudioContext | null;
  locale?: string;
  overrideCredits?: number;
}): Promise<AssistantBillingPreview> {
  const available = await resolveCanonicalAvailableCredits(
    input.userId,
    input.studio
      ? Math.max(0, (input.studio as { walletBalance?: number }).walletBalance ?? 0)
      : 0
  );

  const resolved = await resolveActionCreditCost({
    actionType: input.actionType,
    planId: input.planId,
    overrideCredits: input.overrideCredits,
  });

  const estimatedCredits = resolved?.creditCost ?? input.overrideCredits ?? 0;
  const balanceAfter = Math.max(0, available - estimatedCredits);
  const nl = isNl(input.locale);

  const savingsFromReuse: AssistantBillingPreview["savingsFromReuse"] = [];

  if (input.studio) {
    const character = input.studio.characters[0];
    if (character) {
      const without = await resolveActionCreditCost({
        actionType: input.actionType,
        planId: input.planId,
      });
      const withReuse = await resolveActionCreditCost({
        actionType: input.actionType,
        planId: input.planId,
        overrideCredits: without
          ? Math.max(1, Math.round(without.creditCost * 0.65))
          : undefined,
      });
      if (without && withReuse && without.creditCost > withReuse.creditCost) {
        savingsFromReuse.push({
          label: nl
            ? `Hergebruik personage (${character.assetName})`
            : `Reuse character (${character.assetName})`,
          creditsSaved: without.creditCost - withReuse.creditCost,
        });
      }
    }

    const stadium = input.studio.assets.find((row) =>
      `${row.assetName} ${row.promptSummary ?? ""}`.toLowerCase().includes("stadion")
    );
    if (stadium && estimatedCredits > 6) {
      savingsFromReuse.push({
        label: nl ? `Hergebruik stadion (${stadium.assetName})` : `Reuse stadium (${stadium.assetName})`,
        creditsSaved: 6,
      });
    }
  }

  const savingsText =
    savingsFromReuse.length > 0
      ? nl
        ? ` Tip: ${savingsFromReuse.map((s) => `${s.label} → bespaar ${s.creditsSaved} credits`).join("; ")}.`
        : ` Tip: ${savingsFromReuse.map((s) => `${s.label} → save ${s.creditsSaved} credits`).join("; ")}.`
      : "";

  const summaries = buildAssistantBillingSummary({
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsText,
    locale: input.locale,
  });

  return {
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsFromReuse,
    summaryNl: summaries.summaryNl,
    summaryEn: summaries.summaryEn,
  };
}

/** Sync preview for client orchestrator — uses registry + plan discount (same engine as billing). */
export function buildSyncAssistantBillingPreview(input: {
  actionType: StudioActionType | string;
  planId?: string;
  availableCredits: number;
  studio?: AssistantStudioContext | null;
  locale?: string;
  overrideCredits?: number;
  pricingCatalog?: import("@/types/studio-pricing-catalog").StudioPricingCatalogPublicEntry[];
}): AssistantBillingPreview {
  const resolved = resolveRegistryActionCreditCost({
    actionType: input.actionType,
    planId: input.planId,
    overrideCredits: input.overrideCredits,
    pricingCatalog: input.pricingCatalog,
  });
  const estimatedCredits = resolved?.creditCost ?? input.overrideCredits ?? 0;
  const available = Math.max(0, input.availableCredits);
  const balanceAfter = Math.max(0, available - estimatedCredits);
  const nl = isNl(input.locale);
  const savingsFromReuse: AssistantBillingPreview["savingsFromReuse"] = [];

  if (input.studio?.characters[0]) {
    savingsFromReuse.push({
      label: nl
        ? `Hergebruik personage (${input.studio.characters[0].assetName})`
        : `Reuse character (${input.studio.characters[0].assetName})`,
      creditsSaved: 8,
    });
  }
  const stadium = input.studio?.assets.find((row) =>
    `${row.assetName}`.toLowerCase().includes("stadion")
  );
  if (stadium) {
    savingsFromReuse.push({
      label: nl ? `Hergebruik stadion (${stadium.assetName})` : `Reuse stadium (${stadium.assetName})`,
      creditsSaved: 6,
    });
  }

  const savingsText =
    savingsFromReuse.length > 0
      ? nl
        ? ` Tip: ${savingsFromReuse.map((s) => `${s.label}: bespaar ${s.creditsSaved} credits`).join(". ")}.`
        : ` Tip: ${savingsFromReuse.map((s) => `${s.label}: save ${s.creditsSaved} credits`).join(". ")}.`
      : "";

  const summaries = buildAssistantBillingSummary({
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsText,
    locale: input.locale,
  });

  return {
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsFromReuse,
    summaryNl: summaries.summaryNl,
    summaryEn: summaries.summaryEn,
  };
}

export async function buildMotionAssistantBillingPreview(input: {
  userId: string;
  planId?: string;
  studio?: AssistantStudioContext | null;
  estimatedCredits?: number;
  locale?: string;
}): Promise<AssistantBillingPreview> {
  const wallet = await ensureStudioWallet(input.userId);
  const resolved = await resolveActionCreditCost({
    actionType: "motion_render",
    planId: input.planId,
    overrideCredits: input.estimatedCredits,
  });
  const estimatedCredits = resolved?.creditCost ?? input.estimatedCredits ?? 450;
  const available = await resolveCanonicalAvailableCredits(input.userId, wallet.availableBalance);
  const balanceAfter = Math.max(0, available - estimatedCredits);
  const nl = isNl(input.locale);

  const savingsFromReuse: AssistantBillingPreview["savingsFromReuse"] = [];
  if (input.studio?.characters[0]) {
    savingsFromReuse.push({
      label: nl
        ? `Hergebruik personage (${input.studio.characters[0].assetName})`
        : `Reuse character (${input.studio.characters[0].assetName})`,
      creditsSaved: 8,
    });
  }
  const stadium = input.studio?.assets.find((row) =>
    `${row.assetName}`.toLowerCase().includes("stadion")
  );
  if (stadium) {
    savingsFromReuse.push({
      label: nl ? `Hergebruik stadion (${stadium.assetName})` : `Reuse stadium (${stadium.assetName})`,
      creditsSaved: 6,
    });
  }

  const savingsText =
    savingsFromReuse.length > 0
      ? nl
        ? ` Tip: ${savingsFromReuse.map((s) => `${s.label}: bespaar ${s.creditsSaved} credits`).join(". ")}.`
        : ` Tip: ${savingsFromReuse.map((s) => `${s.label}: save ${s.creditsSaved} credits`).join(". ")}.`
      : "";

  const summaries = buildAssistantBillingSummary({
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsText,
    locale: input.locale,
  });

  return {
    estimatedCredits,
    availableCredits: available,
    balanceAfter,
    savingsFromReuse,
    summaryNl: summaries.summaryNl,
    summaryEn: summaries.summaryEn,
  };
}
