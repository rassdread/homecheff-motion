import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { nl } from "@/i18n/locales/nl";
import { en } from "@/i18n/locales/en";

function placeholders(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g);
  return matches ? [...matches].sort() : [];
}

describe("i18n locale parity", () => {
  it("has the same keys in nl and en", () => {
    const nlKeys = Object.keys(nl).sort();
    const enKeys = Object.keys(en).sort();
    const onlyNl = nlKeys.filter((k) => !enKeys.includes(k));
    const onlyEn = enKeys.filter((k) => !nlKeys.includes(k));
    assert.deepEqual(onlyNl, [], `keys only in nl: ${onlyNl.slice(0, 10).join(", ")}`);
    assert.deepEqual(onlyEn, [], `keys only in en: ${onlyEn.slice(0, 10).join(", ")}`);
  });

  it("has matching placeholders per key", () => {
    const mismatches: string[] = [];
    for (const key of Object.keys(nl)) {
      const nlPh = placeholders(nl[key as keyof typeof nl]);
      const enPh = placeholders(en[key as keyof typeof en]);
      if (nlPh.join(",") !== enPh.join(",")) {
        mismatches.push(key);
      }
    }
    assert.equal(mismatches.length, 0, mismatches.slice(0, 5).join("\n"));
  });

  it("has no empty translation strings except known optional chips", () => {
    const allowedEmpty = new Set(["instant.chipAppend.ai_decide"]);
    for (const key of Object.keys(nl)) {
      if (allowedEmpty.has(key)) {
        continue;
      }
      assert.ok(nl[key as keyof typeof nl].trim(), `empty nl: ${key}`);
      assert.ok(en[key as keyof typeof en].trim(), `empty en: ${key}`);
    }
  });
});
