import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  FULL_RERENDER_ALREADY_RUNNING,
  FULL_RERENDER_FORBIDDEN,
  FULL_RERENDER_NOT_READY,
  FULL_RERENDER_WRONG_TYPE,
  fullRerenderInstantPremiumProjectWithStatus,
} from "@/server/instant-premium/full-rerender-project";
import { persistFullRerenderSettingsForProject } from "@/server/instant-premium/persist-full-rerender-settings";

export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  type FullRerenderBody = {
    sceneTexts?: unknown;
    instantUserIntent?: string;
    instantTransitionSeconds?: number;
    instantSelectedChips?: unknown;
    versionNote?: string;
  };
  let body: FullRerenderBody | null = null;
  try {
    body = (await request.json().catch(() => null)) as FullRerenderBody | null;
  } catch {
    body = null;
  }

  if (body) {
    const persisted = await persistFullRerenderSettingsForProject(id, body);
    if (!persisted.ok) {
      return NextResponse.json({ error: persisted.error }, { status: persisted.status });
    }
  }

  try {
    const result = await fullRerenderInstantPremiumProjectWithStatus({
      projectId: id,
      userId: user.id,
      isAdmin: user.role === "admin",
      sceneTexts: body?.sceneTexts,
      versionNote: body?.versionNote?.trim() || undefined,
    });
    const httpStatus = result.fullRerender.ok
      ? 200
      : result.fullRerender.code === FULL_RERENDER_ALREADY_RUNNING
        ? 409
        : result.fullRerender.code === FULL_RERENDER_FORBIDDEN
          ? 403
          : result.fullRerender.code === FULL_RERENDER_WRONG_TYPE
            ? 409
            : result.fullRerender.code === FULL_RERENDER_NOT_READY
              ? 400
              : 400;
    return NextResponse.json(
      {
        fullRerender: result.fullRerender,
        status: result.status,
      },
      { status: httpStatus }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Full rerender failed." },
      { status: 500 }
    );
  }
}
