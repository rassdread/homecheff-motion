import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAssetIdentityPrefillFromImages,
  buildAssetIdentityPrefillFromPrompt,
  mergeAssetIdentityPrefills,
} from "@/lib/studio-asset-identity-prefill";

describe("studio-asset-identity-prefill", () => {
  it("builds prop prefill from prompt via shared engine", () => {
    const proposal = buildAssetIdentityPrefillFromPrompt({
      kind: "prop",
      prompt: "Wooden market cart for street food",
    });
    assert.equal(proposal.kind, "prop");
    assert.ok(proposal.reasons.includes("source:prompt"));
  });

  it("builds location prefill from image filename", () => {
    const proposal = buildAssetIdentityPrefillFromImages({
      kind: "location",
      fileNames: ["kingston-market-street.jpg"],
    });
    assert.equal(proposal.kind, "location");
    assert.ok(proposal.reasons.includes("source:image"));
  });

  it("merges prompt and image proposals with conflicts", () => {
    const prompt = buildAssetIdentityPrefillFromPrompt({
      kind: "prop",
      prompt: "Steel chef knife",
    });
    const image = buildAssetIdentityPrefillFromImages({
      kind: "prop",
      fileNames: ["wooden-spoon.jpg"],
      userDescription: "wooden spoon",
    });
    const merged = mergeAssetIdentityPrefills({
      kind: "prop",
      promptProposal: prompt,
      imageProposal: image,
    });
    assert.ok(merged.reasons.includes("source:merge"));
    assert.ok(Object.keys(merged.prefill).length > 0);
  });
});
