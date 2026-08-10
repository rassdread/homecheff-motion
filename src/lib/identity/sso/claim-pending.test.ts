import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildClaimPending,
  decodeClaimPending,
  encodeClaimPending,
} from "@/lib/identity/sso/claim-pending";

function withEnv(patch: Record<string, string | undefined>, run: () => void) {
  const keys = Object.keys(patch);
  const prev: Record<string, string | undefined> = {};
  for (const k of keys) {
    prev[k] = process.env[k];
    const v = patch[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    run();
  } finally {
    for (const k of keys) {
      const v = prev[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

describe("SP.2B.3 claim pending confirmation cookie", () => {
  it("round-trips signed claim pending payload", () => {
    withEnv({ AUTH_SECRET: "test-secret-at-least-16chars" }, () => {
      const pending = buildClaimPending({
        claimStudioUserId: "studio-user-1",
        centralUserId: "123e4567-e89b-12d3-a456-426614174000",
        email: "b@example.com",
        displayName: "Account B",
        returnTo: "/account/settings",
      });
      const encoded = encodeClaimPending(pending);
      const decoded = decodeClaimPending(encoded);
      assert.equal(decoded.claimStudioUserId, "studio-user-1");
      assert.equal(decoded.centralUserId, pending.centralUserId);
      assert.equal(decoded.email, "b@example.com");
      assert.equal(decoded.displayName, "Account B");
      assert.equal(decoded.returnTo, "/account/settings");
    });
  });

  it("rejects tampered payload", () => {
    withEnv({ AUTH_SECRET: "test-secret-at-least-16chars" }, () => {
      const pending = buildClaimPending({
        claimStudioUserId: "studio-user-1",
        centralUserId: "123e4567-e89b-12d3-a456-426614174000",
        email: "b@example.com",
        returnTo: "/account/settings",
      });
      const encoded = encodeClaimPending(pending);
      const [body] = encoded.split(".");
      assert.throws(() => decodeClaimPending(`${body}.deadbeef`));
    });
  });
});
