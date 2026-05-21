import fs from "node:fs/promises";
import path from "node:path";

function absolutePublicPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", ...segments);
}

export async function downloadLanguageExportVideoToFile(
  url: string,
  dest: string
): Promise<void> {
  const trimmed = url.trim();
  if (trimmed.startsWith("/")) {
    const relative = trimmed.replace(/^\/+/, "");
    const abs = absolutePublicPath(...relative.split("/"));
    await fs.copyFile(abs, dest);
    return;
  }
  const res = await fetch(trimmed, { signal: AbortSignal.timeout(120_000) });
  if (!res.ok) {
    throw new Error(`Could not download source video (${res.status}).`);
  }
  await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
}
