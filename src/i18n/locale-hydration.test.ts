import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveHydratedLocale } from "./index.ts";

describe("Studio locale hydration", () => {
  it("lets an explicit shared cookie beat a stale localStorage value", () => {
    assert.equal(
      resolveHydratedLocale({ saved: "en", cookie: "nl", explicit: true }),
      "nl",
    );
    assert.equal(
      resolveHydratedLocale({ saved: "nl", cookie: "en", explicit: true }),
      "en",
    );
  });

  it("keeps a previous Studio choice when the cookie is not explicit", () => {
    assert.equal(
      resolveHydratedLocale({ saved: "nl", cookie: "en", explicit: false }),
      "nl",
    );
  });

  it("uses the cookie, then English", () => {
    assert.equal(
      resolveHydratedLocale({ saved: null, cookie: "nl", explicit: false }),
      "nl",
    );
    assert.equal(
      resolveHydratedLocale({ saved: null, cookie: null, explicit: false }),
      "en",
    );
  });
});
