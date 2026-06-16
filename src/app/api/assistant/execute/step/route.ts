import { NextResponse } from "next/server";
import { buildAssistantExecutionPlan } from "@/lib/assistant-execution-plan-builder";
import {
  executeAssistantPlanSequential,
  executeAssistantPlanStep,
} from "@/server/assistant/assistant-tool-executor";
import type { AssistantExecutionPlan } from "@/types/assistant-tool-execution";
import type { AssistantPrefillPackage } from "@/types/assistant-prefill";

export const runtime = "nodejs";

type StepBody = {
  plan?: AssistantExecutionPlan;
  prefillPackage?: AssistantPrefillPackage;
  stepId?: string;
  confirmed?: boolean;
  runAll?: boolean;
  libraryAssetNames?: Record<string, { assetName: string; assetUrl: string; thumbnailUrl?: string | null }>;
};

export async function POST(request: Request) {
  let body: StepBody;
  try {
    body = (await request.json()) as StepBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let plan = body.plan;
  if (!plan && body.prefillPackage) {
    plan =
      buildAssistantExecutionPlan({
        pkg: body.prefillPackage,
        confirmed: true,
      }) ?? undefined;
  }

  if (!plan) {
    return NextResponse.json({ error: "execution plan is required" }, { status: 400 });
  }

  const confirmed = Boolean(body.confirmed);

  if (body.runAll) {
    const outcome = executeAssistantPlanSequential(plan, {
      confirmed,
      libraryAssetNames: body.libraryAssetNames,
      stopOnReview: true,
    });
    return NextResponse.json({
      plan: outcome.plan,
      results: outcome.results,
      providerCalls: 0,
      creditsConsumed: 0,
    });
  }

  const stepId = body.stepId?.trim();
  if (!stepId) {
    return NextResponse.json({ error: "stepId is required unless runAll is true" }, { status: 400 });
  }

  const result = executeAssistantPlanStep({
    plan,
    stepId,
    confirmed,
    libraryAssetNames: body.libraryAssetNames,
  });

  return NextResponse.json({
    result,
    plan: {
      ...plan,
      steps: plan.steps.map((step) => (step.id === result.stepId ? result.step : step)),
    },
    providerCalls: 0,
    creditsConsumed: 0,
  });
}
