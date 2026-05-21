import { createHash } from "node:crypto";
import fs from "node:fs/promises";

export async function hashFileSha256(filePath: string): Promise<string> {
  const data = await fs.readFile(filePath);
  return createHash("sha256").update(data).digest("hex");
}

export function hashBufferSha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function hashRemoteVideoUrl(url: string, timeoutMs = 120_000): Promise<string | null> {
  const trimmed = url.trim();
  if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
    return null;
  }
  try {
    const response = await fetch(trimmed, {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      return null;
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length <= 0) {
      return null;
    }
    return hashBufferSha256(buffer);
  } catch {
    return null;
  }
}
