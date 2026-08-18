import {
  isTrustedHomecheffExportAttachAction,
} from "@/lib/photo-video/export-attach-payload";

export function submitExportAttachForm(action: string, token: string): void {
  if (!isTrustedHomecheffExportAttachAction(action) || !token) {
    throw new Error("handoff");
  }
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.acceptCharset = "UTF-8";
  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token";
  input.value = token;
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

export async function uploadPhotoVideoExportBlob(file: File, signal?: AbortSignal): Promise<string> {
  const { upload } = await import("@vercel/blob/client");
  const result = await upload(`px4a-export/${Date.now()}/${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/photo-video/export-upload",
    contentType: file.type || "video/mp4",
    multipart: file.size > 4 * 1024 * 1024,
    abortSignal: signal,
  });
  const url = result.url?.trim() ?? "";
  if (!url.startsWith("https://")) throw new Error("handoff");
  return url;
}

export async function requestPhotoVideoExportHandoff(input: {
  videoUrl: string;
  durationSeconds: number;
  thumbnailUrl?: string | null;
  signal?: AbortSignal;
}): Promise<{ action: string; token: string }> {
  const res = await fetch("/api/photo-video/export-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoUrl: input.videoUrl,
      durationSeconds: input.durationSeconds,
      thumbnailUrl: input.thumbnailUrl ?? null,
    }),
    signal: input.signal,
  });
  if (!res.ok) throw new Error("handoff");
  const data = (await res.json()) as { action?: string; token?: string };
  const action = String(data.action ?? "");
  const token = String(data.token ?? "");
  if (!action || !token) throw new Error("handoff");
  return { action, token };
}

export async function handoffPhotoVideoFileToHomeCheff(input: {
  file: File;
  durationSeconds: number;
  signal?: AbortSignal;
}): Promise<void> {
  const videoUrl = await uploadPhotoVideoExportBlob(input.file, input.signal);
  if (input.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const { action, token } = await requestPhotoVideoExportHandoff({
    videoUrl,
    durationSeconds: input.durationSeconds,
    signal: input.signal,
  });
  submitExportAttachForm(action, token);
}
