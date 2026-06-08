import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applySemanticRecordToCharacterFields,
  buildAssetSemanticRecordFromVision,
  extractAssetSemanticRecordFromCharacter,
  formatDirectorSemanticAssetLabel,
  parseAssetSemanticRecordFromNotes,
  serializeAssetSemanticRecordToNotes,
} from "@/lib/studio-asset-semantic-record";
import { ASSET_SEMANTIC_MARKER } from "@/types/studio-asset-semantic-record";

describe("studio-asset-semantic-record", () => {
  it("round-trips semantic marker in referenceNotes", () => {
    const record = buildAssetSemanticRecordFromVision({
      objectTypeLabel: "Chef Mascot",
      visualStyle: "Cartoon Mascot",
      brandIdentity: "HomeCheff",
      keyFeatures: ["Chef hat", "Friendly smile"],
      colors: [{ label: "Green", hex: "#006D52" }],
      shapeLanguage: ["Friendly Round"],
      suggestedPreserve: ["Chef hat", "Brand colors"],
      suggestedChange: ["Outfit season"],
      suggestedForbidden: ["Realistic human skin"],
      materialHints: "Soft plush",
      environmentHints: "Kitchen",
    });

    const notes = serializeAssetSemanticRecordToNotes("Human note", record);
    assert.match(notes, new RegExp(ASSET_SEMANTIC_MARKER.replace(/[[\]]/g, "\\$&")));

    const parsed = parseAssetSemanticRecordFromNotes(notes);
    assert.equal(parsed.humanNotes, "Human note");
    assert.equal(parsed.record?.objectType, "Chef Mascot");
    assert.equal(parsed.record?.brandIdentity, "HomeCheff");
    assert.deepEqual(parsed.record?.preserveRules, ["Chef hat", "Brand colors"]);
  });

  it("applySemanticRecordToCharacterFields persists appearance and keywords", () => {
    const record = buildAssetSemanticRecordFromVision({
      objectTypeLabel: "Mascot",
      visualStyle: "Cartoon",
      brandIdentity: "HomeCheff",
      keyFeatures: ["Round face"],
      colors: [{ label: "Green" }],
      shapeLanguage: ["Round"],
      suggestedPreserve: ["Hat"],
      suggestedChange: [],
      suggestedForbidden: ["Horror"],
      materialHints: "",
      environmentHints: "",
    });

    const applied = applySemanticRecordToCharacterFields(record, {});
    assert.match(applied.referenceNotes, /\[studio:semantic:v1\]/);
    assert.match(applied.appearanceMemory, /Cartoon/);
    assert.match(applied.visualKeywords, /HomeCheff|Mascot/);
  });

  it("extractAssetSemanticRecordFromCharacter reads persisted marker", () => {
    const record = buildAssetSemanticRecordFromVision({
      objectTypeLabel: "Prop Bottle",
      visualStyle: "Product",
      brandIdentity: "HomeCheff",
      keyFeatures: ["Label"],
      colors: [],
      shapeLanguage: [],
      suggestedPreserve: ["Logo"],
      suggestedChange: [],
      suggestedForbidden: [],
      materialHints: "",
      environmentHints: "",
    });
    const notes = serializeAssetSemanticRecordToNotes("", record);
    const extracted = extractAssetSemanticRecordFromCharacter({ referenceNotes: notes });
    assert.equal(extracted.brandIdentity, "HomeCheff");
  });

  it("formatDirectorSemanticAssetLabel enriches asset name", () => {
    const label = formatDirectorSemanticAssetLabel("Chef", {
      version: 1,
      objectType: "Chef Mascot",
      brandIdentity: "HomeCheff",
      shapeDna: ["Friendly Round"],
      visualStyle: "Cartoon Mascot",
    });
    assert.match(label, /Chef/);
    assert.match(label, /HomeCheff/);
    assert.match(label, /Cartoon Mascot/);
  });
});
