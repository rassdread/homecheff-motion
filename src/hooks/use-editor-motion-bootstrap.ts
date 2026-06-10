"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { resolveEditorMotionBootstrap } from "@/lib/editor-motion-entry";

export const EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY = "hc-editor-motion-bootstrap-v1";

export type EditorMotionBootstrapPayload = {
  imageUrl: string;
  label: string;
  sessionId: string;
  assetId?: string;
  source: "editor_session" | "editor_asset";
};

export function useEditorMotionBootstrap(): EditorMotionBootstrapPayload | null {
  const searchParams = useSearchParams();
  const editorSession = searchParams.get("editorSession");
  const editorAsset = searchParams.get("editorAsset");

  const bootstrap = useMemo(
    () =>
      resolveEditorMotionBootstrap({
        editorSession,
        editorAsset,
      }),
    [editorSession, editorAsset]
  );

  useEffect(() => {
    if (!bootstrap?.imageUrl || typeof window === "undefined") {
      return;
    }
    const payload: EditorMotionBootstrapPayload = {
      imageUrl: bootstrap.imageUrl,
      label: bootstrap.label,
      sessionId: bootstrap.sessionId,
      assetId: bootstrap.assetId,
      source: bootstrap.source,
    };
    window.sessionStorage.setItem(EDITOR_MOTION_BOOTSTRAP_STORAGE_KEY, JSON.stringify(payload));
  }, [bootstrap]);

  return bootstrap;
}
