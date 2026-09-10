import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { loadRecentLedger } from "@/server/studio-account/studio-ledger-service";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";
import type { StudioAccountOverview } from "@/types/studio-account";
import type { CentralHcWalletSnapshot } from "@/types/studio-account";
import { prisma } from "@/lib/prisma";
import {
  getCentralHcWallet,
  isHcCentralAdapterReady,
} from "@/server/studio-account/hc-central-adapter";

/**
 * Canonical personal HC for Studio display — Growth/central adapter only.
 * Never raw-SQL HcWallet against the Studio database (table does not exist there).
 */
async function loadCentralHcSummaryForStudioUser(userId: string): Promise<CentralHcWalletSnapshot> {
  const identity = await prisma.user.findUnique({
    where: { id: userId },
    select: { centralUserId: true },
  });

  const centralUserId = identity?.centralUserId?.trim() || null;
  if (!centralUserId) {
    return {
      identityResolved: false,
      walletResolved: false,
      availableHc: 0,
      reservedHc: 0,
      walletStatus: null,
    };
  }

  if (!isHcCentralAdapterReady()) {
    return {
      identityResolved: true,
      walletResolved: false,
      availableHc: 0,
      reservedHc: 0,
      walletStatus: "ADAPTER_NOT_READY",
    };
  }

  try {
    const wallet = await getCentralHcWallet(centralUserId);
    return {
      identityResolved: true,
      walletResolved: true,
      availableHc: Number(wallet.availableHc ?? 0),
      reservedHc: Number(wallet.reservedHc ?? 0),
      walletStatus: "ACTIVE",
    };
  } catch {
    // Explicit unavailable — UI must not treat this as a genuine zero balance.
    return {
      identityResolved: true,
      walletResolved: false,
      availableHc: 0,
      reservedHc: 0,
      walletStatus: "UNAVAILABLE",
    };
  }
}

export async function loadStudioAccountOverview(
  userId: string,
  email: string
): Promise<StudioAccountOverview> {
  const account = await ensureStudioAccount(userId, email);
  const wallet = await ensureStudioWallet(userId);
  const recentLedger = await loadRecentLedger(userId, 25);
  const centralHc = await loadCentralHcSummaryForStudioUser(userId);

  return { account, wallet, recentLedger, centralHc };
}

/** Shell/wallet bootstrap — skips ledger read (not needed for credit chips / conversion). */
export async function loadStudioAccountSummary(
  userId: string,
  email: string
): Promise<StudioAccountOverview> {
  const account = await ensureStudioAccount(userId, email);
  const wallet = await ensureStudioWallet(userId);
  const centralHc = await loadCentralHcSummaryForStudioUser(userId);
  return { account, wallet, recentLedger: [], centralHc };
}
