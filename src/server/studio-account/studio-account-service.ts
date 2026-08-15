import { ensureStudioAccount } from "@/server/studio-account/ensure-studio-account";
import { loadRecentLedger } from "@/server/studio-account/studio-ledger-service";
import { ensureStudioWallet } from "@/server/studio-account/studio-wallet-service";
import type { StudioAccountOverview } from "@/types/studio-account";

export async function loadStudioAccountOverview(
  userId: string,
  email: string
): Promise<StudioAccountOverview> {
  const account = await ensureStudioAccount(userId, email);
  const wallet = await ensureStudioWallet(userId);
  const recentLedger = await loadRecentLedger(userId, 25);

  return { account, wallet, recentLedger };
}

/** Shell/wallet bootstrap — skips ledger read (not needed for credit chips / conversion). */
export async function loadStudioAccountSummary(
  userId: string,
  email: string
): Promise<StudioAccountOverview> {
  const account = await ensureStudioAccount(userId, email);
  const wallet = await ensureStudioWallet(userId);
  return { account, wallet, recentLedger: [] };
}
