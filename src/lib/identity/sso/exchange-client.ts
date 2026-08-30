/**
 * SP.2B — server-to-server HomeCheff SSO exchange client (Studio).
 */

import { StudioSsoError, mapHomeCheffExchangeError } from "./errors";

export const SSO_EXCHANGE_TIMEOUT_MS = 8_000;

export type SsoIdentityClaims = {
  iss: string;
  aud: string;
  centralUserId: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  image: string | null;
  accountStatus: string;
  issuedAt: string;
  ecoEpoch?: string;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function homecheffIdentityOrigin(): string {
  const o = process.env.HOMECHEFF_IDENTITY_ORIGIN?.trim();
  if (!o) throw new StudioSsoError("CONFIG_ERROR", "HOMECHEFF_IDENTITY_ORIGIN missing");
  return o.replace(/\/$/, "");
}

export function studioSsoRedirectUri(): string {
  const fromEnv = process.env.STUDIO_SSO_REDIRECT_URI?.trim();
  if (fromEnv) {
    // Allow CSV on consumer — first URI is this host's callback
    return fromEnv.split(",")[0]!.trim();
  }
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_STUDIO_URL?.trim() ||
    process.env.PUBLIC_BASE_URL?.trim() ||
    process.env.APP_URL?.trim();
  if (origin) return `${origin.replace(/\/$/, "")}/auth/sso/callback`;
  throw new StudioSsoError("CONFIG_ERROR", "STUDIO_SSO_REDIRECT_URI missing");
}

export function validateSsoClaims(raw: unknown): SsoIdentityClaims {
  if (!raw || typeof raw !== "object") {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }
  const o = raw as Record<string, unknown>;
  const iss = String(o.iss ?? "");
  const aud = String(o.aud ?? "");
  const centralUserId = String(o.centralUserId ?? "");
  const email = String(o.email ?? "").trim().toLowerCase();
  const accountStatus = String(o.accountStatus ?? "");
  const issuedAt = String(o.issuedAt ?? "");

  const expectedIss = homecheffIdentityOrigin().replace(/\/$/, "");
  const allowedIss = new Set([
    expectedIss,
    "https://homecheff.eu",
    "https://www.homecheff.eu",
  ]);
  if (!allowedIss.has(iss.replace(/\/$/, ""))) {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }
  if (aud !== "studio") {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }
  if (!UUID_RE.test(centralUserId)) {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }
  if (!email || !email.includes("@")) {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }
  if (accountStatus !== "active") {
    throw new StudioSsoError("CENTRAL_ACCOUNT_DISABLED");
  }
  const issued = Date.parse(issuedAt);
  if (!Number.isFinite(issued) || Math.abs(Date.now() - issued) > 5 * 60_000) {
    throw new StudioSsoError("EXCHANGE_FAILED");
  }

  return {
    iss,
    aud,
    centralUserId,
    email,
    emailVerified: Boolean(o.emailVerified),
    displayName: typeof o.displayName === "string" ? o.displayName : null,
    image: typeof o.image === "string" ? o.image : null,
    accountStatus,
    issuedAt,
    ...(typeof o.ecoEpoch === "string" && UUID_RE.test(o.ecoEpoch)
      ? { ecoEpoch: o.ecoEpoch }
      : {}),
  };
}

export async function exchangeHomeCheffSsoCode(input: {
  code: string;
  codeVerifier: string;
  redirectUri?: string;
  signal?: AbortSignal;
}): Promise<SsoIdentityClaims> {
  const secret = process.env.STUDIO_SSO_CLIENT_SECRET?.trim();
  if (!secret) {
    throw new StudioSsoError("CONFIG_ERROR", "STUDIO_SSO_CLIENT_SECRET missing");
  }
  const clientId = process.env.STUDIO_SSO_CLIENT_ID?.trim();
  const redirectUri = input.redirectUri ?? studioSsoRedirectUri();
  const url = `${homecheffIdentityOrigin()}/api/identity/v1/sso/exchange`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SSO_EXCHANGE_TIMEOUT_MS);
  const signal = input.signal ?? controller.signal;

  try {
    const protectionBypass = process.env.HOMECHEFF_VERCEL_BYPASS_SECRET?.trim();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
        ...(clientId ? { "x-sso-client-id": clientId } : {}),
        ...(protectionBypass
          ? { "x-vercel-protection-bypass": protectionBypass }
          : {}),
      },
      body: JSON.stringify({
        code: input.code,
        product: "studio",
        redirectUri,
        codeVerifier: input.codeVerifier,
      }),
      signal,
      cache: "no-store",
    });

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      json = null;
    }

    if (!res.ok) {
      const code =
        json && typeof json === "object" && "code" in json
          ? String((json as { code?: string }).code)
          : undefined;
      throw new StudioSsoError(mapHomeCheffExchangeError(code));
    }

    return validateSsoClaims(json);
  } catch (err) {
    if (err instanceof StudioSsoError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new StudioSsoError("RETRY_LATER");
    }
    throw new StudioSsoError("EXCHANGE_FAILED");
  } finally {
    clearTimeout(timer);
  }
}
