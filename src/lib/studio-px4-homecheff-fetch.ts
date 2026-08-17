/**
 * PX.4 — Studio server → HomeCheff owner projection (HMAC, not query PII).
 */

import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";
import {
  isPx4OpaqueId,
  isPx4SourceType,
  normalizeStudioSourceContext,
  signStudioSourceContextRequest,
  type Px4ResolveResult,
  type Px4SourceType,
} from "@/lib/studio-px4-source-context";

export const PX4_HOMECHEFF_FETCH_TIMEOUT_MS = 8_000;

function studioContextSecrets(): string[] {
  return [
    process.env.STUDIO_SSO_CLIENT_SECRET?.trim() ?? "",
    process.env.STUDIO_SSO_CLIENT_SECRET_PREVIOUS?.trim() ?? "",
  ].filter(Boolean);
}

export async function fetchHomecheffOwnerSourceContext(input: {
  centralUserId: string;
  sourceType: string;
  sourceId: string;
  signal?: AbortSignal;
}): Promise<Px4ResolveResult> {
  if (!input.centralUserId.trim()) return { ok: false, reason: "unauthenticated" };
  if (!isPx4SourceType(input.sourceType) || !isPx4OpaqueId(input.sourceId)) {
    return { ok: false, reason: "invalid" };
  }

  const secret = studioContextSecrets()[0];
  if (!secret) return { ok: false, reason: "unresolved" };

  let origin: string;
  try {
    origin = homecheffIdentityOrigin();
  } catch {
    return { ok: false, reason: "unresolved" };
  }

  const timestampSec = Math.floor(Date.now() / 1000);
  const sourceType: Px4SourceType = input.sourceType;
  const signature = signStudioSourceContextRequest({
    secret,
    timestampSec,
    centralUserId: input.centralUserId,
    sourceType,
    sourceId: input.sourceId,
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PX4_HOMECHEFF_FETCH_TIMEOUT_MS);
  const signal = input.signal ?? controller.signal;
  const clientId = process.env.STUDIO_SSO_CLIENT_ID?.trim();
  const protectionBypass = process.env.HOMECHEFF_VERCEL_BYPASS_SECRET?.trim();
  const url = `${origin}/api/internal/studio/source-context?type=${encodeURIComponent(sourceType)}&id=${encodeURIComponent(input.sourceId)}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-studio-context-timestamp": String(timestampSec),
        "x-studio-context-signature": signature,
        "x-studio-central-user-id": input.centralUserId,
        ...(clientId ? { "x-sso-client-id": clientId } : {}),
        ...(protectionBypass ? { "x-vercel-protection-bypass": protectionBypass } : {}),
      },
      cache: "no-store",
      signal,
    });

    if (!res.ok) return { ok: false, reason: "unresolved" };

    let json: unknown = null;
    try {
      json = await res.json();
    } catch {
      return { ok: false, reason: "unresolved" };
    }

    const payload =
      json && typeof json === "object" && "context" in json
        ? (json as { context: Record<string, unknown> }).context
        : json && typeof json === "object"
          ? (json as Record<string, unknown>)
          : null;
    if (!payload) return { ok: false, reason: "unresolved" };

    const context = normalizeStudioSourceContext({
      sourceType,
      sourceId: input.sourceId,
      title: payload.title,
      description: payload.description,
      media: payload.media,
      category: payload.category,
      sellerDisplayName: payload.sellerDisplayName,
      returnTarget: payload.returnTarget,
    });
    if (!context) return { ok: false, reason: "unresolved" };
    return { ok: true, context };
  } catch {
    return { ok: false, reason: "unresolved" };
  } finally {
    clearTimeout(timer);
  }
}
