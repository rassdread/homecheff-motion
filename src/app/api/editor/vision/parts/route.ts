import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import { analyzeIllustrationParts } from "@/server/editor/illustration-part-analysis";
import type { AssetVisionAnalysis } from "@/types/studio-asset-vision-analysis";
import type { ObjectDetection } from "@/server/animation-export/local-vision/object-detector-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  let body: {
    imageUrl?: string;
    vision?: AssetVisionAnalysis;
    detections?: ObjectDetection[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl || !body.vision) {
    return NextResponse.json({ error: "imageUrl and vision are required." }, { status: 400 });
  }

  const analysis = await analyzeIllustrationParts({
    imageUrl,
    vision: body.vision,
    detections: body.detections ?? [],
  });

  return NextResponse.json({ ok: true, analysis });
}
