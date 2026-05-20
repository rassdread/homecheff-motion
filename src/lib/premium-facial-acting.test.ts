import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCompactFacialActingLine, buildRoleFacialActingHint } from "@/lib/premium-facial-acting";

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
    assert.match(line, /frozen mascot faces/i);
  });
});
