import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_POST_AUTH_PATH,
  isAllowedPostAuthPath,
  resolvePostAuthRedirect,
} from "@/lib/auth-post-auth-redirect";

describe("auth post-auth redirect", () => {
  it("allows the documented callback routes", () => {
    for (const path of [
      "/maak",
      "/studio",
      "/studio/projects",
      "/studio/storyboards",
      "/studio/storyboards/new",
      "/animate/instant",
      "/studio?storyboardId=abc",
    ]) {
      assert.equal(isAllowedPostAuthPath(path), true, path);
    }
  });

  it("rejects open redirects and unknown paths", () => {
    for (const path of ["//evil.com", "https://evil.com", "/evil", "/studio?foo=bar"]) {
      assert.equal(isAllowedPostAuthPath(path), false, path);
    }
  });

  it("falls back to /maak for missing or invalid next", () => {
    assert.equal(DEFAULT_POST_AUTH_PATH, "/maak");
    assert.equal(resolvePostAuthRedirect(undefined), "/maak");
    assert.equal(resolvePostAuthRedirect(""), "/maak");
    assert.equal(resolvePostAuthRedirect("/evil"), "/maak");
    assert.equal(resolvePostAuthRedirect("/animate/instant"), "/animate/instant");
  });
});
