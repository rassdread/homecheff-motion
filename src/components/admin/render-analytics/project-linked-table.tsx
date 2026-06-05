"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminProjectHref } from "@/lib/admin-project-href";
import {
  AdminProjectCell,
  AdminProjectOpenAction,
} from "@/components/admin/render-analytics/admin-project-cell";
import type { AdminProjectDisplay } from "@/types/admin-project-display";

export type ProjectLinkedTableRow = {
  key: string;
  project: AdminProjectDisplay | null;
  cells: ReactNode[];
};

type ProjectLinkedTableProps = {
  headers: string[];
  rows: ProjectLinkedTableRow[];
  emptyLabel: string;
  showProjectMeta?: boolean;
  showOpenAction?: boolean;
};

export function ProjectLinkedTable({
  headers,
  rows,
  emptyLabel,
  showProjectMeta = true,
  showOpenAction = false,
}: ProjectLinkedTableProps) {
  const router = useRouter();

  if (rows.length === 0) {
    return <p className="mt-3 text-sm text-zinc-500">{emptyLabel}</p>;
  }

  const allHeaders =
    showOpenAction ? [...headers, ""] : headers;

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-xs">
        <thead>
          <tr className="border-b border-zinc-200 text-zinc-500">
            {allHeaders.map((h, i) => (
              <th key={`${h}-${i}`} className="py-2 pr-3 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { href } = getAdminProjectHref(
              row.project ?? { projectId: "", status: null }
            );
            const clickable = Boolean(row.project?.projectId && href);

            return (
              <tr
                key={row.key}
                className={`border-b border-zinc-100 text-zinc-800 ${
                  clickable ?
                    "cursor-pointer transition-colors hover:bg-emerald-50/60"
                  : ""
                }`}
                onClick={
                  clickable && href ?
                    () => router.push(href)
                  : undefined
                }
              >
                <td className="min-w-[220px] max-w-[320px] py-2 pr-3 align-top">
                  <AdminProjectCell project={row.project} showMeta={showProjectMeta} />
                </td>
                {row.cells.map((cell, j) => (
                  <td key={j} className="max-w-[200px] truncate py-2 pr-3 align-top">
                    {cell}
                  </td>
                ))}
                {showOpenAction ?
                  <td className="py-2 pr-3 align-top">
                    <AdminProjectOpenAction project={row.project} />
                  </td>
                : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function projectUsageTableRow(
  row: {
    projectId: string;
    projectDisplay: AdminProjectDisplay | null;
  },
  cells: ReactNode[]
): ProjectLinkedTableRow {
  return {
    key: row.projectId,
    project: row.projectDisplay,
    cells,
  };
}

export function creditRenderTableRow(
  row: {
    id: string;
    projectId: string;
    projectDisplay: AdminProjectDisplay | null;
  },
  cells: ReactNode[]
): ProjectLinkedTableRow {
  return {
    key: row.id,
    project: row.projectDisplay,
    cells,
  };
}
