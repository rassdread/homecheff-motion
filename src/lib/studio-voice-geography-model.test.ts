import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mockVoiceLibraryCatalog } from "@/lib/studio-voice-library-catalog";
import {
  buildFacetedCountryOptions,
  buildFacetedRegionOptions,
  resolveStoryCountryHints,
  resolveVoiceAccessTier,
  resolveVoiceGeography,
} from "@/lib/studio-voice-geography-model";

describe("studio-voice-geography-model", () => {
  it("maps dutch accent to netherlands country", () => {
    const voice = mockVoiceLibraryCatalog().voices.find((v) => v.id === "mock-dutch-grower")!;
    const geo = resolveVoiceGeography(voice);
    assert.equal(geo.countryId, "netherlands");
    assert.equal(geo.countryLabelKey, "studio.voiceLibrary.country.netherlands");
  });

  it("maps surinamese accent to suriname country", () => {
    const voice = mockVoiceLibraryCatalog().voices.find((v) => v.id === "mock-surinamese")!;
    const geo = resolveVoiceGeography(voice);
    assert.equal(geo.countryId, "suriname");
  });

  it("surfaces region only when city token exists in voice text", () => {
    const voice = {
      ...mockVoiceLibraryCatalog().voices[0]!,
      name: "Chef from Paramaribo",
      description: "Street food in Paramaribo",
      accent: "surinamese",
      labels: { accent: "surinamese", language: "nl" },
    };
    const geo = resolveVoiceGeography(voice);
    assert.equal(geo.regionId, "paramaribo");
    assert.equal(geo.countryId, "suriname");
  });

  it("does not invent region without metadata tokens", () => {
    const voice = mockVoiceLibraryCatalog().voices.find((v) => v.id === "mock-dutch-grower")!;
    const geo = resolveVoiceGeography(voice);
    assert.equal(geo.regionId, null);
  });

  it("builds faceted country counts from voice set", () => {
    const voices = mockVoiceLibraryCatalog().voices;
    const options = buildFacetedCountryOptions(voices);
    const nl = options.find((o) => o.value === "netherlands");
    assert.ok(nl);
    assert.ok(nl!.voiceCount >= 1);
  });

  it("scopes region facets to selected country", () => {
    const voice = {
      ...mockVoiceLibraryCatalog().voices[0]!,
      name: "Rotterdam host",
      description: "Rotterdam neighborhood",
      accent: "dutch",
      language: "nl",
      labels: { accent: "dutch", language: "nl" },
    };
    const options = buildFacetedRegionOptions([voice], "netherlands");
    assert.ok(options.some((o) => o.value === "rotterdam"));
    const outside = buildFacetedRegionOptions([voice], "suriname");
    assert.equal(outside.length, 0);
  });

  it("resolves story country hints for surinamese chef context", () => {
    const hints = resolveStoryCountryHints("surinaamse chef paramaribo keuken");
    assert.ok(hints.includes("suriname"));
  });

  it("maps access tiers from category", () => {
    assert.equal(resolveVoiceAccessTier({ category: "premade" }), "included");
    assert.equal(resolveVoiceAccessTier({ category: "professional" }), "premium");
    assert.equal(resolveVoiceAccessTier({ category: "shared" }), "marketplace");
    assert.equal(resolveVoiceAccessTier({ category: "shared", isClone: true }), "clone");
  });
});
