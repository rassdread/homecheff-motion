import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  UserVoiceCloneManifest,
  UserVoiceCloneRecord,
} from "@/types/studio-user-voice-library";

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/voice-clones/manifest.json`;
}

export async function readUserVoiceCloneManifest(
  ownerId: string
): Promise<UserVoiceCloneManifest> {
  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return {
      version: 1,
      ownerId,
      updatedAt: new Date().toISOString(),
      clones: [],
    };
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return {
        version: 1,
        ownerId,
        updatedAt: new Date().toISOString(),
        clones: [],
      };
    }
    const raw = (await res.json()) as UserVoiceCloneManifest;
    if (raw?.version !== 1 || !Array.isArray(raw.clones)) {
      return {
        version: 1,
        ownerId,
        updatedAt: new Date().toISOString(),
        clones: [],
      };
    }
    return {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      clones: raw.clones.filter((c) => c && typeof c.cloneId === "string"),
    };
  } catch {
    return {
      version: 1,
      ownerId,
      updatedAt: new Date().toISOString(),
      clones: [],
    };
  }
}

async function writeUserVoiceCloneManifest(manifest: UserVoiceCloneManifest): Promise<void> {
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify(manifest), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_voice_clone_manifest",
    },
  });
}

export async function upsertUserVoiceCloneRecord(params: {
  ownerId: string;
  record: UserVoiceCloneRecord;
}): Promise<UserVoiceCloneRecord> {
  const manifest = await readUserVoiceCloneManifest(params.ownerId);
  const existingIndex = manifest.clones.findIndex((c) => c.cloneId === params.record.cloneId);
  const clones = [...manifest.clones];
  if (existingIndex >= 0) {
    clones[existingIndex] = { ...clones[existingIndex], ...params.record };
  } else {
    clones.unshift(params.record);
  }
  const next: UserVoiceCloneManifest = {
    version: 1,
    ownerId: params.ownerId,
    updatedAt: new Date().toISOString(),
    clones,
  };
  await writeUserVoiceCloneManifest(next);
  return params.record;
}

export async function renameUserVoiceCloneRecord(params: {
  ownerId: string;
  cloneId: string;
  name: string;
}): Promise<UserVoiceCloneRecord | null> {
  const manifest = await readUserVoiceCloneManifest(params.ownerId);
  const index = manifest.clones.findIndex((c) => c.cloneId === params.cloneId);
  if (index < 0) {
    return null;
  }
  const updated = { ...manifest.clones[index]!, name: params.name.trim().slice(0, 120) };
  manifest.clones[index] = updated;
  manifest.updatedAt = new Date().toISOString();
  await writeUserVoiceCloneManifest(manifest);
  return updated;
}
