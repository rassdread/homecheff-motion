"use client";

import { HcProjectImportDialog } from "@/components/projects/hc-project-import-dialog";
import { useHcProjectImportFlow } from "@/hooks/use-hc-project-import-flow";
import { useActiveTranslator } from "@/i18n/client";
import { studioVisual } from "@/lib/studio-visual-tokens";

type Props = {
  className?: string;
  labelKey?: string;
  onImported?: (projectId: string) => void;
  openAfterImport?: boolean;
};

export function HcProjectImportButton({
  className,
  labelKey = "hcProject.file.importButton",
  onImported,
  openAfterImport = true,
}: Props) {
  const t = useActiveTranslator();
  const flow = useHcProjectImportFlow({
    openAfterImport,
    onImported: (project) => onImported?.(project.id),
  });
  const { ui, actions, fileInputRef } = flow;

  return (
    <>
      <button
        type="button"
        className={className ?? studioVisual.btnGradientPrimary}
        data-testid="hc-project-import-button"
        onClick={actions.openImportPicker}
      >
        {t(labelKey as never)}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".hc,application/json,application/vnd.homecheff.project+json"
        className="hidden"
        data-testid="hc-project-import-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void actions.handleFile(file);
          }
        }}
      />
      <HcProjectImportDialog
        open={ui.dialogOpen}
        preview={ui.preview}
        errorKey={ui.errorKey}
        busy={ui.busy}
        onCancel={actions.cancelImport}
        onConfirm={() => void actions.confirmImport()}
      />
    </>
  );
}
