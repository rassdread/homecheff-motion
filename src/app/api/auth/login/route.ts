import { NextResponse } from "next/server";
import { isCentralSsoLive } from "@/lib/identity/flags";
import { callMarketplaceLegacyMigrate } from "@/lib/identity/legacy-migrate-client";
import { homecheffIdentityOrigin } from "@/lib/identity/sso/exchange-client";
import { prisma } from "@/lib/prisma";
import { apiServiceUnavailable } from "@/server/api-error-response";
import { isDisposableLocalBrowserRequest } from "@/server/auth/disposable-local-auth";
import {
  canUsePreviewLocalPasswordLogin,
  decidePreviewLocalCredentials,
  isTrustedPreviewLoginOrigin,
  PREVIEW_LOCAL_INVALID_CREDENTIALS,
} from "@/server/auth/preview-local-auth";
import { createSession, verifyPassword } from "@/server/auth/session";

type LoginPayload = {
  email?: string;
  password?: string;
  returnTo?: string;
};

/**
 * Isolated Preview password login. Runs only when the server flag, the trusted
 * Preview deployment, and the central-identity gates all allow it.
 */
async function previewLocalPasswordLogin(request: Request): Promise<NextResponse> {
  if (!isTrustedPreviewLoginOrigin(request.headers.get("origin"))) {
    return NextResponse.json({ error: "Forbidden.", code: "UNTRUSTED_ORIGIN" }, { status: 403 });
  }

  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login", error);
  }

  const decision = decidePreviewLocalCredentials({ email, password, user });
  if (decision.kind === "invalid_credentials") {
    return NextResponse.json(PREVIEW_LOCAL_INVALID_CREDENTIALS, { status: 401 });
  }
  if (decision.kind === "inactive") {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 },
    );
  }
  if (decision.kind !== "session") {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }

  try {
    await createSession(decision.userId);
  } catch (error) {
    return apiServiceUnavailable("auth/login:createSession", error);
  }

  return NextResponse.json(
    { user: { id: decision.userId, email: decision.email } },
    { status: 200 },
  );
}

/**
 * Password login for the named disposable local database.
 * It never migrates the account and never clears the password hash.
 */
async function disposableLocalPasswordLogin(request: Request): Promise<NextResponse> {
  let payload: LoginPayload;
  try {
    payload = (await request.json()) as LoginPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const email = payload.email?.trim().toLowerCase() ?? "";
  const password = payload.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true, isActive: true },
    });
  } catch (error) {
    return apiServiceUnavailable("auth/login", error);
  }
  const decision = decidePreviewLocalCredentials({ email, password, user });
  if (decision.kind === "invalid_credentials") {
    return NextResponse.json(PREVIEW_LOCAL_INVALID_CREDENTIALS, { status: 401 });
  }
  if (decision.kind === "inactive") {
    return NextResponse.json(
      { error: "Account is disabled.", code: "USER_INACTIVE" },
      { status: 403 },
    );
  }
  if (decision.kind !== "session") {
    return NextResponse.json(
      { error: "Invalid credentials.", code: "MISSING_CREDENTIALS" },
      { status: 400 },
    );
  }
  try {
    await createSession(decision.userId);
  } catch (error) {
    return apiServiceUnavailable("auth/login:createSession", error);
  }
  return NextResponse.json({ user: { id: decision.userId, email: decision.email } }, { status: 200 });
}

/**
 * Legacy Studio credential → canonical HomeCheff JIT migration when SSO is live.
 * Isolated Preview may use local password login only through the server gate above.
 * Disposable local login is a separate explicit gate and does not run on Vercel.
 */
export async function POST(request: Request) {
  if (canUsePreviewLocalPasswordLogin()) {
    return previewLocalPasswordLogin(request);
  }
  if (isDisposableLocalBrowserRequest(request)) {
    return disposableLocalPasswordLogin(request);
  }

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
