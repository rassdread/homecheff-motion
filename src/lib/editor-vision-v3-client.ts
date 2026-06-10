import type { EditorDetectionMeta, EditorMaskEditJob } from "@/types/homecheff-visual-editor";
import type { ObjectDetectionResult } from "@/server/animation-export/local-vision/object-detector-types";

export type EditorDetectApiResponse = ObjectDetectionResult & {
  available: boolean;
  meta?: EditorDetectionMeta;
};

export async function detectEditorObjectsApi(imageUrl: string): Promise<EditorDetectApiResponse> {
  const res = await fetch("/api/editor/detect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageUrl }),
    credentials: "include",
  });
  const body = (await res.json().catch(() => ({}))) as EditorDetectApiResponse & { error?: string };
  if (!res.ok) {
    return {
      detections: [],
      failed: true,
      error: body.error ?? `Detection failed (${res.status})`,
      available: false,
    };
  }
  return body;
}

export type EditorMaskedEditApiResponse = {
  ok: boolean;
  job: EditorMaskEditJob;
  resultUrl?: string;
  error?: string;
};

export async function executeEditorMaskedRemoveApi(input: {
  sessionId: string;
  layerId: string;
  imageUrl: string;
  maskUrl: string;
  objectLabel: string;
  backgroundStorageKey?: string;
}): Promise<EditorMaskedEditApiResponse> {
  const res = await fetch("/api/editor/edit/remove", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await res.json()) as EditorMaskedEditApiResponse;
}

export async function executeEditorMaskedReplaceApi(input: {
  sessionId: string;
  layerId: string;
  imageUrl: string;
  maskUrl: string;
  objectLabel: string;
  prompt: string;
  backgroundStorageKey?: string;
}): Promise<EditorMaskedEditApiResponse> {
  const res = await fetch("/api/editor/edit/replace", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    credentials: "include",
  });
  return (await res.json()) as EditorMaskedEditApiResponse;
}
