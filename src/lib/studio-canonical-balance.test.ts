import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalAmountForLowBalanceWarning,
  resolveCanonicalFromOverview,
  resolveCanonicalSpendableBalance,
} from "@/lib/studio-canonical-balance";

describe("resolveCanonicalSpendableBalance", () => {
  it("prefers central HC when identity + wallet are resolved (Steve case)", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      studioReserved: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 4154,
        reservedHc: 0,
      },
    });
    assert.equal(balance.source, "central_hc");
    assert.equal(balance.unit, "HC");
    assert.equal(balance.spendable, 4154);
    assert.equal(balance.legacyStudioAvailable, 0);
    assert.equal(canonicalAmountForLowBalanceWarning(balance), 4154);
  });

  it("does not treat unavailable wallet as zero", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: false,
        availableHc: 0,
        reservedHc: 0,
      },
    });
    assert.equal(balance.source, "unavailable");
    assert.equal(balance.spendable, null);
    assert.equal(canonicalAmountForLowBalanceWarning(balance), null);
  });

  it("falls back to legacy StudioWallet when not linked", () => {
    const balance = resolveCanonicalSpendableBalance({
      studioAvailable: 120,
      studioReserved: 10,
      centralHc: {
        identityResolved: false,
        walletResolved: false,
        availableHc: 0,
        reservedHc: 0,
      },
    });
    assert.equal(balance.source, "legacy_studio_wallet");
    assert.equal(balance.unit, "credits");
    assert.equal(balance.spendable, 120);
  });

  it("resolveCanonicalFromOverview matches overview fields", () => {
    const balance = resolveCanonicalFromOverview({
      wallet: {
        availableBalance: 0,
        reservedBalance: 0,
      },
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 4154,
        reservedHc: 25,
        walletStatus: "ACTIVE",
      },
    });
    assert.equal(balance.spendable, 4154);
    assert.equal(balance.reserved, 25);
  });

  it("low-balance warning uses canonical spendable so HC>threshold suppresses banner", () => {
    const steve = resolveCanonicalSpendableBalance({
      studioAvailable: 0,
      centralHc: {
        identityResolved: true,
        walletResolved: true,
        availableHc: 4154,
        reservedHc: 0,
      },
    });
    const amount = canonicalAmountForLowBalanceWarning(steve);
    assert.ok(amount != null && amount > 100);
  });
});
