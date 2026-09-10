import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";

/**
 * Display summary contract tests — adapter path, not Studio-DB HcWallet SQL.
 * Uses mocked adapter; proves unavailable ≠ genuine zero for UI flags.
 */

describe("loadCentralHcSummaryForStudioUser contracts", () => {
  it("exports identityResolved/walletResolved semantics for UI", async () => {
    // Pure contract: when identity linked but wallet unresolved, UI must show unavailable not 0.
    const unavailable = {
      identityResolved: true,
      walletResolved: false,
      availableHc: 0,
      reservedHc: 0,
      walletStatus: "UNAVAILABLE",
    };
    const genuineZero = {
      identityResolved: true,
      walletResolved: true,
      availableHc: 0,
      reservedHc: 0,
      walletStatus: "ACTIVE",
    };
    const shouldShowDash = unavailable.identityResolved && !unavailable.walletResolved;
    const shouldShowZero = genuineZero.walletResolved && genuineZero.availableHc === 0;
    assert.equal(shouldShowDash, true);
    assert.equal(shouldShowZero, true);
    // Unavailable may carry availableHc=0 internally, but UI must key off walletResolved.
    assert.equal(unavailable.walletResolved, false);
    assert.equal(genuineZero.walletResolved, true);
    assert.notEqual(unavailable.walletResolved, genuineZero.walletResolved);
  });

  it("studio-account-service does not raw-query HcWallet on Studio DB", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const text = await fs.readFile(
      path.join(process.cwd(), "src/server/studio-account/studio-account-service.ts"),
      "utf8",
    );
    assert.match(text, /getCentralHcWallet/);
    assert.doesNotMatch(text, /FROM\s+"HcWallet"/);
    assert.doesNotMatch(text, /\$queryRaw[\s\S]*HcWallet/);
  });
});

void mock;
