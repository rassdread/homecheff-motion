import { prisma } from "@/lib/prisma";
import { appendStudioLedgerEntry } from "@/server/studio-account/studio-ledger-service";
import type { StudioLedgerActionType, StudioWalletSnapshot } from "@/types/studio-account";
import type { CreditOriginType } from "@/types/studio-billing";

type TxClient = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

function isPurchasedOrigin(origin: CreditOriginType): boolean {
  return origin === "PURCHASED";
}

export function mapWalletSnapshot(row: {
  balance: number;
  purchasedBalance: number;
  promotionalBalance: number;
  reservedBalance: number;
  lifetimePurchased: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  lifetimeRefunded: number;
  lastTransactionAt: Date | null;
}): StudioWalletSnapshot {
  return {
    balance: row.balance,
    purchasedBalance: row.purchasedBalance,
    promotionalBalance: row.promotionalBalance,
    reservedBalance: row.reservedBalance,
    availableBalance: Math.max(0, row.balance - row.reservedBalance),
    lifetimePurchased: row.lifetimePurchased,
    lifetimeGranted: row.lifetimeGranted,
    lifetimeSpent: row.lifetimeSpent,
    lifetimeRefunded: row.lifetimeRefunded,
    lastTransactionAt: row.lastTransactionAt?.toISOString() ?? null,
  };
}

export async function ensureStudioWallet(userId: string): Promise<StudioWalletSnapshot> {
  const existing = await prisma.studioWallet.findUnique({ where: { userId } });
  if (existing) {
    return mapWalletSnapshot(existing);
  }
  const created = await prisma.studioWallet.create({
    data: { userId, purchasedBalance: 0, promotionalBalance: 0 },
  });
  return mapWalletSnapshot(created);
}

function splitSpendFromBuckets(wallet: { promotionalBalance: number; purchasedBalance: number }, credits: number) {
  const fromPromotional = Math.min(wallet.promotionalBalance, credits);
  const fromPurchased = credits - fromPromotional;
  return { fromPromotional, fromPurchased };
}

export async function getWalletForUpdate(userId: string, tx: TxClient) {
  const wallet = await tx.studioWallet.findUnique({ where: { userId } });
  if (!wallet) {
    throw new Error(`Studio wallet not found for user ${userId}`);
  }
  return wallet;
}

export type GrantCreditsInput = {
  userId: string;
  credits: number;
  actionType: StudioLedgerActionType;
  service?: string;
  projectId?: string | null;
  provider?: string | null;
  creditOrigin?: CreditOriginType;
  metadataJson?: Record<string, unknown>;
  lifetimeField?: "lifetimePurchased" | "lifetimeGranted";
};

/** Grant credits via ledger — never updates balance directly without ledger. */
export async function grantStudioCredits(input: GrantCreditsInput): Promise<{
  balanceAfter: number;
  ledgerId: string;
}> {
  const origin: CreditOriginType =
    input.creditOrigin ??
    (input.lifetimeField === "lifetimePurchased" || input.actionType === "credit_purchase"
      ? "PURCHASED"
      : "MANUAL_GRANT");
  return grantStudioCreditsWithOrigin({ ...input, creditOrigin: origin });
}

export async function grantStudioCreditsWithOrigin(input: GrantCreditsInput & {
  creditOrigin: CreditOriginType;
}): Promise<{ balanceAfter: number; ledgerId: string }> {
  if (input.credits <= 0) {
    throw new Error("Grant credits must be positive.");
  }

  const purchased = isPurchasedOrigin(input.creditOrigin);

  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUpdate(input.userId, tx);
    const newBalance = wallet.balance + input.credits;
    const lifetimeField =
      input.lifetimeField ?? (purchased ? "lifetimePurchased" : "lifetimeGranted");

    await tx.studioWallet.update({
      where: { userId: input.userId },
      data: {
        balance: newBalance,
        purchasedBalance: purchased
          ? { increment: input.credits }
          : wallet.purchasedBalance,
        promotionalBalance: purchased
          ? wallet.promotionalBalance
          : { increment: input.credits },
        [lifetimeField]: { increment: input.credits },
        lastTransactionAt: new Date(),
      },
    });

    const { id } = await appendStudioLedgerEntry(
      {
        userId: input.userId,
        projectId: input.projectId,
        service: input.service ?? "billing",
        actionType: input.actionType,
        creditsDelta: input.credits,
        balanceAfter: newBalance,
        creditOrigin: input.creditOrigin,
        provider: input.provider,
        metadataJson: input.metadataJson,
      },
      tx
    );

    return { balanceAfter: newBalance, ledgerId: id };
  });
}

export type ReserveCreditsInput = {
  userId: string;
  credits: number;
  service: string;
  provider: string;
  projectId?: string | null;
  reservedCostUsd: number;
  marginEstimate: number;
  metadataJson?: Record<string, unknown>;
};

export async function reserveStudioCredits(input: ReserveCreditsInput): Promise<{
  reservationId: string;
  balanceAfter: number;
}> {
  if (input.credits <= 0) {
    throw new Error("Reserve credits must be positive.");
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUpdate(input.userId, tx);
    const available = wallet.balance - wallet.reservedBalance;
    if (available < input.credits) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const newReserved = wallet.reservedBalance + input.credits;

    await tx.studioWallet.update({
      where: { userId: input.userId },
      data: {
        reservedBalance: newReserved,
        lastTransactionAt: new Date(),
      },
    });

    const { id } = await appendStudioLedgerEntry(
      {
        userId: input.userId,
        projectId: input.projectId,
        service: input.service,
        actionType: "usage_reservation",
        creditsDelta: 0,
        balanceAfter: wallet.balance,
        provider: input.provider,
        reservedCostUsd: input.reservedCostUsd,
        marginEstimate: input.marginEstimate,
        metadataJson: {
          ...input.metadataJson,
          reservedCredits: input.credits,
        },
      },
      tx
    );

    return { reservationId: id, balanceAfter: wallet.balance };
  });
}

