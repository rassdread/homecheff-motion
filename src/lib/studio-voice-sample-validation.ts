/** Voice clone sample upload validation. */

export const VOICE_SAMPLE_MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_MIME = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/m4a",
]);

const ALLOWED_EXT = new Set(["mp3", "wav", "m4a"]);

export type VoiceSampleValidation =
  | { ok: true; contentType: string; extension: string }
  | { ok: false; code: string; message: string };

export function validateVoiceSampleUpload(params: {
  buffer: Buffer;
  fileName?: string;
  mimeType?: string;
}): VoiceSampleValidation {
  if (params.buffer.length <= 0) {
    return { ok: false, code: "EMPTY_FILE", message: "Audio file is empty." };
  }
  if (params.buffer.length > VOICE_SAMPLE_MAX_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "Audio sample exceeds the maximum file size.",
    };
  }

  const ext = params.fileName?.split(".").pop()?.toLowerCase() ?? "";
  const mime = params.mimeType?.trim().toLowerCase() ?? "";

  if (ext && ALLOWED_EXT.has(ext)) {
    const contentType =
      ext === "mp3" ? "audio/mpeg"
      : ext === "wav" ? "audio/wav"
      : "audio/mp4";
    return { ok: true, contentType, extension: ext };
  }

  if (mime && ALLOWED_MIME.has(mime)) {
    const extension =
      mime.includes("mpeg") || mime.includes("mp3") ? "mp3"
      : mime.includes("wav") ? "wav"
      : "m4a";
    return { ok: true, contentType: mime, extension };
  }

  return {
    ok: false,
    code: "INVALID_FILE_TYPE",
    message: "Use MP3, WAV, or M4A audio for voice cloning.",
  };
}
