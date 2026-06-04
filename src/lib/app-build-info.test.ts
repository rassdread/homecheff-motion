import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getAppBuildInfo } from "@/lib/app-build-info";

describe("app-build-info", () => {
  it("returns string markers for deploy debug panel", () => {
    const info = getAppBuildInfo();
    assert.equal(typeof info.commitSha, "string");
    assert.equal(typeof info.deploymentId, "string");
    assert.equal(typeof info.buildTime, "string");
  });
});
