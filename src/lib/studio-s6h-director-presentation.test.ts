/**
 * S.6H Creative Director Adaptive Presentation — regression tests.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertPresentationDoesNotReplaceProductMode,
  resolveStudioDirectorPresentation,
  shouldRenderCreativeGlobe,
  STUDIO_DIRECTOR_PRESENTATION_MODES,
} from "@/lib/studio-director-presentation";

describe("S.6H director presentation resolver", () => {
  it("uses immersive desktop on large viewports with globe + orbit", () => {
    const plan = resolveStudioDirectorPresentation(1440, 900);
    assert.equal(plan.mode, "IMMERSIVE_DESKTOP");
    assert.equal(shouldRenderCreativeGlobe(plan), true);
    assert.equal(plan.renderOrbit, true);
    assert.equal(plan.allowParticles, true);
    assert.ok(plan.maxVisibleOrbitNodes >= 8);
  });

  it("uses compact tablet with smaller orbit budget and no particles", () => {
    const plan = resolveStudioDirectorPresentation(900, 1200);
    assert.equal(plan.mode, "COMPACT_TABLET");
    assert.equal(shouldRenderCreativeGlobe(plan), true);
    assert.equal(plan.allowParticles, false);
    assert.equal(plan.touchOptimized, true);
    assert.ok(plan.maxVisibleOrbitNodes <= 8);
  });

  it("never renders globe on mobile portrait (minimal cards)", () => {
    const plan = resolveStudioDirectorPresentation(390, 844);
    assert.equal(plan.mode, "MINIMAL_MOBILE");
    assert.equal(shouldRenderCreativeGlobe(plan), false);
    assert.equal(plan.renderOrbit, false);
    assert.equal(plan.allowRichMotion, false);
    assert.equal(plan.allowParticles, false);
    assert.equal(plan.renderPackCards, true);
  });

  it("adapts mobile landscape to compact or minimal without globe", () => {
    const wide = resolveStudioDirectorPresentation(800, 390);
    assert.equal(wide.mode, "COMPACT_MOBILE");
    assert.equal(shouldRenderCreativeGlobe(wide), false);

    const narrow = resolveStudioDirectorPresentation(560, 320);
    assert.equal(narrow.mode, "MINIMAL_MOBILE");
    assert.equal(shouldRenderCreativeGlobe(narrow), false);
  });

  it("keeps presentation orthogonal to product mode", () => {
    for (const presentation of STUDIO_DIRECTOR_PRESENTATION_MODES) {
      for (const productMode of ["QUICK", "PROFESSIONAL", "DIRECTOR"] as const) {
        const pair = assertPresentationDoesNotReplaceProductMode(presentation, productMode);
        assert.equal(pair.presentation, presentation);
        assert.equal(pair.productMode, productMode);
      }
    }
  });

  it("marks layer as Adaptive Workspace inheritor for future capabilities", () => {
    const plan = resolveStudioDirectorPresentation(1280, 800);
    assert.equal(plan.inheritsAdaptiveWorkspace, true);
    assert.equal(plan.version, "6h.1");
  });
});
