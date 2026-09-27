import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { en } from "./locales/en";
import { nl } from "./locales/nl";
import { STUDIO_PUBLIC_FAQ } from "@/lib/studio-public-faq";

describe("Studio FAQ locale", () => {
  it("renders FAQ from the existing dictionaries", () => {
    const page = readFileSync(new URL("../app/faq/page.tsx", import.meta.url), "utf8");
    assert.match(page, /getTranslator/);
    assert.doesNotMatch(page, /item\.question/);
    assert.doesNotMatch(page, /What is HomeCheff Studio\?/);
    assert.doesNotMatch(page, /Who is Studio for\?/);
  });

  it("keeps English FAQ identical to the legal source and Dutch questions distinct", () => {
    for (const item of STUDIO_PUBLIC_FAQ) {
      const q = `faq.q.${item.id}` as keyof typeof nl;
      const a = `faq.a.${item.id}` as keyof typeof nl;
      assert.equal(en[q], item.question);
      assert.equal(en[a], item.answer);
      assert.notEqual(nl[q], item.question);
      assert.ok(nl[a].length > 20);
    }
    assert.equal(nl["faq.q.what-is-studio"], "Wat is HomeCheff Studio?");
    assert.equal(nl["faq.q.who-for"], "Voor wie is Studio?");
    assert.doesNotMatch(nl["faq.q.who-for"], /Who is Studio for/);
    assert.match(en["faq.a.free-music-content-id"], /^No\./);
    assert.match(nl["faq.a.ai-unique"], /niet gegarandeerd/i);
  });
});
