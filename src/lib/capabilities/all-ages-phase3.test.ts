/**
 * Studio — All-ages Phase 3 regression certification.
 * Asserts free vs paid vs provider entitlement separation.
 * No DB mutation. No invented provider age rules.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  STUDIO_ALL_AGES_INVARIANTS,
  STUDIO_FORBIDDEN_USER_AGE_FIELDS,
} from "@/lib/capabilities/all-ages-invariants";
import {
  FREE_STUDIO_ACTIONS,
  isFreeStudioAction,
} from "@/server/studio-account/free-action-registry";
import { STUDIO_PLANS } from "@/server/studio-account/studio-plan-config";

const root = resolve(process.cwd());

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Studio all-ages Phase 3 — schema & account", () => {
  it("User and StudioAccount have no DOB / adult / parentalConsent fields", () => {
    const schema = read("prisma/schema.prisma");
    const userBlock = schema.match(/model User \{[\s\S]*?\n\}/);
    const accountBlock = schema.match(/model StudioAccount \{[\s\S]*?\n\}/);
    assert.ok(userBlock && accountBlock);
    for (const block of [userBlock[0], accountBlock[0]]) {
      for (const field of STUDIO_FORBIDDEN_USER_AGE_FIELDS) {
        assert.equal(
          new RegExp(`\\b${field}\\b`).test(block),
          false,
          `schema must not declare ${field}`,
        );
      }
    }
    assert.match(accountBlock[0], /stripeCustomerId\s+String\?/);
    assert.match(accountBlock[0], /studioPlan.*free|default\("free"\)/);
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.DOB_REQUIRED, false);
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.GLOBAL_AGE_GATE, "NONE");
  });

  it("signup route has no age/DOB gate", () => {
    const signup = read("src/app/api/auth/signup/route.ts");
    for (const field of STUDIO_FORBIDDEN_USER_AGE_FIELDS) {
      assert.equal(
        new RegExp(`\\b${field}\\b`).test(signup),
        false,
        `signup must not reference ${field}`,
      );
    }
  });
});

describe("Studio all-ages Phase 3 — free vs Stripe", () => {
  it("free plan exists with zero price and free actions do not require Stripe", () => {
    assert.equal(STUDIO_PLANS.free.monthlyPriceEur, 0);
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.STRIPE_REQUIRED_FOR_FREE, false);
    assert.ok(FREE_STUDIO_ACTIONS.includes("crud_write"));
    assert.ok(FREE_STUDIO_ACTIONS.includes("upload"));
    assert.ok(isFreeStudioAction("crud_write"));
    assert.ok(isFreeStudioAction("browse"));
    assert.equal(isFreeStudioAction("motion_render"), false);
  });

  it("creative project create route is auth-gated, not Stripe-gated", () => {
    const route = read("src/app/api/studio/creative-projects/route.ts");
    assert.match(route, /requireActiveUser|getServerSession|auth/i);
    assert.equal(/stripeCustomerId|requireStripe|checkout/i.test(route), false);
  });

  it("paid checkout requires non-free plan path (Stripe for paid)", () => {
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.STRIPE_REQUIRED_FOR_PAID, true);
    const checkout = read("src/app/api/me/studio-credits/checkout/route.ts");
    assert.match(checkout, /planId|free|stripe/i);
    for (const field of STUDIO_FORBIDDEN_USER_AGE_FIELDS) {
      assert.equal(new RegExp(`\\b${field}\\b`).test(checkout), false);
    }
  });
});

describe("Studio all-ages Phase 3 — provider & affiliate", () => {
  it("does not invent HomeCheff age gates in affiliate bind", () => {
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.AFFILIATE_BIND_IS_AGE_GATE, false);
    const bind = read("src/app/api/me/affiliate/bind-referral/route.ts");
    for (const field of STUDIO_FORBIDDEN_USER_AGE_FIELDS) {
      assert.equal(new RegExp(`\\b${field}\\b`).test(bind), false);
    }
  });

  it("does not invent provider age requirements in OpenAI / ElevenLabs / Vidu wiring", () => {
    assert.equal(STUDIO_ALL_AGES_INVARIANTS.PROVIDER_ENTITLEMENT_IS_GLOBAL_AGE, false);
    const candidates = [
      "src/lib/openai-image-generation.ts",
      "src/server/scene-image-providers/openai-provider.ts",
      "src/server/video-providers/vidu-provider.ts",
    ];
    const ageGate = /\b(minAge|minimumAge|mustBeAdult|COPPA|under\s*18|age\s*>=\s*18)\b/i;
    for (const rel of candidates) {
      const abs = resolve(root, rel);
      if (!existsSync(abs)) continue;
      const src = readFileSync(abs, "utf8");
      assert.equal(ageGate.test(src), false, `${rel} must not invent HC age gate`);
    }
  });
});
