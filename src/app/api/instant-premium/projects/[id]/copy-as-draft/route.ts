import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  COPY_AS_DRAFT_FORBIDDEN,
  COPY_AS_DRAFT_NOT_READY,
  COPY_AS_DRAFT_WRONG_TYPE,
  copyInstantPremiumProjectAsDraft,
} from "@/server/instant-premium/copy-project-as-draft";

export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    sourceLanguage?: string;
    sourceVersion?: number;
  } = {};
  try {
    const raw = await request.json();
    if (raw && typeof raw === "object") {
      body = raw as typeof body;
    }
  } catch {
    /* empty body is fine */
  }

  const result = await copyInstantPremiumProjectAsDraft({
    sourceProjectId: id,
    userId: user.id,
    isAdmin: user.role === "admin",
    sourceLanguage: body.sourceLanguage,
    sourceVersion: body.sourceVersion,
  });

  if (!result.ok) {
    const status =
      result.code === COPY_AS_DRAFT_FORBIDDEN
        ? 403
        : result.code === COPY_AS_DRAFT_WRONG_TYPE
          ? 409
          : result.code === COPY_AS_DRAFT_NOT_READY
            ? 400
            : 400;
    return NextResponse.json(
      { ok: false, code: result.code, error: result.message, copyAsDraft: result },
      { status }
    );
  }

  return NextResponse.json({
    ok: true,
    copyAsDraft: result,
    draftProjectId: result.draftProjectId,
    sourceProjectId: result.sourceProjectId,
    editVersionPath: result.editVersionPath,
  });
}
