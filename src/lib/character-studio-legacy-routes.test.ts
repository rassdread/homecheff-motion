import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  characterStudioFlowForFusionIntent,
  isCharacterStudioFusionIntent,
  resolveCharacterStudioRouteForFusionIntent,
  resolveLegacyEditorStartRedirect,
} from "@/lib/character-studio-legacy-routes";

describe("character studio legacy routes", () => {
  it("maps outfit intent to outfit flow", () => {
    assert.equal(characterStudioFlowForFusionIntent("outfit_from_reference"), "outfit");
    assert.equal(isCharacterStudioFusionIntent("outfit_from_reference"), true);
  });

  it("resolves combine intent deep links", () => {
    const route = resolveCharacterStudioRouteForFusionIntent("character_upgrade");
    assert.match(route ?? "", /flow=character_upgrade/);
  });

  it("redirects logo_placement workflow", () => {
    const redirect = resolveLegacyEditorStartRedirect({ workflow: "logo_placement" });
    assert.ok(redirect);
    assert.match(redirect!.to, /flow=logo_placement/);
  });

  it("does not redirect bare combine workflow", () => {
    assert.equal(resolveLegacyEditorStartRedirect({ workflow: "combine" }), null);
  });

  it("redirects combine with character intent", () => {
    const redirect = resolveLegacyEditorStartRedirect({
      workflow: "combine",
      intent: "mascot_into_human",
    });
    assert.ok(redirect);
    assert.match(redirect!.to, /flow=mascot_to_human/);
  });
});
