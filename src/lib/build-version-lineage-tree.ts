/**
 * Version lineage tree for Version Center (visual parent/child chain).
 */

import type { AnimationProjectDetailResponse } from "@/types/animation-api";
import type { VersionCenterRow } from "@/lib/version-center-tabs";
import { buildVersionCenterRows } from "@/lib/version-center-tabs";

export type VersionLineageNode = {
  id: string;
  title: string;
  kind: "original" | "text" | "full_rerender" | "language" | "draft";
  children: VersionLineageNode[];
  href?: string;
  isCurrent?: boolean;
};

function renderVersionNodes(rows: VersionCenterRow[]): VersionLineageNode[] {
  const renderRows = rows
    .filter((r) => r.renderVersionId)
    .sort((a, b) => (a.renderVersionNumber ?? 0) - (b.renderVersionNumber ?? 0));

  const chain: VersionLineageNode[] = [];
  for (const row of renderRows) {
    const kind =
      row.kind === "text_rerender" ? "text"
      : row.kind === "full_rerender" ? "full_rerender"
      : "original";
    chain.push({
      id: row.id,
      title: row.title,
      kind,
      children: [],
      href: row.href,
      isCurrent: row.isDefault,
    });
  }
  return chain;
}

function attachLanguageBranches(
  root: VersionLineageNode,
  languageRows: VersionCenterRow[]
): void {
  const anchor =
    [...root.children].reverse().find((n) => n.kind === "text" || n.kind === "original") ?? root;
  for (const row of languageRows) {
    anchor.children.push({
      id: row.id,
      title: row.title,
      kind: "language",
      children: [],
      href: row.href,
    });
  }
}

export function buildVersionLineageTree(
  detail: AnimationProjectDetailResponse
): VersionLineageNode | null {
  const rows = buildVersionCenterRows(detail);
  if (rows.length === 0) {
    return null;
  }

  const originalRows = rows.filter((r) => r.tab === "original");
  const languageRows = rows.filter((r) => r.tab === "languages");
  const draftRows = rows.filter((r) => r.tab === "drafts");

  const rootRow = originalRows[0];
  if (!rootRow) {
    return null;
  }

  const root: VersionLineageNode = {
    id: rootRow.id,
    title: rootRow.title,
    kind: "original",
    children: [],
    href: rootRow.href,
    isCurrent: originalRows.length === 1 && languageRows.length === 0,
  };

  let cursor = root;
  const versionChain = renderVersionNodes(rows).filter((n) => n.kind !== "original");
  for (const node of versionChain) {
    cursor.children = [node];
    cursor = node;
  }

  if (languageRows.length > 0) {
    attachLanguageBranches(root.children.length > 0 ? cursor : root, languageRows);
  }

  for (const draft of draftRows) {
    root.children.push({
      id: draft.id,
      title: draft.title,
      kind: "draft",
      children: [],
      href: draft.href,
    });
  }

  return root;
}
