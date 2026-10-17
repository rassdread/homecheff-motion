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
      "/",
      "/maak",
      "/studio",
      "/studio/projects",
      "/studio/storyboards",
      "/studio/storyboards/new",
      "/animate/instant",
      "/studio?storyboardId=abc",
      "/studio/photo-video",
      "/studio/photo-video?resume=1",
      "/studio/photo-video/from-item",
      "/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters",
    ]) {
      assert.equal(isAllowedPostAuthPath(path), true, path);
    }
  });

  it("rejects open redirects and unknown paths", () => {
    for (const path of [
      "//evil.com",
      "https://evil.com",
      "https://studio.homecheff.eu/studio/projects/x",
      "/evil",
      "/studio?foo=bar",
    ]) {
      assert.equal(isAllowedPostAuthPath(path), false, path);
    }
  });

  it("falls back to / for missing or invalid next", () => {
    assert.equal(DEFAULT_POST_AUTH_PATH, "/");
    assert.equal(resolvePostAuthRedirect(undefined), "/");
    assert.equal(resolvePostAuthRedirect(""), "/");
    assert.equal(resolvePostAuthRedirect("/evil"), "/");
    assert.equal(resolvePostAuthRedirect("/maak"), "/");
    assert.equal(resolvePostAuthRedirect("/animate/instant"), "/animate/instant");
    assert.equal(resolvePostAuthRedirect("/studio/photo-video?resume=1"), "/studio/photo-video?resume=1");
    assert.equal(
      resolvePostAuthRedirect("/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters"),
      "/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters",
    );
    assert.equal(resolvePostAuthRedirect("https://studio.homecheff.eu/"), "/");
  });
});
