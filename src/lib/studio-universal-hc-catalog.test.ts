import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { STUDIO_HC_PACK_CATALOG, studioPackHcGrant } from "@/lib/studio-hc-pack-catalog";
import { STUDIO_NL_TARGET_CATALOG } from "@/lib/studio-nl-b2c-catalog";

describe("Studio Universal HC catalog (motion)", () => {
  it("subscription HC grants 900/1800/5000", () => {
    assert.equal(STUDIO_NL_TARGET_CATALOG.creator.monthlyHcGrant, 900);
    assert.equal(STUDIO_NL_TARGET_CATALOG.pro.monthlyHcGrant, 1800);
    assert.equal(STUDIO_NL_TARGET_CATALOG.studio.monthlyHcGrant, 5000);
  });

  it("pack HC grants 250/500/1000/2500", () => {
    assert.equal(studioPackHcGrant("pack_500"), 250);
    assert.equal(studioPackHcGrant("pack_1250"), 500);
    assert.equal(studioPackHcGrant("pack_3000"), 1000);
    assert.equal(studioPackHcGrant("pack_8000"), 2500);
    assert.equal(STUDIO_HC_PACK_CATALOG.length, 4);
  });
});
