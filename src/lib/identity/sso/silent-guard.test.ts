import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDIO_SILENT_SSO_ATTEMPT_COOKIE,
  STUDIO_SKIP_SILENT_SSO_COOKIE,
  canAttemptSilentSso,
  readCookieValue,
} from "@/lib/identity/sso/silent-guard";

describe("SP.2B.5 silent SSO loop guards", () => {
  it("allows silent when no markers", () => {
    assert.equal(canAttemptSilentSso(null), true);
    assert.equal(canAttemptSilentSso(""), true);
  });

  it("blocks when attempt or skip cookie present", () => {
    assert.equal(canAttemptSilentSso(`${STUDIO_SILENT_SSO_ATTEMPT_COOKIE}=1`), false);
    assert.equal(canAttemptSilentSso(`${STUDIO_SKIP_SILENT_SSO_COOKIE}=1`), false);
    assert.equal(
      canAttemptSilentSso(
        `a=1; ${STUDIO_SKIP_SILENT_SSO_COOKIE}=1; ${STUDIO_SILENT_SSO_ATTEMPT_COOKIE}=1`,
      ),
      false,
    );
  });

  it("reads cookie values safely", () => {
    assert.equal(readCookieValue("x=1; studio_skip_silent_sso=1", STUDIO_SKIP_SILENT_SSO_COOKIE), "1");
    assert.equal(readCookieValue("x=1", STUDIO_SKIP_SILENT_SSO_COOKIE), null);
  });
});
