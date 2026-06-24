import { NextResponse } from "next/server";
import { requireActiveUser } from "@/server/auth/permissions";
import {
  analyzeAudioBufferWithFfprobe,
  audioStructureToProfile,
} from "@/server/studio/audio-ffprobe-analysis";
import { analyzeAudioBuffer } from "@/lib/studio-audio-analysis";
import { buildMusicVideoProductionPlan } from "@/lib/studio-music-video-plan";

export async function POST(request: Request) {
  const user = await requireActiveUser();
  if (user instanceof NextResponse) {
    return user;
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const extension = file.name.split(".").pop()?.toLowerCase() ?? "mp3";
  const buffer = Buffer.from(await file.arrayBuffer());

  const structure = await analyzeAudioBufferWithFfprobe({ buffer, extension });
  const audioProfile = structure
    ? audioStructureToProfile(structure, extension)
    : analyzeAudioBuffer({ buffer, extension });

  const musicVideoPlan = buildMusicVideoProductionPlan({ audioProfile });

  return NextResponse.json({
    audioProfile,
    structure,
    musicVideoPlan,
    analysisMethod: structure ? "ffprobe" : "heuristic",
  });
}
