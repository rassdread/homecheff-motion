import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

const USER_PREFIXES = [
  "studio.",
  "motion.",
  "instant.",
  "maak.",
  "create.",
  "videos.",
  "animate.",
];

const ADMIN_PREFIX = "admin.";

const FORBIDDEN_IN_NL_VALUES = [
  /\bWorkspace\b/,
  /\bInspector\b/,
  /\bDirector V2\b/,
  /\bProvider\b/,
  /\bHandoff\b/,
  /\bStoryboard\b/,
  /\bExecution Plan\b/,
  /\bExecution Framework\b/,
  /\bVersion Lineage\b/,
  /\bRegistry\b/,
  /\bPipeline\b/,
  /\bMetadata\b/,
  /\bProvider Assignment\b/,
  /\bProduction insights\b/,
  /\bDebug\b/,
  /\bInternal\b/,
  /\bRuntime\b/,
];

function userFacingKeys(locale: Record<string, string>): string[] {
  return Object.keys(locale).filter((key) => {
    if (key.startsWith(ADMIN_PREFIX)) return false;
    return USER_PREFIXES.some((prefix) => key.startsWith(prefix));
  });
}

function parityKeys(locale: Record<string, string>): string[] {
  return userFacingKeys(locale);
}

describe("Studio + Motion i18n hardening", () => {
  it("has full nl/en key parity for user-facing studio/motion prefixes", () => {
    const nlKeys = parityKeys(nl).sort();
    const enKeys = parityKeys(en).sort();
    assert.deepEqual(nlKeys, enKeys);
  });

  it("includes shared studio common error keys in both locales", () => {
    for (const key of ["studio.common.saveFailed", "studio.common.generationFailed"] as const) {
      assert.ok(nl[key], `missing nl key ${key}`);
      assert.ok(en[key], `missing en key ${key}`);
    }
  });

  it("avoids forbidden developer terms in nl user-facing values", () => {
    const hits: string[] = [];
    for (const key of userFacingKeys(nl)) {
      const value = nl[key as keyof typeof nl];
      for (const pattern of FORBIDDEN_IN_NL_VALUES) {
        if (pattern.test(value)) {
          hits.push(`${key}: ${pattern}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });

  it("avoids raw Dutch terms in en user-facing values for canonical concepts", () => {
    const forbidden = [
      "Verhaaleditor",
      "Videoverhaal",
      "Mijn videoverhalen",
      "Maak video",
      "Projectanalyse",
      "Verhaaldoel",
      "AI-regisseur",
    ];
    const hits: string[] = [];
    for (const key of userFacingKeys(en)) {
      const value = en[key as keyof typeof en];
      for (const term of forbidden) {
        if (value.includes(term)) {
          hits.push(`${key}: ${term}`);
        }
      }
    }
    assert.deepEqual(hits, []);
  });
});
