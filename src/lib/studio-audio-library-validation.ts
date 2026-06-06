/** Music / SFX upload validation — mp3 and wav only. */

export const STUDIO_LIBRARY_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

const ALLOWED_MIME = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav"]);
const ALLOWED_EXT = new Set(["mp3", "wav"]);

export type StudioLibraryAudioValidation =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; code: string; message: string };

export function validateStudioLibraryAudioUpload(params: {
  buffer: Buffer;
  fileName?: string;
  mimeType?: string;
}): StudioLibraryAudioValidation {
  if (params.buffer.length <= 0) {
    return { ok: false, code: "EMPTY_FILE", message: "Audio file is empty." };
  }
  if (params.buffer.length > STUDIO_LIBRARY_AUDIO_MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "Audio file exceeds the maximum size.",
    };
  }

  const ext = params.fileName?.split(".").pop()?.toLowerCase() ?? "";
  const mime = params.mimeType?.trim().toLowerCase() ?? "";

  if (ext && ALLOWED_EXT.has(ext)) {
    return {
      ok: true,
      contentType: ext === "wav" ? "audio/wav" : "audio/mpeg",
      extension: ext,
    };
  }

  if (mime && ALLOWED_MIME.has(mime)) {
    return {
      ok: true,
      contentType: mime.includes("wav") ? "audio/wav" : "audio/mpeg",
      extension: mime.includes("wav") ? "wav" : "mp3",
    };
  }

  return {
    ok: false,
    code: "INVALID_FILE_TYPE",
    message: "Use MP3 or WAV audio.",
  };
}

export function estimateLibraryAudioDurationSeconds(buffer: Buffer, extension: string): number {
  if (extension === "wav" && buffer.length > 44) {
    return Math.max(1, (buffer.length - 44) / (16000 * 2));
  }
  const bytesPerSecond = (128 * 1000) / 8;
  return Math.max(1, buffer.length / bytesPerSecond);
}
