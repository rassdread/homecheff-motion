import { NextResponse } from "next/server";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
import { prisma } from "@/lib/prisma";
import {
  createInstantPremiumAnimationProject,
  validateInstantPremiumCreatePayload,
} from "@/server/instant-premium/create-instant-premium-project";
import { startProjectJobs } from "@/server/animation-jobs/service";
import { requireActiveUser } from "@/server/auth/permissions";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const mode = getInstantPremiumMode();
  if (mode !== "test" && user.role !== "admin") {
    return NextResponse.json(
      {
        ok: false as const,
        error: "Direct generation is disabled in paid mode.",
        code: "PAID_MODE",
      },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false as const, error: "Invalid JSON body.", code: "INVALID_JSON" },
      { status: 400 }
    );
  }

  const validated = validateInstantPremiumCreatePayload(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false as const, error: validated.error, code: "VALIDATION_ERROR" },
      { status: validated.status }
    );
  }

  const created = await createInstantPremiumAnimationProject(user.id, validated.data);
  if (!created.ok) {
    console.info("[hc-instant-premium]", {
      mode,
      action: "generate_without_payment",
      projectId: null,
      jobTriggered: false,
    });
    const code =
      created.status === 503 ? "VIDEO_RENDERING_UNAVAILABLE" : "CREATE_FAILED";
    return NextResponse.json(
      { ok: false as const, error: created.error, code },
      { status: created.status }
    );
  }

  let jobTriggered = true;
  let transitionCount = 0;
  try {
    transitionCount = await prisma.animationTransition.count({
      where: { projectId: created.projectId },
    });
  } catch {
    transitionCount = 0;
  }
  try {
    await startProjectJobs(created.projectId);
  } catch {
    jobTriggered = false;
  }

  const projectId = String(created.projectId).trim();
  if (!projectId) {
    console.error("[hc-instant-premium]", {
      mode,
      action: "create_and_generate_empty_project_id",
      jobTriggered,
    });
    return NextResponse.json(
      {
        ok: false as const,
        error: "Project was created but returned an empty id.",
        code: "EMPTY_PROJECT_ID",
      },
      { status: 500 }
    );
  }

  const progressRoute = `/animate/instant/progress?projectId=${encodeURIComponent(projectId)}`;

  console.info("[hc-instant-premium]", {
    mode,
    action: "create_and_generate_response",
    projectId,
    progressRoute,
    jobTriggered,
    transitionCount,
  });

  return NextResponse.json(
    {
      ok: true as const,
      projectId,
      status: "started" as const,
      jobTriggered,
      progressRoute,
      ...(created.warnings && created.warnings.length > 0
        ? { warnings: created.warnings }
        : {}),
    },
    { status: 200 }
  );
}
