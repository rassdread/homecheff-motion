import { NextResponse } from "next/server";
import { ocrUserMessage } from "@/lib/ocr-provider-errors";
import { requireAdmin } from "@/server/auth/permissions";
import { getOcrHealthSnapshot, runOcrHealthCheck } from "@/server/image-text-detection/ocr-health";

export const dynamic = "force-dynamic";

/** Admin-only OCR provider configuration health (no API keys in response). */
export async function GET(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  const snapshot = getOcrHealthSnapshot();
  const runCheck = new URL(request.url).searchParams.get("check") === "1";

  if (!runCheck) {
    return NextResponse.json(snapshot, { status: snapshot.ok ? 200 : 503 });
  }

  const check = await runOcrHealthCheck();
  const checkedAt = new Date().toISOString();
  if (!check.ok && check.errorCode) {
    return NextResponse.json(
      {
        ...snapshot,
        ok: false,
        checkedAt,
        errors: [...snapshot.errors, ocrUserMessage(check.errorCode)],
        checkOk: false,
        checkErrorCode: check.errorCode,
      },
      { status: snapshot.ok ? 502 : 503 }
    );
  }

  return NextResponse.json({
    ...snapshot,
    ok: snapshot.ok && check.ok,
    checkedAt,
    checkOk: check.ok,
  });
}
