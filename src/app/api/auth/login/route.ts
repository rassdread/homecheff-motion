import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { callMarketplaceLegacyMigrate } from "@/lib/identity/legacy-migrate-client";
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";
import { prisma } from "@/lib/prisma";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { verifyPassword, applyStudioSessionToResponse } from "@/server/auth/session";
import { shouldUsePreviewHostPasswordLogin } from "@/lib/preview-navigation-origin";

type LoginPayload = {
  email?: string;
  password?: string;
  returnTo?: string;
};

/**
 * Legacy Studio credential → canonical HomeCheff JIT migration when SSO is live.
 */
export async function POST(request: Request) {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  const returnTo =
    typeof payload.returnTo === "string" && payload.returnTo.startsWith("/")
      ? payload.returnTo
      : "/";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }

  if (!isCentralSsoLive()) {
    if (shouldUsePreviewHostPasswordLogin({ vercelEnv: process.env.VERCEL_ENV, centralSsoLive: false })) {
      return previewHostPasswordLogin(email, password);
    }
    return NextResponse.json(
      { error: "Legacy login disabled.", code: "LEGACY_LOGIN_DISABLED" },
      { status: 403 },
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isActive: true,
        centralUserId: true,
      },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login", error);
  }

  if (!user) {
    const idp = `${homecheffIdentityOrigin()}/login?intent=password&email=${encodeURIComponent(email)}`;
    return NextResponse.json(
      {
        code: "CANONICAL_LOGIN_REQUIRED",
        requiresCanonicalLogin: true,
        idpLoginUrl: idp,
      },
      { status: 409 },
    );
  }

  if (user.isActive === false) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 },
    );
  }

  if (!user.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "WRONG_PASSWORD" },
      { status: 401 },
    );
  }

  const migrated = await callMarketplaceLegacyMigrate({
    sourceUserId: user.id,
    email: user.email,
    passwordPlaintext: password,
    returnTo,
  });

  if (!migrated.ok) {
    if (migrated.code === "AMBIGUOUS") {
      return NextResponse.json(
        { error: "Account requires manual linking.", code: "MIGRATION_AMBIGUOUS" },
        { status: 409 },
      );
    }
    const idp = `${homecheffIdentityOrigin()}/login?intent=password&email=${encodeURIComponent(email)}`;
    return NextResponse.json(
      {
        code: "CANONICAL_LOGIN_REQUIRED",
        requiresCanonicalLogin: true,
        idpLoginUrl: idp,
        migrateError: migrated.code,
      },
      { status: 409 },
    );
  }

  if (user.centralUserId && user.centralUserId !== migrated.centralUserId) {
    return NextResponse.json(
      { error: "Account requires manual linking.", code: "MIGRATION_AMBIGUOUS" },
      { status: 409 },
    );
  }

  try {
    if (!user.centralUserId) {
      await prisma.user.updateMany({
        where: { id: user.id, centralUserId: null },
        data: {
          centralUserId: migrated.centralUserId,
          centralLinkedAt: new Date(),
        },
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: null },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login:link", error);
  }

  return NextResponse.json({
    ok: true,
    code: "LEGACY_MIGRATION_CONTINUE",
    migrating: true,
    message:
      "Je bestaande HomeCheff Studio-account wordt bijgewerkt naar één HomeCheff-account.",
    migrateUrl: migrated.redeemUrl,
    centralUserId: migrated.centralUserId,
    outcome: migrated.outcome,
  });
}

/**
 * Preview-only host session. Production SSO login is unchanged.
 * Does not migrate, clear the password, or write the wallet.
 */
async function previewHostPasswordLogin(email: string, password: string) {
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, passwordHash: true, isActive: true, centralUserId: true },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login", error);
  }
  if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "WRONG_PASSWORD" },
      { status: 401 },
    );
  }
  if (user.isActive === false) {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 },
    );
  }
  const res = NextResponse.json({ ok: true });
  applyStudioSessionToResponse(res, user.id, {
    centralUserId: user.centralUserId ?? undefined,
  });
  return res;
}
