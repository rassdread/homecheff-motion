import {
  resolvePublicBlobUrlByPathname,
  uploadPublicBlob,
} from "@/lib/vercel-blob-config";
import type {
  UserGeneratedReferenceManifest,
  UserGeneratedReferenceRecord,
} from "@/types/studio-user-generated-reference-library";

function manifestPathname(ownerId: string): string {
  return `studio/${ownerId}/wizard-references/manifest.json`;
}

export async function readUserGeneratedReferenceManifest(
  ownerId: string
): Promise<UserGeneratedReferenceManifest> {
  const pathname = manifestPathname(ownerId);
  const url = await resolvePublicBlobUrlByPathname(pathname);
  if (!url) {
    return { version: 1, ownerId, updatedAt: new Date().toISOString(), references: [] };
  }
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      return { version: 1, ownerId, updatedAt: new Date().toISOString(), references: [] };
    }
    const raw = (await res.json()) as UserGeneratedReferenceManifest;
    if (raw?.version !== 1 || !Array.isArray(raw.references)) {
      return { version: 1, ownerId, updatedAt: new Date().toISOString(), references: [] };
    }
    return {
      version: 1,
      ownerId,
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
      references: raw.references.filter(
        (r) => r && typeof r.generationId === "string" && typeof r.referenceImageUrl === "string"
      ),
    };
  } catch {
    return { version: 1, ownerId, updatedAt: new Date().toISOString(), references: [] };
  }
}

async function writeManifest(manifest: UserGeneratedReferenceManifest): Promise<void> {
  const pathname = manifestPathname(manifest.ownerId);
  await uploadPublicBlob({
    pathname,
    body: Buffer.from(JSON.stringify({ ...manifest, updatedAt: new Date().toISOString() }), "utf8"),
    contentType: "application/json",
    allowOverwrite: true,
    context: {
      uploadTarget: pathname,
      provider: "studio_generated_reference_manifest",
    },
  });
}

export async function registerUserGeneratedReference(
  record: UserGeneratedReferenceRecord
): Promise<UserGeneratedReferenceRecord> {
  const manifest = await readUserGeneratedReferenceManifest(record.ownerId);
  const existingIdx = manifest.references.findIndex(
    (r) => r.generationId === record.generationId
  );
  if (existingIdx >= 0) {
    manifest.references[existingIdx] = { ...manifest.references[existingIdx], ...record };
  } else {
    manifest.references.unshift(record);
  }
  manifest.references = manifest.references.slice(0, 200);
  await writeManifest(manifest);
  return record;
}

export async function listUserGeneratedReferenceManifest(
  ownerId: string
): Promise<UserGeneratedReferenceRecord[]> {
  const manifest = await readUserGeneratedReferenceManifest(ownerId);
  return manifest.references;
}
