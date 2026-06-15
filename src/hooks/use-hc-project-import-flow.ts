"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useAuthSession } from "@/hooks/use-auth-session";
import {
  importHcProjectFileAsNewProject,
  validateHcProjectFileContent,
  type HcProjectImportPreview,
} from "@/lib/hc-project-file-io";
import { buildHcHandoffUrl, resolveHcProjectOpenTargets } from "@/lib/homecheff-project-package-core";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Options = {
  onImported?: (project: HomeCheffProjectPackage) => void;
  openAfterImport?: boolean;
  targetService?: HomeCheffProjectPackage["projectType"];
};

export function useHcProjectImportFlow(options: Options = {}) {
  const auth = useAuthSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [preview, setPreview] = useState<HcProjectImportPreview | null>(null);
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setDialogOpen(false);
    setPreview(null);
    setPendingContent(null);
    setErrorKey(null);
    setBusy(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openImportPicker = () => {
    fileInputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    const content = await file.text();
    const validation = validateHcProjectFileContent(content);
    setPendingContent(content);
    setDialogOpen(true);
    if (!validation.ok) {
      setPreview(null);
      setErrorKey(validation.errorKey);
      return;
    }
    setPreview(validation.preview);
    setErrorKey(null);
  };

  const confirmImport = async () => {
    if (!pendingContent) {
      return;
    }
    setBusy(true);
    const result = importHcProjectFileAsNewProject({
      content: pendingContent,
      userId: auth.user?.id,
      syncToServer: Boolean(auth.user),
    });
    setBusy(false);
    if (!result.ok) {
      setErrorKey(result.errorKey);
      return;
    }
    options.onImported?.(result.project);
    reset();
    if (options.openAfterImport ?? true) {
      const targets = resolveHcProjectOpenTargets(result.project);
      const service = options.targetService ?? targets[0] ?? result.project.projectType;
      router.push(buildHcHandoffUrl(result.project.id, service));
    }
  };

  return {
    fileInputRef,
    dialogOpen,
    preview,
    errorKey,
    busy,
    openImportPicker,
    handleFile,
    confirmImport,
    cancelImport: reset,
  };
}
