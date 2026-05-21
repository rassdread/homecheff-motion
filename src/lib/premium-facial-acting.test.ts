import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCompactFacialActingLine,
  buildRoleFacialActingHint,
  FACIAL_ANTI_PATTERN_LINE,
} from "@/lib/premium-facial-acting";

describe("premium facial acting", () => {
  it("includes chef role hint", () => {
    const hint = buildRoleFacialActingHint([
      { roleId: "CHEF_HOST", confidence: 0.9, label: "Chef" },
    ]);
    assert.match(hint, /Chef mascot/i);
  });

  it("compact line prioritizes faces", () => {
    const line = buildCompactFacialActingLine([]);
    assert.match(line, /living faces/i);
    assert.ok(line.includes(FACIAL_ANTI_PATTERN_LINE));
    assert.ok(line.length < 320);
  });

  it("includes garden micro-acting", () => {
    const line = buildCompactFacialActingLine([
      { roleId: "GARDEN_GUIDE", confidence: 0.8, label: "Garden" },
    ]);
    assert.match(line, /curious warm eyes/i);
  });
});
