/**
 * Canonical Studio spendable balance — single read contract for all UX surfaces.
 *
 * When the Studio user is linked to central HomeCheff identity and the Growth
 * HcWallet is resolved, spendable = central availableHc (primary customer currency).
 * Otherwise fall back to legacy StudioWallet availableBalance.
 *
 * Unavailable (identity linked, wallet not loaded) must never be shown as 0.
 */

import type { CentralHcWalletSnapshot, StudioWalletSnapshot } from "@/types/studio-account";

export type CanonicalBalanceSource =
  | "central_hc"
  | "legacy_studio_wallet"
  | "unavailable";

export type CanonicalSpendableBalance = {
  /** Spendable amount, or null when wallet is temporarily unavailable. */
  spendable: number | null;
  reserved: number;
  unit: "HC" | "credits";
  source: CanonicalBalanceSource;
  /** Legacy StudioWallet available (internal / secondary). */
  legacyStudioAvailable: number;
  identityResolved: boolean;
  walletResolved: boolean;
};

export type CanonicalBalanceInput = {
  studioAvailable: number;
  studioReserved?: number;
  centralHc?: Pick<
    CentralHcWalletSnapshot,
    "identityResolved" | "walletResolved" | "availableHc" | "reservedHc"
  > | null;
};

/** Pure resolver — safe for client and server. */
export function resolveCanonicalSpendableBalance(
  input: CanonicalBalanceInput
): CanonicalSpendableBalance {
  const legacyStudioAvailable = Math.max(0, Math.floor(input.studioAvailable));
  const studioReserved = Math.max(0, Math.floor(input.studioReserved ?? 0));
  const central = input.centralHc ?? null;

  if (central?.identityResolved && !central.walletResolved) {
    return {
      spendable: null,
      reserved: Math.max(0, Math.floor(central.reservedHc ?? 0)),
      unit: "HC",
      source: "unavailable",
      legacyStudioAvailable,
      identityResolved: true,
      walletResolved: false,
    };
  }

  if (central?.identityResolved && central.walletResolved) {
    return {
      spendable: Math.max(0, Math.floor(Number(central.availableHc ?? 0))),
      reserved: Math.max(0, Math.floor(Number(central.reservedHc ?? 0))),
      unit: "HC",
      source: "central_hc",
      legacyStudioAvailable,
      identityResolved: true,
      walletResolved: true,
    };
  }

  return {
    spendable: legacyStudioAvailable,
    reserved: studioReserved,
    unit: "credits",
    source: "legacy_studio_wallet",
    legacyStudioAvailable,
    identityResolved: Boolean(central?.identityResolved),
    walletResolved: Boolean(central?.walletResolved),
  };
}

export function resolveCanonicalFromOverview(input: {
  wallet: Pick<StudioWalletSnapshot, "availableBalance" | "reservedBalance">;
  centralHc?: CentralHcWalletSnapshot | null;
}): CanonicalSpendableBalance {
  return resolveCanonicalSpendableBalance({
    studioAvailable: input.wallet.availableBalance,
    studioReserved: input.wallet.reservedBalance,
    centralHc: input.centralHc ?? null,
  });
}

/** Numeric spendable for gates / low-credit tiers; unavailable → treat as unknown (no false zero). */
export function canonicalSpendableOrNull(
  balance: CanonicalSpendableBalance
): number | null {
  return balance.spendable;
}

/** For low-balance UI: only warn when we have a resolved numeric spendable. */
export function canonicalAmountForLowBalanceWarning(
  balance: CanonicalSpendableBalance
): number | null {
  if (balance.source === "unavailable") return null;
  return balance.spendable;
}