export type CaptureCreditsInput = {
  userId: string;
  credits: number;
  reservationId: string;
  service: string;
  provider: string;
  projectId?: string | null;
  providerCostUsd?: number;
  reservedCostUsd?: number;
  marginEstimate?: number;
  metadataJson?: Record<string, unknown>;
};

export async function captureStudioCredits(input: CaptureCreditsInput): Promise<{
  balanceAfter: number;
  ledgerId: string;
}> {
  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUpdate(input.userId, tx);
    if (wallet.reservedBalance < input.credits) {
      throw new Error("RESERVATION_MISMATCH");
    }
    if (wallet.balance < input.credits) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    const newBalance = wallet.balance - input.credits;
    const newReserved = wallet.reservedBalance - input.credits;
    const { fromPromotional, fromPurchased } = splitSpendFromBuckets(wallet, input.credits);

    await tx.studioWallet.update({
      where: { userId: input.userId },
      data: {
        balance: newBalance,
        reservedBalance: newReserved,
        promotionalBalance: wallet.promotionalBalance - fromPromotional,
        purchasedBalance: wallet.purchasedBalance - fromPurchased,
        lifetimeSpent: { increment: input.credits },
        lastTransactionAt: new Date(),
      },
    });

    const { id } = await appendStudioLedgerEntry(
      {
        userId: input.userId,
        projectId: input.projectId,
        service: input.service,
        actionType: "usage_capture",
        creditsDelta: -input.credits,
        balanceAfter: newBalance,
        creditOrigin: fromPurchased > 0 ? "PURCHASED" : "PROMOTIONAL",
        provider: input.provider,
        providerCostUsd: input.providerCostUsd,
        reservedCostUsd: input.reservedCostUsd,
        marginEstimate: input.marginEstimate,
        metadataJson: {
          ...input.metadataJson,
          reservationId: input.reservationId,
          spentFromPromotional: fromPromotional,
          spentFromPurchased: fromPurchased,
        },
      },
      tx
    );

    return { balanceAfter: newBalance, ledgerId: id };
  });
}

export type RefundReservationInput = {
  userId: string;
  credits: number;
  reservationId: string;
  service: string;
  provider: string;
  projectId?: string | null;
  failedGeneration?: boolean;
  metadataJson?: Record<string, unknown>;
};

export async function refundStudioReservation(input: RefundReservationInput): Promise<{
  balanceAfter: number;
  ledgerId: string;
}> {
  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUpdate(input.userId, tx);
    if (wallet.reservedBalance < input.credits) {
      throw new Error("RESERVATION_MISMATCH");
    }

    const newReserved = wallet.reservedBalance - input.credits;

    await tx.studioWallet.update({
      where: { userId: input.userId },
      data: {
        reservedBalance: newReserved,
        lifetimeRefunded: { increment: input.credits },
        lastTransactionAt: new Date(),
      },
    });

    const actionType = input.failedGeneration ? "failed_generation_refund" : "usage_refund";

    const { id } = await appendStudioLedgerEntry(
      {
        userId: input.userId,
        projectId: input.projectId,
        service: input.service,
        actionType,
        creditsDelta: 0,
        balanceAfter: wallet.balance,
        provider: input.provider,
        metadataJson: {
          ...input.metadataJson,
          reservationId: input.reservationId,
          refundedCredits: input.credits,
        },
      },
      tx
    );

    return { balanceAfter: wallet.balance, ledgerId: id };
  });
}

export async function adminAdjustCredits(input: {
  userId: string;
  creditsDelta: number;
  adminUserId: string;
  reason: string;
  creditOrigin?: CreditOriginType;
}): Promise<{ balanceAfter: number; ledgerId: string }> {
  if (input.creditsDelta === 0) {
    throw new Error("ZERO_DELTA_NOT_ALLOWED");
  }

  if (input.creditsDelta > 0) {
    return grantStudioCreditsWithOrigin({
      userId: input.userId,
      credits: input.creditsDelta,
      actionType: input.creditOrigin === "COMPENSATION" ? "admin_grant" : "manual_adjustment",
      creditOrigin: input.creditOrigin ?? "MANUAL_GRANT",
      service: "admin",
      metadataJson: { adminUserId: input.adminUserId, reason: input.reason },
    });
  }

  return prisma.$transaction(async (tx) => {
    const wallet = await getWalletForUpdate(input.userId, tx);
    const abs = Math.abs(input.creditsDelta);
    const newBalance = wallet.balance - abs;
    if (newBalance < 0) {
      throw new Error("NEGATIVE_BALANCE_NOT_ALLOWED");
    }
    const { fromPromotional, fromPurchased } = splitSpendFromBuckets(wallet, abs);

    await tx.studioWallet.update({
      where: { userId: input.userId },
      data: {
        balance: newBalance,
        promotionalBalance: wallet.promotionalBalance - fromPromotional,
        purchasedBalance: wallet.purchasedBalance - fromPurchased,
        lifetimeSpent: { increment: abs },
        lastTransactionAt: new Date(),
      },
    });

    const { id } = await appendStudioLedgerEntry(
      {
        userId: input.userId,
        service: "admin",
        actionType: "manual_adjustment",
        creditsDelta: input.creditsDelta,
        balanceAfter: newBalance,
        creditOrigin: input.creditOrigin ?? "MANUAL_GRANT",
        metadataJson: {
          adminUserId: input.adminUserId,
          reason: input.reason,
        },
      },
      tx
    );

    return { balanceAfter: newBalance, ledgerId: id };
  });
}
