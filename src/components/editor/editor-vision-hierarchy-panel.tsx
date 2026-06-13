"use client";

import { useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";

type Props = {
  hierarchy: EditorVisionHierarchyNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
};

function HierarchyRow({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
  expanded,
  onToggle,
}: {
  node: EditorVisionHierarchyNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const selected = selectedNodeId === node.id;

  return (
    <>
      <div
        className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-xs ${
          selected ? "bg-violet-100 text-violet-900" : "text-zinc-700 hover:bg-zinc-50"
        }`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="w-4 shrink-0 text-zinc-400"
            onClick={() => onToggle(node.id)}
            aria-label={isOpen ? "Collapse" : "Expand"}
          >
            {isOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-4 shrink-0" />
        )}
        <button
          type="button"
          className="flex-1 text-left"
          disabled={!node.editable}
          onClick={() => node.editable && onSelectNode(node)}
        >
          {node.label}
          {node.estimated ? (
            <span className="ml-1 text-[10px] text-amber-600">~</span>
          ) : null}
        </button>
      </div>
      {hasChildren && isOpen
        ? node.children.map((child) => (
            <HierarchyRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedNodeId={selectedNodeId}
              onSelectNode={onSelectNode}
              expanded={expanded}
              onToggle={onToggle}
            />
          ))
        : null}
    </>
  );
}

export function EditorVisionHierarchyPanel({ hierarchy, selectedNodeId, onSelectNode }: Props) {
  const t = useActiveTranslator();
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(hierarchy.map((n) => n.id))
  );

  const toggle = (id: string) => {
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

  if (hierarchy.length === 0) {
    return (
      <p className="text-xs text-zinc-500">{t("editor.visionV4.hierarchyEmpty")}</p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{t("editor.visionV4.hierarchyTitle")}</p>
      {hierarchy.map((root) => (
        <HierarchyRow
          key={root.id}
          node={root}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          expanded={expanded}
          onToggle={toggle}
        />
      ))}
    </div>
  );
}
