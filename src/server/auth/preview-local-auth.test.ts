import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { isStudioPreviewLocalLoginEnabled } from "@/lib/identity/flags";
import {
  isStudioOnlyLogoutScope,
  PRODUCTION_IDENTITY_LOGOUT_URL,
  resolveClientIdentityLogout,
} from "@/lib/identity/preview-logout-scope";
import { hashPassword } from "@/server/auth/session";
import {
  AUTHORIZED_STUDIO_PREVIEW_PROJECT_ID,
  canUsePreviewLocalPasswordLogin,
  decidePreviewLocalCredentials,
  isAuthorizedStudioPreviewDeployment,
  isTrustedPreviewLoginOrigin,
  PREVIEW_LOCAL_INVALID_CREDENTIALS,
  resolveStudioLogoutScope,
  studioLogoutResponse,
  type PreviewLocalUser,
} from "@/server/auth/preview-local-auth";

const PREVIEW_HOST = "homecheff-motion-preview.vercel.app";
const PREVIEW_ORIGIN = `https://${PREVIEW_HOST}`;

function withEnv(patch: Record<string, string | undefined>, run: () => void) {
  const keys = Object.keys(patch);
  const prev: Record<string, string | undefined> = {};
  for (const key of keys) {
    prev[key] = process.env[key];
    const value = patch[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    run();
  } finally {
    for (const key of keys) {
      const value = prev[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

function authorizedPreviewEnv(extra: Record<string, string | undefined> = {}) {
  return {
    STUDIO_PREVIEW_LOCAL_LOGIN: "true",
    VERCEL_ENV: "preview",
    VERCEL_PROJECT_ID: AUTHORIZED_STUDIO_PREVIEW_PROJECT_ID,
    VERCEL_URL: PREVIEW_HOST,
    CENTRAL_IDENTITY_ENABLED: undefined,
    CENTRAL_SSO_ENABLED: undefined,
    CENTRAL_IDENTITY_REQUIRED: undefined,
    LEGACY_STUDIO_LOGIN_ENABLED: undefined,
    ...extra,
  };
}

function user(overrides: Partial<PreviewLocalUser> = {}): PreviewLocalUser {
  return {
    id: "user-1",
    email: "owner@example.com",
    passwordHash: hashPassword("correct-password"),
    isActive: true,
    ...overrides,
  };
}

describe("preview local login flag", () => {
  it("stays disabled when the flag is absent or not exactly true", () => {
    for (const value of [undefined, "", "1", "TRUE", "yes", "false", " true "]) {
      withEnv({ STUDIO_PREVIEW_LOCAL_LOGIN: value }, () => {
        assert.equal(isStudioPreviewLocalLoginEnabled(), value?.trim() === "true");
      });
    }
  });

  it("does not authorize production or another project", () => {
    withEnv(authorizedPreviewEnv({ VERCEL_ENV: "production" }), () => {
      assert.equal(isAuthorizedStudioPreviewDeployment(), false);
      assert.equal(canUsePreviewLocalPasswordLogin(), false);
    });
    withEnv(authorizedPreviewEnv({ VERCEL_PROJECT_ID: "prj_other" }), () => {
      assert.equal(canUsePreviewLocalPasswordLogin(), false);
    });
    withEnv(authorizedPreviewEnv({ VERCEL_ENV: undefined, VERCEL_PROJECT_ID: undefined }), () => {
      assert.equal(canUsePreviewLocalPasswordLogin(), false);
    });
  });

  it("allows local login only on the authorized preview deployment", () => {
    withEnv(authorizedPreviewEnv(), () => {
      assert.equal(canUsePreviewLocalPasswordLogin(), true);
    });
  });

  it("allows one explicitly matched isolated preview project and rejects a mismatch", () => {
    withEnv(
      authorizedPreviewEnv({
        VERCEL_PROJECT_ID: "prj_isolated_v25",
        STUDIO_ISOLATED_PREVIEW_PROJECT_ID: "prj_isolated_v25",
      }),
      () => {
        assert.equal(canUsePreviewLocalPasswordLogin(), true);
      },
    );
    withEnv(
      authorizedPreviewEnv({
        VERCEL_PROJECT_ID: "prj_other",
        STUDIO_ISOLATED_PREVIEW_PROJECT_ID: "prj_isolated_v25",
      }),
      () => {
        assert.equal(canUsePreviewLocalPasswordLogin(), false);
      },
    );
    withEnv(
      authorizedPreviewEnv({
        VERCEL_ENV: "production",
        VERCEL_PROJECT_ID: "prj_isolated_v25",
        STUDIO_ISOLATED_PREVIEW_PROJECT_ID: "prj_isolated_v25",
      }),
      () => {
        assert.equal(canUsePreviewLocalPasswordLogin(), false);
      },
    );
  });

  it("refuses a local session when central SSO is live", () => {
    withEnv(
      authorizedPreviewEnv({
        CENTRAL_IDENTITY_ENABLED: "true",
        CENTRAL_SSO_ENABLED: "true",
      }),
      () => {
        assert.equal(canUsePreviewLocalPasswordLogin(), false);
      },
    );
  });

  it("refuses a local session when central identity is required", () => {
    withEnv(authorizedPreviewEnv({ CENTRAL_IDENTITY_REQUIRED: "true" }), () => {
      assert.equal(canUsePreviewLocalPasswordLogin(), false);
    });
  });
});

describe("preview local credentials", () => {
  it("accepts the correct password", () => {
    const decision = decidePreviewLocalCredentials({
      email: "Owner@Example.com",
      password: "correct-password",
      user: user(),
    });
    assert.deepEqual(decision, { kind: "session", userId: "user-1", email: "owner@example.com" });
  });

  it("returns the same 401 body for an unknown email and a wrong password", () => {
    const unknown = decidePreviewLocalCredentials({
      email: "missing@example.com",
      password: "correct-password",
      user: null,
    });
    const wrong = decidePreviewLocalCredentials({
      email: "owner@example.com",
      password: "wrong-password",
      user: user(),
    });
    assert.equal(unknown.kind, "invalid_credentials");
    assert.equal(wrong.kind, "invalid_credentials");
    assert.deepEqual(PREVIEW_LOCAL_INVALID_CREDENTIALS, {
      error: "Invalid credentials.",
      code: "INVALID_CREDENTIALS",
    });
  });

  it("blocks an inactive account only after the password matches", () => {
    const inactive = decidePreviewLocalCredentials({
      email: "owner@example.com",
      password: "correct-password",
      user: user({ isActive: false }),
    });
    const wrongInactive = decidePreviewLocalCredentials({
      email: "owner@example.com",
      password: "wrong-password",
      user: user({ isActive: false }),
    });
    assert.equal(inactive.kind, "inactive");
    assert.equal(wrongInactive.kind, "invalid_credentials");
  });
});

describe("preview login origin", () => {
  it("accepts the trusted deployment origin and rejects every other origin", () => {
    withEnv(authorizedPreviewEnv(), () => {
      assert.equal(isTrustedPreviewLoginOrigin(PREVIEW_ORIGIN), true);
      assert.equal(isTrustedPreviewLoginOrigin("https://studio.homecheff.eu"), false);
      assert.equal(isTrustedPreviewLoginOrigin("https://evil.example"), false);
      assert.equal(isTrustedPreviewLoginOrigin("http://homecheff-motion-preview.vercel.app"), false);
      assert.equal(isTrustedPreviewLoginOrigin(null), false);
    });
    withEnv(authorizedPreviewEnv({ VERCEL_URL: undefined, VERCEL_BRANCH_URL: undefined }), () => {
      assert.equal(isTrustedPreviewLoginOrigin(PREVIEW_ORIGIN), false);
    });
  });
});

describe("preview logout isolation", () => {
  it("clears to studio_only on authorized preview and omits the identity URL", () => {
    withEnv(authorizedPreviewEnv(), () => {
      const scope = resolveStudioLogoutScope(true);
      const body = studioLogoutResponse(scope, "https://homecheff.eu");
      assert.equal(scope, "studio_only");
      assert.equal(isStudioOnlyLogoutScope(body.scope), true);
      assert.equal("idpLogoutUrl" in body, false);
    });
  });

  it("keeps the production identity logout when the flag is absent", () => {
    withEnv(authorizedPreviewEnv({ STUDIO_PREVIEW_LOCAL_LOGIN: undefined }), () => {
      const scope = resolveStudioLogoutScope(true);
      const body = studioLogoutResponse(scope, "https://homecheff.eu");
      assert.equal(scope, "ecosystem");
      assert.equal(body.idpLogoutUrl, "https://homecheff.eu/api/auth/ecosystem-logout");
      assert.equal(isStudioOnlyLogoutScope(body.scope), false);
    });
  });

  it("still honors an explicit product-only logout outside preview", () => {
    withEnv(authorizedPreviewEnv({ STUDIO_PREVIEW_LOCAL_LOGIN: undefined }), () => {
      assert.equal(resolveStudioLogoutScope(false), "studio_only");
    });
  });
});

describe("client identity logout", () => {
  const ecosystem = {
    scope: "ecosystem",
    idpLogoutUrl: "https://homecheff.eu/api/auth/ecosystem-logout",
  };

  it("does not call production after a successful preview logout", () => {
    const decision = resolveClientIdentityLogout({
      previewLogoutIsolated: true,
      attempt: { outcome: "success", scope: "studio_only" },
    });
    assert.equal(decision.callProduction, false);
    assert.equal(decision.url, null);
  });

  it("does not call production when preview logout fails on the network", () => {
    const decision = resolveClientIdentityLogout({
      previewLogoutIsolated: true,
      attempt: { outcome: "network_failure" },
    });
    assert.equal(decision.callProduction, false);
    assert.equal(decision.url, null);
  });

  it("does not call production when preview logout returns an HTTP error", () => {
    const decision = resolveClientIdentityLogout({
      previewLogoutIsolated: true,
      attempt: { outcome: "http_failure", ...ecosystem },
    });
    assert.equal(decision.callProduction, false);
    assert.equal(decision.url, null);
  });

  it("keeps the production ecosystem logout after a successful production logout", () => {
    const decision = resolveClientIdentityLogout({
      previewLogoutIsolated: false,
      attempt: { outcome: "success", ...ecosystem },
    });
    assert.equal(decision.callProduction, true);
    assert.equal(decision.url, PRODUCTION_IDENTITY_LOGOUT_URL);
  });

  it("keeps the production fallback when production logout fails", () => {
    const network = resolveClientIdentityLogout({
      previewLogoutIsolated: false,
      attempt: { outcome: "network_failure" },
    });
    const http = resolveClientIdentityLogout({
      previewLogoutIsolated: false,
      attempt: { outcome: "http_failure" },
    });
    assert.equal(network.callProduction, true);
    assert.equal(network.url, PRODUCTION_IDENTITY_LOGOUT_URL);
    assert.equal(http.callProduction, true);
    assert.equal(http.url, PRODUCTION_IDENTITY_LOGOUT_URL);
  });
});

describe("auth route wiring", () => {
  it("keeps local login behind the gate and clears the session before logout", () => {
    const login = readFileSync(resolve(process.cwd(), "src/app/api/auth/login/route.ts"), "utf8");
    const logout = readFileSync(resolve(process.cwd(), "src/app/api/auth/logout/route.ts"), "utf8");
    const bar = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell-user-bar.tsx"), "utf8");
    const shell = readFileSync(resolve(process.cwd(), "src/components/layout/app-shell.tsx"), "utf8");
    const scope = readFileSync(resolve(process.cwd(), "src/lib/identity/preview-logout-scope.ts"), "utf8");

    const previewFn = login.slice(
      login.indexOf("async function previewLocalPasswordLogin"),
      login.indexOf("export async function POST"),
    );
    assert.match(login, /if \(canUsePreviewLocalPasswordLogin\(\)\)/);
    assert.match(previewFn, /await createSession\(decision\.userId\)/);
    assert.match(previewFn, /decidePreviewLocalCredentials/);
    assert.doesNotMatch(previewFn, /callMarketplaceLegacyMigrate|passwordHash:\s*null/);

    assert.ok(logout.indexOf("await clearSession()") < logout.indexOf("studioLogoutResponse("));
    assert.match(logout, /HOMECHEFF_IDENTITY_ORIGIN\?\.trim\(\)[\s\S]*homecheffIdentityOrigin\(\)/);
    assert.match(logout, /resolveStudioLogoutScope/);

    assert.match(shell, /canUsePreviewLocalPasswordLogin\(\)/);
    assert.match(shell, /previewLogoutIsolated=\{previewLogoutIsolated\}/);
    assert.match(bar, /resolveClientIdentityLogout\(\{ previewLogoutIsolated, attempt \}\)/);
    assert.doesNotMatch(bar, /homecheff\.eu\/api\/auth\/ecosystem-logout/);
    assert.match(scope, /homecheff\.eu\/api\/auth\/ecosystem-logout/);
    assert.match(bar, /postStudioAuthChannel\(\{ type: "logout" \}\)/);
  });
});
