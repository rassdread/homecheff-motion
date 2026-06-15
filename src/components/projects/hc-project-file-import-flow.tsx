"use client";

import { HcProjectImportDialog } from "@/components/projects/hc-project-import-dialog";
import { useHcProjectImportFlow } from "@/hooks/use-hc-project-import-flow";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  onImported?: (project: HomeCheffProjectPackage) => void;
  openAfterImport?: boolean;
  targetService?: HomeCheffProjectPackage["projectType"];
  renderTrigger?: (openImportPicker: () => void) => React.ReactNode;
};

export function HcProjectFileImportFlow({
  onImported,
  openAfterImport,
  targetService,
  renderTrigger,
}: Props) {
  const { ui, actions, fileInputRef } = useHcProjectImportFlow({ onImported, openAfterImport, targetService });

  return (
    <>
      {renderTrigger ? renderTrigger(actions.openImportPicker) : null}
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
