import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildMarketplaceAppliedFilters,
  createMarketplaceSearchDebouncer,
  isMarketplaceSearchPending,
  resolveMarketplaceSearchQuery,
} from "@/lib/studio-voice-marketplace-search";

describe("studio-voice-marketplace-search", () => {
  it("resolveMarketplaceSearchQuery ignores 0-1 character queries", () => {
    assert.equal(resolveMarketplaceSearchQuery(""), undefined);
    assert.equal(resolveMarketplaceSearchQuery("r"), undefined);
    assert.equal(resolveMarketplaceSearchQuery("  r  "), undefined);
    assert.equal(resolveMarketplaceSearchQuery("ro"), "ro");
    assert.equal(resolveMarketplaceSearchQuery("  rot  "), "rot");
  });

  it("buildMarketplaceAppliedFilters strips query below minimum length", () => {
    assert.deepEqual(buildMarketplaceAppliedFilters({ language: "en" }, "r"), {
      language: "en",
    });
    assert.deepEqual(buildMarketplaceAppliedFilters({ language: "en", query: "old" }, "r"), {
      language: "en",
    });
    assert.deepEqual(buildMarketplaceAppliedFilters({ language: "en" }, "rot"), {
      language: "en",
      query: "rot",
    });
  });

  it("isMarketplaceSearchPending compares trimmed input and debounced value", () => {
    assert.equal(isMarketplaceSearchPending("rot", "rot"), false);
    assert.equal(isMarketplaceSearchPending("rotte", "rot"), true);
    assert.equal(isMarketplaceSearchPending("  rot  ", "rot"), false);
  });

  it("debouncer only applies the latest scheduled query", async () => {
    const debouncer = createMarketplaceSearchDebouncer(30);
    const applied: string[] = [];
    const apply = (value: string) => applied.push(value);

    debouncer.schedule("r", apply);
    debouncer.schedule("ro", apply);
    debouncer.schedule("rot", apply);
    debouncer.schedule("rotte", apply);

    await new Promise((resolve) => setTimeout(resolve, 60));

    assert.deepEqual(applied, ["rotte"]);
  });

  it("flush applies immediately and cancels pending debounce", async () => {
    const debouncer = createMarketplaceSearchDebouncer(80);
    const applied: string[] = [];
    const apply = (value: string) => applied.push(value);

    debouncer.schedule("pending", apply);
    debouncer.flush("now", apply);

    assert.deepEqual(applied, ["now"]);
    await new Promise((resolve) => setTimeout(resolve, 100));
    assert.deepEqual(applied, ["now"]);
  });

  it("wires debounced search in marketplace browse panel", () => {
    const sectionPath = join(
      process.cwd(),
      "src/components/studio/studio-character-voice-library-section.tsx"
    );
    const src = readFileSync(sectionPath, "utf8");
    assert.match(src, /useDebouncedMarketplaceSearch/);
    assert.match(src, /buildMarketplaceAppliedFilters/);
    assert.match(src, /value=\{searchInput\}/);
    assert.match(src, /appliedFilters/);
    assert.match(src, /flushSearch/);
    assert.match(src, /clearSearch/);
    assert.match(src, /appliedSearchQuery/);
    assert.match(src, /studio\.voiceLibrary\.searchPending/);
    assert.doesNotMatch(src, /setFilters\(\(prev\) => \(\{ \.\.\.prev, query: e\.target\.value/);
  });
});
