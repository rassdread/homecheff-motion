/**
 * Disposable local files for certification.
 * Production keeps the existing blob path. This helper is off when
 * NODE_ENV is production or a blob token is configured.
 */

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
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

export type CertifiedLocalFile = {
  id: string;
  ownerId: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
  fileName: string;
};

function certifiedDir(): string | null {
  const dir = localMediaDir();
  return dir ? path.join(dir, "certified") : null;
}

export function certifiedLocalBrowserPath(id: string): string {
  return `/api/studio/local-media/${id}`;
}

export function certifiedLocalMediaId(value: string): string | null {
  if (!value) return null;
  try {
    const url = value.startsWith("/") ? new URL(value, "http://127.0.0.1") : new URL(value);
    const match = url.pathname.match(/^\/api\/studio\/local-media\/([0-9a-f-]{36})$/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export async function writeCertifiedLocalFile(input: {
  ownerId: string;
  body: Buffer;
  mimeType: string;
  fileName: string;
  width?: number | null;
  height?: number | null;
}): Promise<{ record: CertifiedLocalFile; browserPath: string; absolutePath: string } | null> {
  const dir = certifiedDir();
  if (!dir || !input.ownerId || input.body.length === 0) return null;
  await mkdir(dir, { recursive: true });
  const id = randomUUID();
  const record: CertifiedLocalFile = {
    id,
    ownerId: input.ownerId,
    mimeType: input.mimeType || "application/octet-stream",
    bytes: input.body.length,
    width: input.width ?? null,
    height: input.height ?? null,
    fileName: safeLocalFileName(input.fileName),
  };
  const absolutePath = path.join(dir, id);
  await writeFile(absolutePath, input.body);
  await writeFile(path.join(dir, `${id}.json`), JSON.stringify(record));
  return { record, browserPath: certifiedLocalBrowserPath(id), absolutePath };
}

export function readCertifiedLocalFile(id: string): { record: CertifiedLocalFile; absolutePath: string } | null {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const dir = certifiedDir();
  if (!dir) return null;
  const absolutePath = path.resolve(dir, id);
  const root = path.resolve(dir);
  if (absolutePath !== path.join(root, id)) return null;
  try {
    const record = JSON.parse(readFileSync(path.join(dir, `${id}.json`), "utf8")) as CertifiedLocalFile;
    if (record.id !== id || !record.ownerId || record.ownerId.trim() !== record.ownerId) return null;
    return { record, absolutePath };
  } catch {
    return null;
  }
}

export function ownedCertifiedLocalPath(ownerId: string, value: string): string | null {
  const id = certifiedLocalMediaId(value);
  if (!id || !ownerId) return null;
  const found = readCertifiedLocalFile(id);
  if (!found || found.record.ownerId !== ownerId) return null;
  return found.absolutePath;
}

export async function readCertifiedLocalBytes(id: string, ownerId: string): Promise<{ record: CertifiedLocalFile; bytes: Buffer } | null> {
  const found = readCertifiedLocalFile(id);
  if (!found || found.record.ownerId !== ownerId) return null;
  const bytes = await readFile(found.absolutePath);
  return { record: found.record, bytes };
}

/**
 * Chromium will not finish a media seek when the response is `no-store`:
 * the element stays at HAVE_METADATA with seeking true and currentTime frozen.
 * `private` still keeps the authenticated file out of shared caches.
 */
export const PLAYBACK_MEDIA_CACHE = "private";

/**
 * HTML media elements seek with a Range request. A 200 response to that
 * request leaves the element seeking and currentTime stuck at 0.
 */
export function rangedMediaBody(bytes: Buffer, rangeHeader: string | null): {
  status: 200 | 206 | 416;
  body: Buffer;
  contentRange: string | null;
} {
  const size = bytes.length;
  const header = rangeHeader?.trim() ?? "";
  if (!header) return { status: 200, body: bytes, contentRange: null };
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header);
  if (!match || (match[1] === "" && match[2] === "")) {
    return { status: 200, body: bytes, contentRange: null };
  }
  let start: number;
  let end: number;
  if (match[1] === "") {
    const suffix = Number(match[2]);
    start = Number.isFinite(suffix) && suffix > 0 ? Math.max(0, size - suffix) : size;
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Number(match[2]);
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
    return { status: 416, body: Buffer.alloc(0), contentRange: `bytes */${size}` };
  }
  end = Math.min(end, size - 1);
  return {
    status: 206,
    body: bytes.subarray(start, end + 1),
    contentRange: `bytes ${start}-${end}/${size}`,
  };
}

export function rangedMediaResponse(bytes: Buffer, rangeHeader: string | null, contentType: string, cacheControl: string): Response {
  const ranged = rangedMediaBody(bytes, rangeHeader);
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Length": String(ranged.body.length),
    "Accept-Ranges": "bytes",
    "Cache-Control": cacheControl,
    "X-Content-Type-Options": "nosniff",
  });
  if (ranged.contentRange) headers.set("Content-Range", ranged.contentRange);
  return new Response(new Uint8Array(ranged.body), { status: ranged.status, headers });
}
