import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readStudioAffiliateRefFromSearch } from "./studio-affiliate-referral";

describe("studio affiliate referral parse", () => {
  it("parses long ref as centralUserId", () => {
    const r = readStudioAffiliateRefFromSearch("?ref=clxyz012345678901234567");
    assert.equal(r?.affiliateCentralUserId, "clxyz012345678901234567");
  });

  it("parses short slug-like ref as affiliateSlug", () => {
    const r = readStudioAffiliateRefFromSearch("?aff=partner1");
    assert.equal(r?.affiliateSlug, "partner1");
  });

  it("parses affslug explicitly", () => {
    const r = readStudioAffiliateRefFromSearch("?affslug=AcmeCo");
    assert.equal(r?.affiliateSlug, "acmeco");
  });
});
