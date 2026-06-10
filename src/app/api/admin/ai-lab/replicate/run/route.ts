import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/permissions";
import { isReplicateConfigured } from "@/server/admin/replicate-client";
import { bufferToDataUri, runSam3SegmentationTest } from "@/server/admin/replicate-sam3-seg";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Admin-only SAM3 segmentation test via Replicate. */
export async function POST(request: Request) {
  const gate = await requireAdmin();
  if (gate instanceof NextResponse) {
    return gate;
  }

  if (!isReplicateConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Replicate is not configured" },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  const imageEntry = formData.get("image");
  const promptRaw = formData.get("prompt");
  const prompt = typeof promptRaw === "string" ? promptRaw.trim() : "person";

  if (!(imageEntry instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  if (imageEntry.size < 100 || imageEntry.size > MAX_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  const mimeType = imageEntry.type || "image/jpeg";
  if (!ALLOWED_MIME.has(mimeType)) {
    return NextResponse.json(
      { ok: false, error: "Replicate could not process this image." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await imageEntry.arrayBuffer());
  const imageDataUri = bufferToDataUri(buffer, mimeType);

  const testRes = await runSam3SegmentationTest({ imageDataUri, prompt });
  if (!testRes.ok) {
    const status =
      testRes.error === "Model unavailable." ||
      testRes.error === "Billing may not be configured."
        ? 502
        : 422;
    return NextResponse.json({ ok: false, error: testRes.error }, { status });
  }

  return NextResponse.json({
    ok: true,
    result: testRes.result,
    raw: testRes.result.raw,
  });
}
