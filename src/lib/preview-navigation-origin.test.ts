import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  navigationOriginForRequest,
  previewNavigationOrigin,
  previewUnauthenticatedLocation,
  shouldUsePreviewHostPasswordLogin,
} from "@/lib/preview-navigation-origin";

const PREVIEW = "homecheff-motion-git-feature-559061-sergio-s-projects-f7b64ee1.vercel.app";
const CHARACTER = "/studio/projects/cmvcbmxdp00032jryohiw8a84/character-masters";

describe("preview navigation origin", () => {
  it("keeps production redirects on the configured Studio origin", () => {
    assert.equal(
      previewNavigationOrigin({
        vercelEnv: "production",
        forwardedHost: PREVIEW,
        forwardedProto: "https",
        requestUrl: `https://${PREVIEW}/auth/sso/silent`,
      }),
      null,
    );
    const request = new Request("https://studio.homecheff.eu/auth/sso/silent", {
      headers: { "x-forwarded-host": "studio.homecheff.eu", "x-forwarded-proto": "https" },
    });
    const previousUrl = process.env.NEXT_PUBLIC_APP_URL;
    const previousEnv = process.env.VERCEL_ENV;
    process.env.NEXT_PUBLIC_APP_URL = "https://studio.homecheff.eu";
    process.env.VERCEL_ENV = "production";
    try {
      assert.equal(navigationOriginForRequest(request), "https://studio.homecheff.eu");
    } finally {
      restore("NEXT_PUBLIC_APP_URL", previousUrl);
      restore("VERCEL_ENV", previousEnv);
    }
  });

  it("stays on the Preview hostname and preserves the character path", () => {
    const origin = previewNavigationOrigin({
      vercelEnv: "preview",
      forwardedHost: PREVIEW,
      forwardedProto: "https",
      requestUrl: "https://internal.local/auth/sso/silent",
    });
    assert.equal(origin, `https://${PREVIEW}`);
    assert.equal(
      previewUnauthenticatedLocation({
        origin: origin!,
        returnTo: CHARACTER,
        publicSurface: false,
      }),
      `https://${PREVIEW}/login?next=${encodeURIComponent(CHARACTER)}`,
    );
  });

  it("rejects a foreign host and an absolute return target", () => {
    assert.equal(
      previewNavigationOrigin({
        vercelEnv: "preview",
        forwardedHost: "evil.example",
        forwardedProto: "https",
        requestUrl: "https://evil.example/auth/sso/silent",
      }),
      null,
    );
    assert.equal(
      previewNavigationOrigin({
        vercelEnv: "preview",
        forwardedHost: "https://studio.homecheff.eu",
        forwardedProto: "https",
        requestUrl: "https://studio.homecheff.eu/auth/sso/silent",
      }),
      null,
    );
  });

  it("uses a host-only password session only when Preview has no central SSO", () => {
    assert.equal(
      shouldUsePreviewHostPasswordLogin({ vercelEnv: "preview", centralSsoLive: false }),
      true,
    );
    assert.equal(
      shouldUsePreviewHostPasswordLogin({ vercelEnv: "production", centralSsoLive: false }),
      false,
    );
    assert.equal(
      shouldUsePreviewHostPasswordLogin({ vercelEnv: "production", centralSsoLive: true }),
      false,
    );
    assert.equal(
      shouldUsePreviewHostPasswordLogin({ vercelEnv: "preview", centralSsoLive: true }),
      false,
    );
  });
});

function restore(name: "NEXT_PUBLIC_APP_URL" | "VERCEL_ENV", value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
