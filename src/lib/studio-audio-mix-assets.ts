/**
 * S2E-P1 — Resolve mixable audio sources with URL-identity dedup + temp paths.
 * Strips signed-query from cache keys. 0 AI providers.
 */

import path from "node:path";
import { downloadLanguageExportVideoToFile } from "@/server/instant-premium/language-export-io";

/** Identity for signed/public URLs — pathname only when parseable. */
export function audioAssetCacheKey(urlOrPath: string): string {
  const raw = urlOrPath.trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^[A-Za-z]:[\\/]/.test(raw)) {
    return raw.split("?")[0] ?? raw;
  }
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}`;
  } catch {
    return raw.split("?")[0] ?? raw;
  }
}

function safeLogUrl(url: string): string {
  const key = audioAssetCacheKey(url);
  return key.length > 120 ? `${key.slice(0, 117)}...` : key;
}

/**
 * Download each unique remote asset once; reuse local path for multiple cues.
 * Optional SFX missing → null path + warning (caller compact).
 */
export async function resolveDiscreteSfxPathsForMixNullable(params: {
  cues: Array<{ url: string; cueId?: string }>;
  workDir: string;
  download?: (url: string, dest: string) => Promise<void>;
}): Promise<{
  /** Same length as cues; null = missing optional. */
  paths: Array<string | null>;
  uniqueDownloaded: number;
  reusedCount: number;
  missingOptional: number;
  warnings: string[];
}> {
  const download = params.download ?? downloadLanguageExportVideoToFile;
  const cache = new Map<string, string>();
  const paths: Array<string | null> = [];
  const warnings: string[] = [];
  let uniqueDownloaded = 0;
  let reusedCount = 0;
  let missingOptional = 0;
  let fileSeq = 0;

  for (const cue of params.cues) {
    const url = cue.url?.trim() ?? "";
    if (!url) {
      paths.push(null);
      missingOptional += 1;
      warnings.push("OPTIONAL_SFX_MISSING: empty url");
      continue;
    }

    const key = audioAssetCacheKey(url);
    const existing = cache.get(key);
    if (existing) {
      paths.push(existing);
      reusedCount += 1;
      continue;
    }

    const dest = path.join(params.workDir, `studio-sfx-${fileSeq++}.bin`);
    try {
      await download(url, dest);
      cache.set(key, dest);
      paths.push(dest);
      uniqueDownloaded += 1;
    } catch {
      paths.push(null);
      missingOptional += 1;
      warnings.push(`OPTIONAL_SFX_MISSING: ${safeLogUrl(url)}`);
    }
  }

  return {
    paths,
    uniqueDownloaded,
    reusedCount,
    missingOptional,
    warnings,
  };
}

export function compactDiscreteSfxForMix<T extends { url: string }>(
  cues: T[],
  paths: Array<string | null>
): { cues: T[]; paths: string[] } {
  const outCues: T[] = [];
  const outPaths: string[] = [];
  for (let i = 0; i < cues.length; i++) {
    const p = paths[i];
    if (p) {
      outCues.push(cues[i]!);
      outPaths.push(p);
    }
  }
  return { cues: outCues, paths: outPaths };
}
