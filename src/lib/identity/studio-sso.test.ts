import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCentralIdentityFlags,
  isCentralSsoLive,
  isLegacyStudioLoginEnabled,
} from "@/lib/identity/flags";
import {
  homecheffForgotPasswordHref,
  homecheffRegisterHrefForStudio,
  studioSsoStartAbsoluteHref,
} from "@/lib/identity/homecheff-origin";
import { validateStudioReturnTo, isPublicStudioSurface } from "@/lib/identity/return-path";
import { hasStudioWelcomeCookie } from "@/lib/identity/studio-welcome";
import { mapHomeCheffExchangeError, mapUnknownStudioCallbackFailure, StudioSsoError, studioSsoErrorMessage } from "@/lib/identity/sso/errors";
import { validateSsoClaims } from "@/lib/identity/sso/exchange-client";
import { codeChallengeS256, generateCodeVerifier } from "@/lib/identity/sso/pkce";
import { AUTH_COOKIE_NAMES } from "@/server/auth/cookie-names";

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

describe("SP.2B Studio SSO flags", () => {
  it("defaults SSO off and legacy login on", () => {
    withEnv(
      {
        CENTRAL_IDENTITY_ENABLED: undefined,
        CENTRAL_SSO_ENABLED: undefined,
        CENTRAL_IDENTITY_REQUIRED: undefined,
        LEGACY_STUDIO_LOGIN_ENABLED: undefined,
      },
      () => {
        const flags = getCentralIdentityFlags();
        assert.equal(isCentralSsoLive(flags), false);
        assert.equal(isLegacyStudioLoginEnabled(flags), true);
      },
    );
  });

  it("requires both identity + sso flags for live SSO", () => {
    withEnv(
      {
        CENTRAL_IDENTITY_ENABLED: "true",
        CENTRAL_SSO_ENABLED: "true",
      },
      () => {
        assert.equal(isCentralSsoLive(), true);
      },
    );
  });
});

describe("SP.2B returnTo", () => {
  it("allows studio paths and rejects open redirects", () => {
    assert.equal(validateStudioReturnTo("/studio"), "/studio");
    assert.equal(validateStudioReturnTo("/editor"), "/editor");
    assert.equal(validateStudioReturnTo("https://evil.example/"), "/");
    assert.equal(validateStudioReturnTo("//evil"), "/");
  });

  it("allows welcome and auth presentation paths (SP.2B.1)", () => {
    assert.equal(validateStudioReturnTo("/welcome"), "/welcome");
    assert.equal(validateStudioReturnTo("/login"), "/login");
    assert.equal(validateStudioReturnTo("/signup"), "/signup");
  });

  it("marks public surfaces for silent hydrate (SP.2B.7)", () => {
    assert.equal(isPublicStudioSurface("/"), true);
    assert.equal(isPublicStudioSurface("/pricing"), true);
    assert.equal(isPublicStudioSurface("/editor"), false);
    assert.equal(isPublicStudioSurface("/account"), false);
  });
});

describe("SP.2B PKCE + claims", () => {
  it("builds S256 challenge", () => {
    const v = generateCodeVerifier();
    assert.ok(v.length >= 32);
    assert.ok(codeChallengeS256(v).length >= 32);
  });

  it("accepts studio audience claims and rejects growth", () => {
    withEnv({ HOMECHEFF_IDENTITY_ORIGIN: "https://homecheff.eu" }, () => {
      const base = {
        iss: "https://homecheff.eu",
        centralUserId: "123e4567-e89b-12d3-a456-426614174000",
        email: "a@example.com",
        emailVerified: true,
        displayName: "A",
        image: null,
        accountStatus: "active",
        issuedAt: new Date().toISOString(),
      };
      const ok = validateSsoClaims({ ...base, aud: "studio" });
      assert.equal(ok.aud, "studio");
      assert.throws(() => validateSsoClaims({ ...base, aud: "growth" }));
    });
  });

  it("maps HC exchange errors", () => {
    assert.equal(mapHomeCheffExchangeError("USED_CODE"), "SSO_USED");
    assert.ok(studioSsoErrorMessage("SSO_DISABLED").length > 0);
  });
});

describe("SP.2B cookie containment", () => {
  it("keeps studio_session product cookie name", () => {
    assert.equal(AUTH_COOKIE_NAMES.studio, "studio_session");
    assert.equal(AUTH_COOKIE_NAMES.legacy, "hc_session");
  });
});

describe("SP.2B.1 presentation deep links", () => {
  it("builds IdP register callback to Studio SSO start", () => {
    withEnv(
      {
        HOMECHEFF_IDENTITY_ORIGIN: "https://homecheff.eu",
        NEXT_PUBLIC_APP_URL: "https://studio.example",
      },
      () => {
        assert.equal(
          studioSsoStartAbsoluteHref("/studio"),
          "https://studio.example/auth/sso/start?returnTo=%2Fstudio",
        );
        const reg = homecheffRegisterHrefForStudio("/studio");
        assert.ok(reg.startsWith("https://homecheff.eu/register?"));
        assert.ok(reg.includes(encodeURIComponent("https://studio.example/auth/sso/start")));
        assert.equal(homecheffForgotPasswordHref(), "https://homecheff.eu/forgot-password");
      },
    );
  });

  it("detects studio welcome cookie", () => {
    assert.equal(hasStudioWelcomeCookie("studio_welcome_done=1"), true);
    assert.equal(hasStudioWelcomeCookie("a=1; studio_welcome_done=1; b=2"), true);
    assert.equal(hasStudioWelcomeCookie("studio_welcome_done=0"), false);
    assert.equal(hasStudioWelcomeCookie(""), false);
  });
});

describe("SP.2B.3 account selection intent", () => {
  it("maps IDENTITY_NOT_LINKED to actionable copy", () => {
    assert.match(
      studioSsoErrorMessage("IDENTITY_NOT_LINKED"),
      /geen Studio-profiel|no Studio profile/i,
    );
  });

  it("keeps studio_session host-only cookie name", () => {
    assert.equal(AUTH_COOKIE_NAMES.studio, "studio_session");
  });
});

describe("SP.2B.8 callback failure classification", () => {
  it("maps Neon unreachable after exchange to RETRY_LATER not EXCHANGE_FAILED", () => {
    assert.equal(
      mapUnknownStudioCallbackFailure(
        new Error(
          "Can't reach database server at `ep-wild-morning-alynrf2i.c-3.eu-central-1.aws.neon.tech:5432`",
        ),
        "resolve",
      ),
      "RETRY_LATER",
    );
    assert.equal(
      mapUnknownStudioCallbackFailure(new Error("boom"), "resolve"),
      "INTERNAL_ERROR",
    );
    assert.equal(
      mapUnknownStudioCallbackFailure(new Error("boom"), "exchange"),
      "EXCHANGE_FAILED",
    );
  });

  it("preserves StudioSsoError codes from resolve", () => {
    assert.equal(
      mapUnknownStudioCallbackFailure(new StudioSsoError("IDENTITY_EMAIL_COLLISION"), "resolve"),
      "IDENTITY_EMAIL_COLLISION",
    );
  });
});
