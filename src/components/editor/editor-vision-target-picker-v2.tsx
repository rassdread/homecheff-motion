"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { EditorVisionTargetPickerAuditPanel } from "@/components/editor/editor-vision-target-picker-audit-panel";
import { buildVisionTargetPickerAuditCard } from "@/lib/vision-target-audit-card";
import { confidenceTierLabel } from "@/lib/vision-target-highlight";
import {
  buildVisionTargetTreeFromDocument,
  findVisionTargetNode,
  flattenSelectableTargets,
} from "@/lib/vision-target-picker-v2";
import type { EditorCanvasDocument } from "@/types/homecheff-visual-editor";
import type { VisionTargetNodeV2 } from "@/types/vision-target-picker";

type Props = {
  document: EditorCanvasDocument;
  selectedTargetIds: string[];
  onSelectionChange: (targetIds: string[]) => void;
  onHoverTargetId?: (targetId: string | null) => void;
  multiSelect?: boolean;
  showAuditDebug?: boolean;
};

function TargetTreeNode({
  node,
  depth,
  expanded,
  onToggle,
  selectedIds,
  onPick,
  onHover,
  multiSelect,
}: {
  node: VisionTargetNodeV2;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  selectedIds: Set<string>;
  onPick: (node: VisionTargetNodeV2) => void;
  onHover: (id: string | null) => void;
  multiSelect: boolean;
}) {
  const selected = selectedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const canPick = node.selectable && node.brandingEligible;

  return (
    <>
      <div
        className={`flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm ${
          selected ? "bg-[#0067B1]/15 ring-1 ring-[#0067B1]/40" : "hover:bg-white/10"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onMouseEnter={() => onHover(node.id)}
        onMouseLeave={() => onHover(null)}
        data-testid={`vision-target-row-${node.id}`}
      >
        {hasChildren ?
          <button
            type="button"
            className="mt-0.5 shrink-0 text-xs text-white/70"
            aria-expanded={isOpen}
            onClick={() => onToggle(node.id)}
          >
            {isOpen ? "▼" : "▶"}
          </button>
        : <span className="mt-0.5 w-3 shrink-0" />}
        {canPick ?
          <label className="flex flex-1 cursor-pointer items-start gap-2">
            {multiSelect ?
              <input
                type="checkbox"
                checked={selected}
                onChange={() => onPick(node)}
                className="mt-1"
                data-testid={`vision-target-checkbox-${node.id}`}
              />
            : (
              <input
                type="radio"
                name="vision-target"
                checked={selected}
                onChange={() => onPick(node)}
                className="mt-1"
                data-testid={`vision-target-radio-${node.id}`}
              />
            )}
            <span className="flex flex-col gap-0.5">
              <span className="font-medium text-white">{node.label}</span>
              <span className="text-[11px] text-white/60">
                {confidenceTierLabel(node.confidenceTier)}
              </span>
            </span>
          </label>
        : (
          <button
            type="button"
            className="flex flex-1 flex-col gap-0.5 text-left"
            onClick={() => hasChildren && onToggle(node.id)}
          >
            <span className="font-semibold text-white">{node.label}</span>
          </button>
        )}
      </div>
      {hasChildren && isOpen ?
        node.children.map((child) => (
          <TargetTreeNode
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            onToggle={onToggle}
            selectedIds={selectedIds}
            onPick={onPick}
            onHover={onHover}
            multiSelect={multiSelect}
          />
        ))
      : null}
    </>
  );
}

export function EditorVisionTargetPickerV2({
  document,
  selectedTargetIds,
  onSelectionChange,
  onHoverTargetId,
  multiSelect = true,
  showAuditDebug = false,
}: Props) {
  const t = useActiveTranslator();
  const tree = useMemo(() => buildVisionTargetTreeFromDocument(document), [document]);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const root of tree.roots) {
      if (root.children.length > 0) {
        ids.add(root.id);
      }
    }
    return ids;
  });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(selectedTargetIds), [selectedTargetIds]);
  const selectable = useMemo(() => flattenSelectableTargets(tree.roots), [tree.roots]);

  const handleToggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handlePick = (node: VisionTargetNodeV2) => {
    if (multiSelect) {
      const next = selectedIds.has(node.id)
        ? selectedTargetIds.filter((id) => id !== node.id)
        : [...selectedTargetIds, node.id];
      onSelectionChange(next);
      return;
    }
    onSelectionChange([node.id]);
  };

  const handleHover = (id: string | null) => {
    setHoveredId(id);
    onHoverTargetId?.(id);
  };

  const auditNode =
    findVisionTargetNode(tree.roots, hoveredId ?? selectedTargetIds[0] ?? "") ??
    selectable[0] ??
    null;
  const auditCard = buildVisionTargetPickerAuditCard({
    document,
    node: auditNode,
    datasource: tree.datasource,
  });

  if (selectable.length === 0) {
    return (
      <p className="text-sm text-amber-100" data-testid="vision-target-picker-empty">
        {t("editor.logoPlacement.noTargets" as never)}
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="vision-target-picker-v2">
      <div className="rounded-xl border border-white/15 bg-black/20 p-2">
        {tree.roots.map((root) => (
          <TargetTreeNode
            key={root.id}
            node={root}
            depth={0}
            expanded={expanded}
            onToggle={handleToggle}
            selectedIds={selectedIds}
            onPick={handlePick}
            onHover={handleHover}
            multiSelect={multiSelect}
          />
        ))}
      </div>
      {showAuditDebug ?
        <EditorVisionTargetPickerAuditPanel card={auditCard} />
      : null}
    </div>
  );
}
