/**
 * Disposable local files for certification.
 * Production keeps the existing blob path. This helper is off when
 * NODE_ENV is production or a blob token is configured.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

export function localMediaDir(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) return null;
  const dir = process.env.STUDIO_LOCAL_MEDIA_DIR?.trim();
  if (!dir) return null;
  return path.resolve(dir);
}

export function safeLocalFileName(value: string): string {
  const cleaned = value.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
  return cleaned || "media";
}

export function allowedLocalMediaRoots(): string[] {
  if (process.env.NODE_ENV === "production") return [];
  return [process.env.STUDIO_LOCAL_MEDIA_DIR, process.env.STUDIO_SCENE_IMAGE_LOCAL_DIR]
    .filter((item): item is string => Boolean(item?.trim()))
    .map((item) => path.resolve(item));
}

/** A file URL is readable only when it sits inside a configured local root. */
export function localPathIfAllowed(value: string): string | null {
  if (!value.startsWith("file:")) return null;
  let filePath: string;
  try {
    filePath = fileURLToPath(value);
  } catch {
    return null;
  }
  const resolved = path.resolve(filePath);
  const allowed = allowedLocalMediaRoots().some(
    (root) => resolved === root || resolved.startsWith(root + path.sep),
  );
  return allowed ? resolved : null;
}
