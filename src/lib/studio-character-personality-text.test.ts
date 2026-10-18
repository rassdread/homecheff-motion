import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  personalityChipSelected,
  togglePersonalityChip,
} from "@/lib/studio-character-personality-text";

describe("personality chip text", () => {
  it("appends a chip without replacing free text and removes only that chip", () => {
    const sentence = "Warm, enthusiastic and creative. Smiles while presenting cupcakes.";
    const withChip = togglePersonalityChip(sentence, "Reliable");
    assert.equal(
      withChip,
      "Warm, enthusiastic and creative. Smiles while presenting cupcakes., Reliable"
    );
    assert.equal(personalityChipSelected(withChip, "Reliable"), true);
    assert.equal(togglePersonalityChip(withChip, "Reliable"), sentence);
    assert.equal(personalityChipSelected(sentence, "Warm"), true);
    assert.equal(personalityChipSelected(sentence, "creative"), false);
  });
});
