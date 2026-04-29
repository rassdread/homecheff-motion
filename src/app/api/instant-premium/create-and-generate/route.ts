import { NextResponse } from "next/server";
import { getInstantPremiumMode } from "@/lib/instant-premium-mode";
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
  if (mode !== "test") {
    return NextResponse.json(
      { error: "Direct generation is disabled in paid mode." },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const validated = validateInstantPremiumCreatePayload(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }

  const created = await createInstantPremiumAnimationProject(user.id, validated.data);
  if (!created.ok) {
    console.info("[hc-instant-premium]", {
      mode,
      action: "generate_without_payment",
      projectId: null,
      jobTriggered: false,
    });
    return NextResponse.json({ error: created.error }, { status: created.status });
  }

  let jobTriggered = true;
  try {
    await startProjectJobs(created.projectId);
  } catch {
    jobTriggered = false;
  }

  console.info("[hc-instant-premium]", {
    mode,
    action: "generate_without_payment",
    projectId: created.projectId,
    jobTriggered,
  });

  return NextResponse.json(
    {
      projectId: created.projectId,
      status: "started",
      jobTriggered,
    },
    { status: 200 }
  );
}
