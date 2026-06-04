"use client";

import { FullRerenderEditor, type FullRerenderEditorProps } from "@/components/instant/full-rerender-editor";
import type { FullRerenderResponse } from "@/types/animation-api";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  instantSceneTexts: unknown;
  instantUserIntent?: string | null;
  instantTransitionSeconds?: number;
  instantMode?: string | null;
  images?: { id: string; previewUrl: string }[];
  imageCount?: number;
  uploadRole?: string;
  onSuccess?: (response: FullRerenderResponse) => void;
  onError?: (message: string) => void;
  onRenderStart?: () => void;
};

export function FullRerenderEditorModal({
  open,
  onClose,
  ...editorProps
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
      <FullRerenderEditor
        {...(editorProps as FullRerenderEditorProps)}
        layout="modal"
        onClose={onClose}
      />
    </div>
  );
}
