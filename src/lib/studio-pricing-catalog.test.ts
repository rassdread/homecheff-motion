import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildAssistantPricingCatalogReply,
  isAssistantPricingQuestion,
  resolvePricingQuestionActionType,
} from "@/lib/assistant-pricing-catalog";
import { resolveRegistryActionCreditCost } from "@/lib/studio-billing-sync";
import { STUDIO_ACTION_TYPES, STUDIO_ACTION_COST_REGISTRY } from "@/server/studio-account/studio-action-cost-registry";
import { PRICING_CATALOG_ACTION_META } from "@/lib/studio-pricing-catalog-meta";
import type { StudioPricingCatalogPublicEntry } from "@/types/studio-pricing-catalog";

const ROOT = process.cwd();

function samplePublicCatalog(): StudioPricingCatalogPublicEntry[] {
  return [
    {
      actionType: "motion_render",
      category: "video_motion",
      displayName: "Motion render",
      description: "Render a video clip.",
      creditCost: 475,
      sortOrder: 800,
      isFree: false,
    },
    {
      actionType: "character_generation",
      category: "characters",
      displayName: "Character generation",
      description: "Create a character.",
      creditCost: 20,
      sortOrder: 200,
      isFree: false,
    },
  ];
}

describe("studio pricing catalog", () => {
  it("Prisma StudioPricingRule has catalog fields", () => {
    const schema = readFileSync(join(ROOT, "prisma/schema.prisma"), "utf8");
    assert.match(schema, /model StudioPricingRule/);
    assert.match(schema, /visibleInCatalog/);
    assert.match(schema, /displayNameNl/);
    assert.match(schema, /category/);
  });

  it("admin pricing list covers all registry actions", () => {
    for (const actionType of STUDIO_ACTION_TYPES) {
      assert.ok(PRICING_CATALOG_ACTION_META[actionType], `missing meta for ${actionType}`);
    }
    assert.equal(Object.keys(PRICING_CATALOG_ACTION_META).length, STUDIO_ACTION_TYPES.length);
  });

  it("admin and public pricing API routes exist", () => {
    const admin = readFileSync(
      join(ROOT, "src/app/api/admin/billing/pricing/route.ts"),
      "utf8"
    );
    const patch = readFileSync(
      join(ROOT, "src/app/api/admin/billing/pricing/[actionType]/route.ts"),
      "utf8"
    );
    const sync = readFileSync(
      join(ROOT, "src/app/api/admin/billing/pricing/sync-defaults/route.ts"),
      "utf8"
    );
    const pub = readFileSync(join(ROOT, "src/app/api/billing/pricing-catalog/route.ts"), "utf8");
    assert.match(admin, /listStudioPricingCatalogAdmin/);
    assert.match(patch, /updateStudioPricingCatalogRule/);
    assert.match(sync, /syncStudioPricingDefaults/);
    assert.match(pub, /listPublicPricingCatalog/);
  });

  it("DB rule overrides fallback in sync resolver", () => {
    const catalog = samplePublicCatalog();
    const resolved = resolveRegistryActionCreditCost({
      actionType: "motion_render",
      pricingCatalog: catalog,
    });
    assert.equal(resolved?.creditCost, 475);
  });

  it("disabled action is blocked in credit authorization wiring", () => {
    const auth = readFileSync(
      join(ROOT, "src/server/studio-account/studio-credit-authorization.ts"),
      "utf8"
    );
    assert.match(auth, /action_disabled/);
    assert.match(auth, /!dbRule.active/);
  });

  it("public catalog route does not expose provider cost fields", () => {
    const pub = readFileSync(join(ROOT, "src/app/api/billing/pricing-catalog/route.ts"), "utf8");
    assert.doesNotMatch(pub, /providerCostUsd/);
    const component = readFileSync(
      join(ROOT, "src/components/billing/credit-pricing-catalog.tsx"),
      "utf8"
    );
    assert.doesNotMatch(component, /providerCostUsd/);
  });

  it("visibleInCatalog=false hides from public catalog service", () => {
    const service = readFileSync(
      join(ROOT, "src/server/studio-account/studio-pricing-rule-service.ts"),
      "utf8"
    );
    assert.match(service, /visibleInCatalog/);
    assert.match(service, /filter\(\(row\) => row.active && row.visibleInCatalog\)/);
  });

  it("assistant uses pricing catalog value and does not invent prices", () => {
    assert.equal(isAssistantPricingQuestion("Wat kost een doelpuntvideo?"), true);
    assert.equal(resolvePricingQuestionActionType("doelpuntvideo"), "motion_render");
    const reply = buildAssistantPricingCatalogReply({
      message: "Wat kost een doelpuntvideo?",
      catalog: samplePublicCatalog(),
      locale: "nl",
    });
    assert.ok(reply);
    assert.match(reply!.replyNl, /475 credits/);
    assert.doesNotMatch(reply!.replyNl, /9999/);
  });

  it("pricing page renders CreditPricingCatalog", () => {
    const page = readFileSync(join(ROOT, "src/app/pricing/page.tsx"), "utf8");
    assert.match(page, /CreditPricingCatalog/);
    assert.match(page, /pricing\.catalog\.sectionTitle/);
  });

  it("admin pricing panel route exists", () => {
    const page = readFileSync(join(ROOT, "src/app/admin/billing/pricing/page.tsx"), "utf8");
    assert.match(page, /AdminPricingCatalogPanel/);
  });

  it("inactive DB rule returns null from resolveActionCreditCost", () => {
    const service = readFileSync(
      join(ROOT, "src/server/studio-account/studio-pricing-rule-service.ts"),
      "utf8"
    );
    assert.match(service, /if \(dbRule && !dbRule.active\)/);
  });

  it("NL/EN parity keys exist for pricing catalog", () => {
    const en = readFileSync(join(ROOT, "src/i18n/locales/en.ts"), "utf8");
    const nl = readFileSync(join(ROOT, "src/i18n/locales/nl.ts"), "utf8");
    assert.match(en, /"pricing\.catalog\.sectionTitle"/);
    assert.match(nl, /"pricing\.catalog\.sectionTitle"/);
    assert.match(en, /"admin\.pricing\.title"/);
    assert.match(nl, /"admin\.pricing\.title"/);
  });

  it("voice clone registry default is 400 credits with admin note for sync-defaults", () => {
    assert.equal(STUDIO_ACTION_COST_REGISTRY.voice_clone.defaultCreditCost, 400);
    assert.equal(
      PRICING_CATALOG_ACTION_META.voice_clone.defaultAdminNotes,
      "Voice cloning has a higher provider cost than standard voice generation."
    );
    const sync = readFileSync(
      join(ROOT, "src/app/api/admin/billing/pricing/sync-defaults/route.ts"),
      "utf8"
    );
    assert.match(sync, /syncStudioPricingDefaults/);
    const service = readFileSync(
      join(ROOT, "src/server/studio-account/studio-pricing-rule-service.ts"),
      "utf8"
    );
    assert.match(service, /defaultAdminNotes/);
  });

  it("assistant resolves voice clone pricing questions separately from voice generation", () => {
    assert.equal(resolvePricingQuestionActionType("Wat kost stem klonen?"), "voice_clone");
    assert.equal(resolvePricingQuestionActionType("How much does voice clone cost?"), "voice_clone");
    const catalog: StudioPricingCatalogPublicEntry[] = [
      {
        actionType: "voice_clone",
        category: "voice",
        displayName: "Voice clone",
        description: "Clone a voice.",
        creditCost: 400,
        sortOrder: 410,
        isFree: false,
      },
    ];
    const reply = buildAssistantPricingCatalogReply({
      message: "Wat kost stem klonen?",
      catalog,
      locale: "nl",
    });
    assert.ok(reply);
    assert.equal(reply!.creditCost, 400);
    assert.match(reply!.replyNl, /400 credits/);
  });
});
