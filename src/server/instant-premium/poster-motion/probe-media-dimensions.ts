import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import sharp from "sharp";

export type MediaDimensions = { width: number; height: number };

function ffprobeBinary(): string {
  return process.env.FFPROBE_PATH?.trim() || "ffprobe";
}

function runCapture(
  binary: string,
  args: string[],
  timeoutMs = 30_000
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (timeoutMs > 0) {
      timeout = setTimeout(() => child.kill("SIGKILL"), timeoutMs);
    }
    let output = "";
    child.stdout?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.stderr?.on("data", (c: Buffer) => {
      output += c.toString();
    });
    child.on("close", (code) => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: code ?? 1, output });
    });
    child.on("error", () => {
      if (timeout) clearTimeout(timeout);
      resolve({ code: 1, output });
    });
  });
}

export async function probeImageFileDimensions(filePath: string): Promise<MediaDimensions | null> {
  try {
    const buffer = await fs.readFile(filePath);
    const meta = await sharp(buffer).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (width < 2 || height < 2) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}

export async function probeVideoDurationSeconds(filePath: string): Promise<number | null> {
  const binary = ffprobeBinary();
  const result = await runCapture(binary, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    filePath,
  ]);
  if (result.code !== 0) {
    return null;
  }
  const trimmed = result.output.trim();
  const seconds = Number.parseFloat(trimmed);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return seconds;
}

export async function probeVideoFileDimensions(filePath: string): Promise<MediaDimensions | null> {
  const binary = ffprobeBinary();
  const result = await runCapture(binary, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ]);
  if (result.code !== 0) {
    return null;
  }
  try {
    const parsed = JSON.parse(result.output) as {
      streams?: Array<{ width?: number; height?: number }>;
    };
    const stream = parsed.streams?.[0];
    const width = stream?.width ?? 0;
    const height = stream?.height ?? 0;
    if (width < 2 || height < 2) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}
