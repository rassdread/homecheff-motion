import type { EditorMotionBootstrapPayload } from "@/hooks/use-editor-motion-bootstrap";
import { EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY } from "@/hooks/use-editor-motion-bootstrap";

export function readEditorMotionBootstrapFromSession(): EditorMotionBootstrapPayload | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as EditorMotionBootstrapPayload;
    if (!parsed?.imageUrl?.trim()) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
