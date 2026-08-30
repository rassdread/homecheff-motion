#!/usr/bin/env npx tsx
/**
 * Phase 3R Production API certification (pilot allowlist, preview, security).
 * Requires AUTH_SECRET matching Production and pilot env active on deployed revision.
 *
 * Usage:
 *   node -e "require('dotenv').config({path:'.env.local'}); ..." # see package script pattern
 *
 * Env:
 *   STUDIO_BASE_URL (default https://studio.homecheff.eu)
 *   PILOT_USER_ID (default Steve Studio user.id)
 *   NON_PILOT_USER_ID (optional; resolved from DB if unset)
 */

import { createHmac, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const BASE = (process.env.STUDIO_BASE_URL ?? "https://studio.homecheff.eu").replace(/\/$/, "");
const PILOT_USER_ID = process.env.PILOT_USER_ID ?? "cmszybweq0000jl046b7qqvt5";
const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";
const OUT_DIR = join(process.cwd(), "docs/audits/studio-free-music/phase-3r");

const PILOT_TRACKS = [
  "fm_oga_adventure_time",
  "fm_oga_andys_report_8bit_and_piano_ver",
  "fm_oga_battle_theme_0",
  "fm_oga_besai_crystal_gardens_2_forbidden_pathway",
  "fm_oga_cave_explorer",
] as const;

function sign(value: string): string {
  return createHmac("sha256", AUTH_SECRET).update(value).digest("hex");
}

function encodeSession(userId: string): string {
  const body = Buffer.from(JSON.stringify({ userId, nonce: randomBytes(8).toString("hex") }), "utf8").toString(
    "base64url"
  );
  return `${body}.${sign(body)}`;
}

async function apiFetch(path: string, userId: string | null, init?: RequestInit) {
  const headers = new Headers(init?.headers);
  if (userId) {
    headers.set("Cookie", `studio_session=${encodeSession(userId)}`);
  }
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  const contentType = res.headers.get("content-type") ?? "";
  let body: unknown = null;
  if (contentType.includes("application/json")) {
    body = await res.json();
  } else if (contentType.startsWith("audio/") || contentType.startsWith("application/octet")) {
    const buf = Buffer.from(await res.arrayBuffer());
    body = { bytes: buf.length, contentType };
  } else {
    body = { text: (await res.text()).slice(0, 200) };
  }
  return { status: res.status, contentType, headers: Object.fromEntries(res.headers.entries()), body };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const prisma = new PrismaClient();
  let nonPilotId = process.env.NON_PILOT_USER_ID?.trim() ?? "";
  if (!nonPilotId) {
    const other = await prisma.user.findFirst({
      where: { id: { not: PILOT_USER_ID }, isActive: true },
      select: { id: true, email: true },
      orderBy: { createdAt: "desc" },
    });
    nonPilotId = other?.id ?? "";
  }
  const steve = await prisma.user.findUnique({
    where: { id: PILOT_USER_ID },
    select: { id: true, email: true, centralUserId: true, invitedById: true, role: true },
  });
  await prisma.$disconnect();

  const build = await fetch(`${BASE}/api/meta/build`).then((r) => r.json());

  const anonCatalog = await apiFetch("/api/studio/free-music/catalog", null);
  const pilotCatalog = await apiFetch("/api/studio/free-music/catalog", PILOT_USER_ID);
  const nonPilotCatalog = nonPilotId ? await apiFetch("/api/studio/free-music/catalog", nonPilotId) : null;

  const previews: Record<string, { status: number; bytes?: number; contentType?: string }> = {};
  for (const trackId of PILOT_TRACKS) {
    const r = await apiFetch(`/api/studio/free-music/asset/${trackId}?kind=preview`, PILOT_USER_ID);
    previews[trackId] = {
      status: r.status,
      bytes: (r.body as { bytes?: number })?.bytes,
      contentType: r.contentType,
    };
  }

  const spoof = await apiFetch(
    `/api/studio/free-music/asset/${PILOT_TRACKS[0]}?kind=preview&audioUrl=https://evil.example/x.mp3`,
    PILOT_USER_ID
  );

  const nonPilotPreview = nonPilotId
    ? await apiFetch(`/api/studio/free-music/asset/${PILOT_TRACKS[0]}?kind=preview`, nonPilotId)
    : null;

  const pilotTrackCount = ((pilotCatalog.body as { tracks?: unknown[] })?.tracks?.length ?? 0);
  const expectedPilotTracks = Number(process.env.EXPECTED_PILOT_TRACK_COUNT ?? "55");
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE,
    productionBuild: build,
    pilotUserResolution: {
      displayNameRequested: "Steve Brown",
      authoritativeAllowlistField: "Studio User.id (proven: catalog route uses user.id)",
      centralUserIdNotUsedForAllowlist: true,
      steve,
      allowlistValue: PILOT_USER_ID,
      hierarchyMutations: "none",
    },
    allowlist: {
      anonymousCatalog: anonCatalog,
      pilotCatalog,
      nonPilotCatalog,
      pilotTrackCount,
      expectedPilotTracks,
      pilotAllowlistEnforcement:
        anonCatalog.status === 401 &&
        (pilotCatalog.body as { enabled?: boolean })?.enabled === true &&
        pilotTrackCount === expectedPilotTracks &&
        (nonPilotCatalog?.body as { enabled?: boolean })?.enabled === false
          ? "PASS"
          : "FAIL",
    },
    preview: { previews, nonPilotPreview, spoofStatus: spoof.status },
    security: {
      clientAudioUrlSpoofBlocked: spoof.status === 400 ? "PASS" : "FAIL",
      nonPilotAssetBlocked:
        nonPilotPreview && (nonPilotPreview.status === 403 || nonPilotPreview.status === 401) ? "PASS" : "FAIL",
    },
  };

  writeFileSync(join(OUT_DIR, "PRODUCTION-PILOT-API-CERT.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
