"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildHcHandoffUrl } from "@/lib/homecheff-project-package-core";
import { listHomeCheffProjectsFiltered } from "@/lib/homecheff-project-persist";
import { studioVisual } from "@/lib/studio-visual-tokens";
import type { HomeCheffProjectType } from "@/types/homecheff-project-package";
import type { EditorGenerationPackage } from "@/types/editor-generation-package";

type PackageRow = {
  packageId: string;
  projectId: string;
  projectTitle: string;
  pkg: EditorGenerationPackage;
};

const SERVICE_OPEN_LABEL = {
  editor: "hcProject.openEditor",
  motion: "hcProject.openMotion",
  publish: "hcProject.openPublish",
  studio: "hcProject.openStudio",
} as const satisfies Partial<Record<HomeCheffProjectType, string>>;

export function GenerationPackageBrowser() {
  const t = useActiveTranslator();

  const rows = useMemo(() => {
    const out: PackageRow[] = [];
    for (const project of listHomeCheffProjectsFiltered("hc")) {
      const packages = project.servicePayload.editor?.generationPackages ?? [];
      for (const pkg of packages) {
        out.push({
          packageId: pkg.id,
          projectId: project.id,
          projectTitle: project.title,
          pkg,
        });
      }
    }
    return out.sort((a, b) => (b.pkg.updatedAt ?? "").localeCompare(a.pkg.updatedAt ?? ""));
  }, []);

  return (
    <section className="space-y-4" data-testid="generation-package-browser">
      <header>
        <h2 className={`text-lg font-bold ${studioVisual.headingOnDark}`}>{t("platform.generationPackage.title" as never)}</h2>
        <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("platform.generationPackage.lead" as never)}</p>
      </header>
      {rows.length === 0 ?
        <p className={`text-sm ${studioVisual.bodyOnDark}`}>{t("platform.generationPackage.empty" as never)}</p>
      : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li
              key={`${row.projectId}_${row.packageId}`}
              className={`rounded-xl border border-zinc-200 p-4 ${studioVisual.editorSurface}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-zinc-900">{row.projectTitle}</p>
                  <p className="text-xs text-zinc-500">{row.packageId}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(SERVICE_OPEN_LABEL) as Array<keyof typeof SERVICE_OPEN_LABEL>).map((service) => (
                    <Link
                      key={service}
                      href={buildHcHandoffUrl(row.projectId, service)}
                      className={`min-h-9 px-3 py-1.5 text-xs ${studioVisual.editorTabInactive}`}
                    >
                      {t(SERVICE_OPEN_LABEL[service] as never)}
                    </Link>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
