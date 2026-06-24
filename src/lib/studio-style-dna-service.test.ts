import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  resolveEditorStyleDnaBillingMode,
  resolveStyleDna,
} from "@/server/studio/resolve-style-dna";
import {
  clearStyleDnaCacheForTests,
  readStyleDnaCache,
  writeStyleDnaCache,
} from "@/server/studio/style-dna-cache";
import { styleDnaHttpStatus, styleDnaUserMessage } from "@/types/studio-style-dna";
import type { AssetStyleDna } from "@/types/studio-asset-derivation";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";

const ROOT = join(process.cwd(), "src");

function readSrc(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const sampleStyleDna: AssetStyleDna = {
  visualStyle: "Flat cartoon",
  colorTheme: "blue; green",
  shapeLanguage: "rounded",
  outfitHints: "chef apron",
  brandIdentity: "HomeCheff Globe Man",
  mascotTraits: "friendly",
  confidence: 0.9,
};

const sampleVision: AssetVisionAnalysis = {
  objectType: "Mascot",
  visualStyle: "Flat cartoon",
  colors: [],
  shapeLanguage: ["rounded"],
  keyFeatures: ["globe head"],
  brandIdentity: "HomeCheff Globe Man",
  confidence: 0.9,
};

describe("studio style DNA service", () => {
  it("maps billing mode for premium editor bootstrap", () => {
    assert.equal(
      resolveEditorStyleDnaBillingMode({ analysisRunId: "run-abc" }),
      "premium_session"
    );
    assert.equal(
      resolveEditorStyleDnaBillingMode({
        explicit: "premium_session",
        analysisRunId: null,
      }),
      "premium_session"
    );
    assert.equal(
      resolveEditorStyleDnaBillingMode({ productionTransactionId: "tx-1" }),
      "production_contract"
    );
    assert.equal(resolveEditorStyleDnaBillingMode({}), "standalone");
  });

  it("returns STYLE_DNA_IMAGE_MISSING for empty image URL", async () => {
    const result = await resolveStyleDna({ id: "user-1" }, {
      imageUrl: "",
      sourceKind: "character",
      sourceName: "Globe Man",
      derivationJobId: "job-1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "STYLE_DNA_IMAGE_MISSING");
      assert.equal(result.status, 400);
      assert.match(result.userMessage, /personage/i);
    }
  });

  it("returns STYLE_DNA_IMAGE_UNREADABLE for blob URLs", async () => {
    const result = await resolveStyleDna({ id: "user-1" }, {
      imageUrl: "blob:http://localhost/abc",
      sourceKind: "character",
      sourceName: "Globe Man",
      derivationJobId: "job-1",
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.code, "STYLE_DNA_IMAGE_UNREADABLE");
      assert.equal(result.status, 400);
    }
  });

  it("reuses in-memory cache without provider call", async () => {
    clearStyleDnaCacheForTests();
    const imageUrl = "https://cdn.example.com/globe-man.png";
    writeStyleDnaCache(imageUrl, "character", {
      styleDna: sampleStyleDna,
      visionAnalysis: sampleVision,
    });
    assert.ok(readStyleDnaCache(imageUrl, "character"));

    const result = await resolveStyleDna({ id: "user-1" }, {
      imageUrl,
      sourceKind: "character",
      sourceName: "Globe Man",
      derivationJobId: "job-cache",
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.cached, true);
      assert.equal(result.billingMode, "cache_hit");
      assert.equal(result.data.styleDna.brandIdentity, "HomeCheff Globe Man");
    }
  });

  it("typed errors never use raw 502 status for validation", () => {
    for (const code of [
      "STYLE_DNA_IMAGE_MISSING",
      "STYLE_DNA_IMAGE_UNREADABLE",
      "STYLE_DNA_BILLING_REQUIRED",
      "STYLE_DNA_CONTRACT_REQUIRED",
      "STYLE_DNA_PROVIDER_FAILED",
      "STYLE_DNA_TIMEOUT",
    ] as const) {
      assert.notEqual(styleDnaHttpStatus(code), 502);
    }
    assert.match(styleDnaUserMessage("STYLE_DNA_IMAGE_MISSING"), /personage|credits|analyse/i);
  });

  it("editor style-dna route skips wallet double billing for premium session", () => {
    const route = readSrc("app/api/editor/vision/style-dna/route.ts");
    assert.doesNotMatch(route, /withStudioCreditGate\([\s\S]*premium_vision_analysis/);
    assert.match(route, /billingMode === "premium_session"/);
    assert.match(route, /skipLegacyMetering: true/);
    assert.match(route, /recordEditorPremiumProviderCost/);
    assert.match(route, /userMessage/);
  });

  it("premium bootstrap passes billingMode premium_session", () => {
    const bootstrap = readSrc("lib/editor-detection-bootstrap.ts");
    assert.match(bootstrap, /billingMode: "premium_session"/);
    const client = readSrc("lib/editor-vision-style-dna-client.ts");
    assert.match(client, /billingMode: params\.billingContext\?\.billingMode \?\? "premium_session"/);
  });

  it("asset derivation analyze checks cache before billing", () => {
    const route = readSrc("app/api/studio/asset-derivation/analyze/route.ts");
    assert.match(route, /readStyleDnaCache/);
    assert.match(route, /actionType: "vision_analysis"/);
    assert.match(route, /resolveStyleDna/);
  });
});
