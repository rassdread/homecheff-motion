/**
 * SP.2D-C5 — Shared HomeCheff SSO begin for Studio (PKCE + pending + HC redirect).
 * Used by /auth/sso/start and by /auth/sso/silent after silent→start hop collapse.
 */

import { NextResponse } from "next/server";
import {
  homecheffIdentityOrigin,
  studioSsoRedirectUri,
} from "@/lib/identity/sso/exchange-client";
import { codeChallengeS256, generateCodeVerifier, generateState } from "@/lib/identity/sso/pkce";
import {
  applySsoPendingCookie,
  buildSsoPending,
  encodeSsoPending,
  type SsoPendingIntent,
} from "@/lib/identity/sso/state";
import { clearSkipSilentSsoCookie } from "@/lib/identity/sso/silent-guard";

export type StudioSsoInteraction = "silent" | "select_account" | "claim";

export type BeginStudioHomeCheffSsoInput = {
  returnTo: string;
  interaction: StudioSsoInteraction;
  intent?: SsoPendingIntent;
  claimStudioUserId?: string;
  /**
   * When true (ecosystem Ontdek / interactive CTA), clear logout skip.
   * Public silent hydrate must leave skip intact (logout law).
   */
  clearSkipSilent: boolean;
  /** Optional login_hint forwarded to HC authorize (not identity proof). */
  loginHint?: string | null;
};

export type StudioSsoBeginArtifacts = {
  state: string;
  codeChallenge: string;
  encodedPending: string;
  hcAuthorizeUrl: string;
};

/** Mint PKCE + pending payload + HC authorize URL (no response yet). */
export function mintStudioHomeCheffSsoBegin(
  input: BeginStudioHomeCheffSsoInput,
): StudioSsoBeginArtifacts {
  const state = generateState();
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = codeChallengeS256(codeVerifier);
  const redirectUri = studioSsoRedirectUri();
  const intent = input.intent ?? "login";

  const pending = buildSsoPending({
    state,
    codeVerifier,
    returnTo: input.returnTo,
    intent,
    claimStudioUserId: input.claimStudioUserId,
  });
  const encodedPending = encodeSsoPending(pending);

  const start = new URL(`${homecheffIdentityOrigin()}/auth/sso/start`);
  start.searchParams.set("product", "studio");
  start.searchParams.set("redirect_uri", redirectUri);
  start.searchParams.set("state", state);
  start.searchParams.set("code_challenge", codeChallenge);
  start.searchParams.set("code_challenge_method", "S256");
  start.searchParams.set("interaction", input.interaction);
  if (input.loginHint) start.searchParams.set("login_hint", input.loginHint);

  return {
    state,
    codeChallenge,
    encodedPending,
    hcAuthorizeUrl: start.toString(),
  };
}

/**
 * Mint PKCE + state, set studio_sso_pending, 302 to HomeCheff /auth/sso/start.
 */
export function beginHomeCheffSsoRedirect(input: BeginStudioHomeCheffSsoInput): NextResponse {
  const { encodedPending, hcAuthorizeUrl } = mintStudioHomeCheffSsoBegin(input);
  const res = NextResponse.redirect(hcAuthorizeUrl, 302);
  applySsoPendingCookie(res, encodedPending);
  if (input.clearSkipSilent) {
    clearSkipSilentSsoCookie(res);
  }
  return res;
}
