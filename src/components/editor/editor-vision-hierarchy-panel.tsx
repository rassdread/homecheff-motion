"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { isHierarchyNodeSelectable } from "@/lib/editor-hierarchy-object-resolution";
import type { VisionTaxonomyType } from "@/lib/editor-vision-taxonomy";
import type { EditorVisionHierarchyNode } from "@/types/homecheff-visual-editor";
import type { EditorVisionPartSource } from "@/types/homecheff-visual-editor";

type Props = {
  hierarchy: EditorVisionHierarchyNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  /** When true, show part source badges (admin / debug). */
  showSourceDebug?: boolean;
  taxonomyType?: VisionTaxonomyType;
};

const HUMAN_TABS = ["face", "hair", "body", "clothing", "expression", "pose", "morph", "background"] as const;
const ANIMAL_TABS = ["head", "body", "coat", "paws_wings", "expression", "pose", "accessories", "morph", "background"] as const;
const MASCOT_TABS = ["appearance", "expression", "pose", "props", "style"] as const;

function collectNodesWithTab(
  nodes: EditorVisionHierarchyNode[],
  tab: string,
  acc: EditorVisionHierarchyNode[] = []
): EditorVisionHierarchyNode[] {
  for (const node of nodes) {
    if (node.taxonomyTab === tab) {
      acc.push(node);
    }
    if (node.children.length > 0) {
      collectNodesWithTab(node.children, tab, acc);
    }
  }
  return acc;
}

function filterHierarchyByTab(
  hierarchy: EditorVisionHierarchyNode[],
  tab: string
): EditorVisionHierarchyNode[] {
  const matches = collectNodesWithTab(hierarchy, tab);
  if (matches.length === 0) {
    return hierarchy;
  }
  return matches;
}

function sourceBadge(source: EditorVisionPartSource | undefined, showDebug: boolean): string | null {
  if (!showDebug) {
    return null;
  }
  switch (source) {
    case "rtdetr":
      return "RT-DETR";
    case "openai_vision":
      return "Vision";
    case "estimated":
      return "Est.";
    case "manual":
      return "Manual";
    case "taxonomy_fallback":
      return "Fallback";
    default:
      return null;
  }
}

function HierarchyRow({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
  expanded,
  onToggle,
  showSourceDebug,
}: {
  node: EditorVisionHierarchyNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  showSourceDebug: boolean;
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
          className="flex-1 text-left disabled:cursor-default disabled:opacity-60"
          disabled={!isHierarchyNodeSelectable(node)}
          onClick={() => isHierarchyNodeSelectable(node) && onSelectNode(node)}
        >
          {node.label}
          {node.estimated ? (
            <span className="ml-1 text-[10px] text-amber-600">~</span>
          ) : null}
          {sourceBadge(node.source, showSourceDebug) ? (
            <span className="ml-1 rounded bg-zinc-100 px-1 text-[9px] text-zinc-500">
              {sourceBadge(node.source, showSourceDebug)}
            </span>
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
              showSourceDebug={showSourceDebug}
            />
          ))
        : null}
    </>
  );
}

export function EditorVisionHierarchyPanel({
  hierarchy,
  selectedNodeId,
  onSelectNode,
  showSourceDebug = false,
  taxonomyType,
}: Props) {
  const t = useActiveTranslator();
  const tabs = useMemo(() => {
    if (taxonomyType === "human") {
      return HUMAN_TABS;
    }
    if (taxonomyType === "animal") {
      return ANIMAL_TABS;
    }
    if (taxonomyType === "mascot") {
      return MASCOT_TABS;
    }
    return null;
  }, [taxonomyType]);

  const [activeTab, setActiveTab] = useState<string>(tabs?.[0] ?? "all");
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

  const displayHierarchy =
    tabs && activeTab !== "all" ? filterHierarchyByTab(hierarchy, activeTab) : hierarchy;

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">{t("editor.visionV6.hierarchyTitle")}</p>
      {tabs ? (
        <div className="flex flex-wrap gap-1 pb-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                activeTab === tab
                  ? "bg-violet-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {t(`editor.visionTaxonomy.tab.${taxonomyType}.${tab}` as never)}
            </button>
          ))}
        </div>
      ) : null}
      {displayHierarchy.map((root) => (
        <HierarchyRow
          key={root.id}
          node={root}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          expanded={expanded}
          onToggle={toggle}
          showSourceDebug={showSourceDebug}
        />
      ))}
    </div>
  );
}
