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
  const flow = useHcProjectImportFlow({ onImported, openAfterImport, targetService });

  return (
    <>
      {renderTrigger ? renderTrigger(flow.openImportPicker) : null}
      <input
        ref={flow.fileInputRef}
        type="file"
        accept=".hc,application/json,application/vnd.homecheff.project+json"
        className="hidden"
        data-testid="hc-project-import-input"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void flow.handleFile(file);
          }
        }}
      />
      <HcProjectImportDialog
        open={flow.dialogOpen}
        preview={flow.preview}
        errorKey={flow.errorKey}
        busy={flow.busy}
        onCancel={flow.cancelImport}
        onConfirm={() => void flow.confirmImport()}
      />
    </>
  );
}
