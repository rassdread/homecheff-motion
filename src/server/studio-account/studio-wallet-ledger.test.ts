import assert from "node:assert/strict";
import { describe, it } from "node:test";

/**
 * Wallet/ledger flow tests using simulated state.
 * Validates: grant → reserve → capture/refund invariants without DB.
 */

type WalletState = {
  balance: number;
  reservedBalance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  lifetimeRefunded: number;
};

type LedgerEntry = {
  actionType: string;
  creditsDelta: number;
  balanceAfter: number;
};

function available(wallet: WalletState): number {
  return Math.max(0, wallet.balance - wallet.reservedBalance);
}

function grant(wallet: WalletState, ledger: LedgerEntry[], credits: number): void {
  wallet.balance += credits;
  wallet.lifetimeGranted += credits;
  ledger.push({ actionType: "subscription_grant", creditsDelta: credits, balanceAfter: wallet.balance });
}

function reserve(wallet: WalletState, ledger: LedgerEntry[], credits: number): void {
  if (available(wallet) < credits) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  wallet.reservedBalance += credits;
  ledger.push({ actionType: "usage_reservation", creditsDelta: 0, balanceAfter: wallet.balance });
}

function capture(wallet: WalletState, ledger: LedgerEntry[], credits: number): void {
  if (wallet.reservedBalance < credits || wallet.balance < credits) {
    throw new Error("RESERVATION_MISMATCH");
  }
  wallet.balance -= credits;
  wallet.reservedBalance -= credits;
  wallet.lifetimeSpent += credits;
  ledger.push({ actionType: "usage_capture", creditsDelta: -credits, balanceAfter: wallet.balance });
}

function refundReservation(wallet: WalletState, ledger: LedgerEntry[], credits: number): void {
  if (wallet.reservedBalance < credits) {
    throw new Error("RESERVATION_MISMATCH");
  }
  wallet.reservedBalance -= credits;
  wallet.lifetimeRefunded += credits;
  ledger.push({ actionType: "failed_generation_refund", creditsDelta: 0, balanceAfter: wallet.balance });
}

function ledgerNetBalance(ledger: LedgerEntry[]): number {
  return ledger
    .filter((e) => e.actionType !== "usage_reservation" && e.actionType !== "usage_refund" && e.actionType !== "failed_generation_refund")
    .reduce((sum, e) => sum + e.creditsDelta, 0);
}

describe("wallet ledger simulation", () => {
  it("subscription grant adds credits", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    grant(wallet, ledger, 3000);
    assert.equal(wallet.balance, 3000);
    assert.equal(ledgerNetBalance(ledger), 3000);
  });

  it("credit pack purchase adds credits", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    wallet.balance += 500;
    ledger.push({ actionType: "credit_purchase", creditsDelta: 500, balanceAfter: 500 });
    assert.equal(wallet.balance, 500);
    assert.equal(ledgerNetBalance(ledger), 500);
  });

  it("reserve capture flow deducts credits", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    grant(wallet, ledger, 100);
    reserve(wallet, ledger, 1);
    assert.equal(wallet.balance, 100);
    assert.equal(wallet.reservedBalance, 1);
    capture(wallet, ledger, 1);
    assert.equal(wallet.balance, 99);
    assert.equal(wallet.reservedBalance, 0);
    assert.equal(ledgerNetBalance(ledger), 99);
  });

  it("failed generation refunds reservation without balance change", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    grant(wallet, ledger, 200);
    reserve(wallet, ledger, 180);
    refundReservation(wallet, ledger, 180);
    assert.equal(wallet.balance, 200);
    assert.equal(wallet.reservedBalance, 0);
    assert.equal(wallet.lifetimeRefunded, 180);
  });

  it("ledger balance matches wallet after grants and captures", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    grant(wallet, ledger, 3000);
    reserve(wallet, ledger, 1);
    capture(wallet, ledger, 1);
    reserve(wallet, ledger, 180);
    refundReservation(wallet, ledger, 180);
    assert.equal(ledgerNetBalance(ledger), wallet.balance);
  });

  it("no provider call before authorization — reserve fails without balance", () => {
    const wallet: WalletState = { balance: 0, reservedBalance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lifetimeRefunded: 0 };
    const ledger: LedgerEntry[] = [];
    let providerCalled = false;
    try {
      reserve(wallet, ledger, 1);
      providerCalled = true;
    } catch (error) {
      assert.equal((error as Error).message, "INSUFFICIENT_CREDITS");
    }
    assert.equal(providerCalled, false);
    assert.equal(ledger.length, 0);
  });
});
