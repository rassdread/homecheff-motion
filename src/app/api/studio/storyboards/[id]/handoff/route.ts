import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { createMotionHandoffPayload } from "@/server/studio/create-motion-handoff-payload";
import type { MotionHandoffPayload } from "@/types/motion-handoff-payload";

type RouteContext = { params: Promise<{ id: string }> };

export type MotionHandoffResponse = {
  payload: MotionHandoffPayload;
};

export async function GET(_request: Request, context: RouteContext) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const { id } = await context.params;
  const result = await createMotionHandoffPayload(id, user);
  if ("error" in result) {
    return NextResponse.json(
      { error: result.error.message, code: result.error.code },
      { status: result.error.httpStatus }
    );
  }

  const body: MotionHandoffResponse = { payload: result.payload };
  return NextResponse.json(body, { status: 200 });
}
