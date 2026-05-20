import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEEVID_QUALITY_TARGETS,
  DEEVID_VS_HOMECHEFF_RESEARCH,
  getDeeVidResearchSummary,
} from "@/lib/premium-deevid-research";

describe("premium deevid research", () => {
  it("documents inferred DeeVid techniques", () => {
    assert.ok(DEEVID_VS_HOMECHEFF_RESEARCH.length >= 5);
    const categories = new Set(DEEVID_VS_HOMECHEFF_RESEARCH.map((t) => t.category));
    assert.ok(categories.has("emotional_acting_prompts"));
    assert.ok(categories.has("temporal_stabilization"));
  });

  it("lists quality targets", () => {
    assert.ok(DEEVID_QUALITY_TARGETS.includes("typography preservation"));
  });

  it("exports research summary string", () => {
    const summary = getDeeVidResearchSummary();
    assert.match(summary, /raw_motion_concat/);
  });
});
