export const FFMPEG_BINARY_MISSING = "FFMPEG_BINARY_MISSING";
export const FFPROBE_BINARY_MISSING = "FFPROBE_BINARY_MISSING";

export const VIDEO_TOOLS_USER_MESSAGE_NL =
  "Video rendering tools ontbreken op de server.";
export const VIDEO_TOOLS_USER_MESSAGE_EN =
  "Video rendering tools are missing on the server.";

export class VideoToolsMissingError extends Error {
  readonly code: typeof FFMPEG_BINARY_MISSING | typeof FFPROBE_BINARY_MISSING;

  constructor(
    code: typeof FFMPEG_BINARY_MISSING | typeof FFPROBE_BINARY_MISSING,
    message: string = VIDEO_TOOLS_USER_MESSAGE_NL,
    cause?: unknown
  ) {
    super(message);
    this.name = "VideoToolsMissingError";
    this.code = code;
    if (cause instanceof Error) {
      this.cause = cause;
    }
  }
}

export function isSpawnEnoent(spawnError?: string | null): boolean {
  if (!spawnError) {
    return false;
  }
  return spawnError.includes("ENOENT") || /\benoent\b/i.test(spawnError);
}

export function sanitizeSpawnErrorMessage(spawnError?: string): string {
  if (!spawnError) {
    return "";
  }
  if (isSpawnEnoent(spawnError)) {
    return VIDEO_TOOLS_USER_MESSAGE_NL;
  }
  return spawnError;
}

export function classifySpawnToolFromBinary(binary: string): "ffmpeg" | "ffprobe" {
  return binary.toLowerCase().includes("ffprobe") ? "ffprobe" : "ffmpeg";
}

export function mapSpawnError(
  err: unknown,
  tool: "ffmpeg" | "ffprobe"
): never {
  const message = err instanceof Error ? err.message : String(err);
  const code = (err as NodeJS.ErrnoException | undefined)?.code;
  if (code === "ENOENT" || message.includes("ENOENT")) {
    throw new VideoToolsMissingError(
      tool === "ffprobe" ? FFPROBE_BINARY_MISSING : FFMPEG_BINARY_MISSING,
      VIDEO_TOOLS_USER_MESSAGE_NL,
      err
    );
  }
  if (err instanceof Error) {
    throw err;
  }
  throw new Error(message);
}
