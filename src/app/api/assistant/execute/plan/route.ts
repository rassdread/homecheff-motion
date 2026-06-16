import { NextResponse } from "next/server";
import { buildAssistantExecutionPlan } from "@/lib/assistant-execution-plan-builder";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

export const runtime = "nodejs";

type PlanBody = {
  prefillPackage?: AssistantPrefillPackage;
  confirmed?: boolean;
  activeProject?: { id: string; title?: string } | null;
};

export async function POST(request: Request) {
  let body: PlanBody;
  try {
    body = (await request.json()) as PlanBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const pkg = body.prefillPackage;
  if (!pkg || pkg.version !== 1) {
    return NextResponse.json({ error: "prefillPackage is required" }, { status: 400 });
  }

  const plan = buildAssistantExecutionPlan({
    pkg,
    activeProjectId: body.activeProject?.id ?? null,
    confirmed: Boolean(body.confirmed),
  });

  if (!plan) {
    return NextResponse.json({ error: "Could not build execution plan" }, { status: 422 });
  }

  return NextResponse.json({
    plan,
    providerCalls: 0,
    creditsConsumed: 0,
  });
}
