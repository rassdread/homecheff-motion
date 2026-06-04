import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  getInstantProjectForDraftEnsure,
  verifyInstantProjectDraftAccess,
} from "@/server/instant-premium/full-rerender-draft-access";
import {
  deleteFullRerenderDraft,
  ensureFullRerenderDraftForProject,
  getFullRerenderDraftMeta,
  upsertFullRerenderDraft,
} from "@/server/instant-premium/full-rerender-draft-service";
import { parseFullRerenderDraftPayload } from "@/lib/full-rerender-draft";
import {
  fullRerenderDraftErrorResponse,
  logFullRerenderDraftError,
} from "@/server/instant-premium/full-rerender-draft-route-utils";

export const maxDuration = 30;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  let projectId = "";
  let userId = "anonymous";
  try {
    const { id } = await context.params;
    projectId = id;
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    userId = user.id;

    const access = await verifyInstantProjectDraftAccess(id, user);
    if (!("ok" in access)) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    const meta = await getFullRerenderDraftMeta(id);
    return NextResponse.json({
      ok: true,
      draft: meta?.draft ?? null,
      updatedAt: meta?.updatedAt ?? null,
    });
  } catch (error) {
    logFullRerenderDraftError({ method: "GET", projectId, userId, error });
    return fullRerenderDraftErrorResponse(error, "Could not load concept.");
  }
}

export async function PUT(request: Request, context: RouteContext) {
  let projectId = "";
  let userId = "anonymous";
  try {
    const { id } = await context.params;
    projectId = id;
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    userId = user.id;

    const access = await verifyInstantProjectDraftAccess(id, user);
    if (!("ok" in access)) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const payload = parseFullRerenderDraftPayload(
      body && typeof body === "object" && "payload" in (body as object)
        ? (body as { payload: unknown }).payload
        : body
    );
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Invalid draft payload." }, { status: 400 });
    }

    const result = await upsertFullRerenderDraft(id, payload);
    return NextResponse.json({ ok: true, updatedAt: result.updatedAt });
  } catch (error) {
    logFullRerenderDraftError({ method: "PUT", projectId, userId, error });
    return fullRerenderDraftErrorResponse(error, "Could not save concept.");
  }
}

export async function POST(_request: Request, context: RouteContext) {
  let projectId = "";
  let userId = "anonymous";
  try {
    const { id } = await context.params;
    projectId = id;
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    userId = user.id;

    const project = await getInstantProjectForDraftEnsure(id, user);
    if (!project) {
      return NextResponse.json({ ok: false, error: "Project not found." }, { status: 404 });
    }

    const draft = await ensureFullRerenderDraftForProject(project);
    const meta = await getFullRerenderDraftMeta(id);

    return NextResponse.json({
      ok: true,
      draft,
      updatedAt: meta?.updatedAt ?? null,
    });
  } catch (error) {
    logFullRerenderDraftError({ method: "POST", projectId, userId, error });
    return fullRerenderDraftErrorResponse(error, "Could not create concept.");
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  let projectId = "";
  let userId = "anonymous";
  try {
    const { id } = await context.params;
    projectId = id;
    const user = await requireActiveUser();
    if (user instanceof NextResponse) {
      return user;
    }
    userId = user.id;

    const access = await verifyInstantProjectDraftAccess(id, user);
    if (!("ok" in access)) {
      return NextResponse.json({ ok: false, error: access.error }, { status: access.status });
    }

    await deleteFullRerenderDraft(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logFullRerenderDraftError({ method: "DELETE", projectId, userId, error });
    return fullRerenderDraftErrorResponse(error, "Could not delete concept.");
  }
}
