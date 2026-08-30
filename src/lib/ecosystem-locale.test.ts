import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  languageFromCountryCode,
  resolveEcosystemLanguage,
} from "./ecosystem-locale";

describe("studio ecosystem IP default language", () => {
  it("NL BE SR → nl; else en", () => {
    assert.equal(languageFromCountryCode("NL"), "nl");
    assert.equal(languageFromCountryCode("BE"), "nl");
    assert.equal(languageFromCountryCode("SR"), "nl");
    assert.equal(languageFromCountryCode("DE"), "en");
    assert.equal(languageFromCountryCode(null), "en");
  });

  it("explicit and account beat IP", () => {
    assert.equal(
      resolveEcosystemLanguage({
        explicitLanguage: "en",
        countryCode: "NL",
      }),
      "en",
    );
    assert.equal(
      resolveEcosystemLanguage({
        accountLanguage: "nl",
        countryCode: "US",
      }),
      "nl",
    );
  });
});
