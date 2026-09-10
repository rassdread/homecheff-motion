import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";
import { getStudioHcFlags, isStudioCentralHcSpendEnabled } from "@/lib/hc-studio-flags";
import {
  resolveStudioCentralUserId,
  StudioHcDisabledError,
  StudioHcIdentityUnresolvedError,
  assertStudioCentralHcSpendEnabled,
} from "@/server/studio-account/hc-central-adapter";
import { decideMotionSettlement } from "@/server/animation-jobs/motion-credit-settlement";
import { classifyMotionHold } from "@/server/studio-account/hc-reconciliation-report";
import { creditDenialMessage } from "@/server/studio-account/studio-credit-authorization";
import { STUDIO_CREDIT_PACKS } from "@/server/studio-account/studio-credit-packs";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const ROOT = resolve(process.cwd());

function readRepo(rel: string): string {
  return readFileSync(resolve(ROOT, rel), "utf8");
}

describe("Studio HC billing foundation (dormant)", () => {
  it("flags default OFF so Studio cannot spend central HC", () => {
    const flags = getStudioHcFlags();
    assert.equal(flags.HC_CREDITS_ENABLED, false);
    assert.equal(flags.HC_STUDIO_SPEND_ENABLED, false);
    assert.equal(flags.HC_SUBSCRIPTION_GRANTS_ENABLED, false);
    assert.equal(flags.HC_PUBLIC_BALANCE_UI_ENABLED, false);
    assert.equal(flags.HC_MARKETPLACE_REDEMPTION_ENABLED, false);
    assert.equal(isStudioCentralHcSpendEnabled(), false);
    assert.throws(() => assertStudioCentralHcSpendEnabled(), StudioHcDisabledError);
  });

  it("missing centralUserId is a controlled error", () => {
    assert.throws(() => resolveStudioCentralUserId(null), StudioHcIdentityUnresolvedError);
    assert.throws(() => resolveStudioCentralUserId("  "), StudioHcIdentityUnresolvedError);
    assert.equal(resolveStudioCentralUserId("central-1"), "central-1");
  });

  it("Instant Premium create-and-generate holds until Vidu success", () => {
    const src = readRepo("src/app/api/instant-premium/create-and-generate/route.ts");
    assert.match(src, /attachMotionCreditHold/);
    assert.match(src, /startProjectJobs/);
    assert.doesNotMatch(
      src,
      /await startProjectJobs\([\s\S]{0,180}captureStudioActionReservation/,
    );
  });

  it("animation project create holds instead of capturing", () => {
    const src = readRepo("src/app/api/animations/projects/route.ts");
    assert.match(src, /attachMotionCreditHold/);
    assert.match(src, /studioWalletHeld: true/);
    assert.doesNotMatch(src, /studioWalletCaptured: true/);
    assert.doesNotMatch(src, /captureStudioActionReservation/);
  });

  it("pollProjectJobs settles the hold after provider terminal state", () => {
    const src = readRepo("src/server/animation-jobs/service.ts");
    assert.match(src, /settleMotionCreditHold/);
  });

  it("settlement: all completed → capture; all failed → release; mixed → pending", () => {
    assert.equal(decideMotionSettlement([{ status: "completed" }, { status: "completed" }]), "captured");
    assert.equal(decideMotionSettlement([{ status: "failed" }, { status: "failed" }]), "released");
    assert.equal(decideMotionSettlement([{ status: "completed" }, { status: "failed" }]), "pending");
    assert.equal(decideMotionSettlement([{ status: "generating" }]), "pending");
    assert.equal(decideMotionSettlement([]), "pending");
  });

  it("reconciliation classifies pending vs final holds without mutating", () => {
    assert.equal(
      classifyMotionHold({
        chargeFinalized: false,
        status: "generating",
        idempotencyKey: "motion-credit-hold:proj-1",
      }).code,
      "HOLD_PENDING",
    );
    assert.equal(
      classifyMotionHold({
        chargeFinalized: true,
        status: "succeeded",
        idempotencyKey: "motion-credit-hold:proj-1",
      }).code,
      "HOLD_FINAL",
    );
  });

  it("legacy packs are untouched and 1:1 HC conversion would be cheaper than face", () => {
    assert.equal(STUDIO_CREDIT_PACKS.length, 4);
    for (const pack of STUDIO_CREDIT_PACKS) {
      const faceIfHc = pack.credits * 0.01;
      assert.ok(faceIfHc > pack.priceEur, `${pack.id} 1:1 would create arbitrage`);
    }
  });

  it("billing errors exist in NL, EN, and fallback", () => {
    const keys = [
      "hc.studio.spendDisabled",
      "hc.studio.identityUnresolved",
      "hc.studio.reservationHeld",
      "hc.studio.captureAfterSuccess",
      "hc.studio.hcpSeparate",
      "billing.credit.insufficient",
    ] as const;
    for (const key of keys) {
      assert.ok(nl[key]?.trim());
      assert.ok(en[key]?.trim());
      assert.notEqual(nl[key], en[key]);
    }
    assert.match(creditDenialMessage("insufficient_credits", "nl"), /credits/i);
    assert.match(creditDenialMessage("insufficient_credits", "en"), /Insufficient/);
    assert.match(creditDenialMessage("unknown", "en"), /not allowed/i);
  });
});
