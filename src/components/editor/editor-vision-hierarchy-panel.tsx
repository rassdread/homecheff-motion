"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { isHierarchyNodeSelectable } from "@/lib/editor-hierarchy-object-resolution";
import { localizeVisionPartLabel } from "@/lib/editor-vision-part-display-label";
import { visionTaxonomyGroupLabelKey } from "@/lib/editor-vision-accessories-taxonomy";
import { visionUserTaxonomyGroupLabelKey } from "@/lib/editor-vision-user-taxonomy";
import { filterVisionTruthHierarchyForUser } from "@/lib/editor-vision-truth-mode";
import type { EditorVisionHierarchyNode, EditorVisionTruthSection } from "@/types/homecheff-visual-editor";
import type { VisionTaxonomyAssetType } from "@/lib/editor-vision-accessories-taxonomy";

type Props = {
  hierarchy: EditorVisionHierarchyNode[];
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  /** When true, show part source badges + debug labels section (admin). */
  showSourceDebug?: boolean;
  taxonomyType?: VisionTaxonomyAssetType;
};

const DEFAULT_EXPANDED: EditorVisionTruthSection[] = ["detected", "estimated"];

function truthSectionLabel(
  t: ReturnType<typeof useActiveTranslator>,
  section: EditorVisionTruthSection | undefined,
  fallback: string
): string {
  if (!section) {
    return fallback;
  }
  return t(`editor.visionTruth.section.${section}` as never);
}

function truthTierBadge(
  node: EditorVisionHierarchyNode,
  showDebug: boolean,
  t: ReturnType<typeof useActiveTranslator>
): string | null {
  if (node.truthSection) {
    return null;
  }

  if (showDebug) {
    const src = node.source ?? "estimated";
    const conf =
      node.confidence !== undefined ? ` ${Math.round(node.confidence * 100)}%` : "";
    switch (src) {
      case "rtdetr":
        return `RT-DETR${conf}`;
      case "openai_vision":
        return `Vision${conf}`;
      case "estimated":
        return node.truthTier === "debug" ? `Debug${conf}` : `Est.${conf}`;
      case "manual":
        return `Manual${conf}`;
      case "taxonomy_fallback":
        return `Fallback${conf}`;
      case "creative":
        return `Creative${conf}`;
      default:
        return null;
    }
  }

  const tier = node.truthTier;
  if (tier === "vision") {
    return t("editor.visionTruth.badge.vision");
  }
  if (tier === "estimated") {
    return t("editor.visionTruth.badge.estimated");
  }
  if (tier === "creative") {
    return t("editor.visionTruth.badge.creative");
  }
  return null;
}

function HierarchyRow({
  node,
  depth,
  selectedNodeId,
  onSelectNode,
  expanded,
  onToggle,
  showSourceDebug,
  taxonomyType = "unknown",
  t,
}: {
  node: EditorVisionHierarchyNode;
  depth: number;
  selectedNodeId: string | null;
  onSelectNode: (node: EditorVisionHierarchyNode) => void;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  showSourceDebug: boolean;
  taxonomyType: VisionTaxonomyAssetType;
  t: ReturnType<typeof useActiveTranslator>;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.id);
  const selected = selectedNodeId === node.id;
  const isTaxonomyGroup = !node.partId && Boolean(node.taxonomyTab) && !node.truthSection;
  const userTaxonomyLabelKey = isTaxonomyGroup ? visionUserTaxonomyGroupLabelKey(node) : null;
  const displayLabel = node.truthSection
    ? truthSectionLabel(t, node.truthSection, node.label)
    : isTaxonomyGroup
      ? userTaxonomyLabelKey
        ? t(userTaxonomyLabelKey as never)
        : t(visionTaxonomyGroupLabelKey(taxonomyType, node.taxonomyTab!) as never)
      : localizeVisionPartLabel(node.label, t);
  const badge = truthTierBadge(node, showSourceDebug, t);

  return (
    <>
      <div
        className={`flex items-center gap-1 rounded-md px-1 py-0.5 text-xs ${
          node.truthSection || isTaxonomyGroup
            ? "mt-1 font-semibold text-zinc-800"
            : selected
              ? "bg-violet-100 text-violet-900"
              : "text-zinc-700 hover:bg-zinc-50"
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
          className="flex flex-1 items-center gap-1 text-left disabled:cursor-default disabled:opacity-60"
          disabled={!isHierarchyNodeSelectable(node)}
          onClick={() => isHierarchyNodeSelectable(node) && onSelectNode(node)}
        >
          <span>{displayLabel}</span>
          {node.estimated && !node.truthSection ? (
            <span className="text-[10px] text-amber-600">~</span>
          ) : null}
          {badge ? (
            <span
              className={`ml-auto shrink-0 rounded px-1 text-[9px] ${
                node.truthTier === "creative"
                  ? "bg-violet-50 text-violet-700"
                  : node.truthTier === "estimated"
                    ? "bg-amber-50 text-amber-700"
                    : node.truthTier === "debug"
                      ? "bg-zinc-100 text-zinc-500"
                      : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {badge}
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
              taxonomyType={taxonomyType}
              t={t}
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
  taxonomyType = "unknown",
}: Props) {
  const t = useActiveTranslator();

  const visibleHierarchy = useMemo(
    () => filterVisionTruthHierarchyForUser(hierarchy, showSourceDebug),
    [hierarchy, showSourceDebug]
  );

  const initialExpanded = useMemo(() => {
    const ids = new Set<string>();
    const walk = (nodes: EditorVisionHierarchyNode[], depth: number) => {
      for (const node of nodes) {
        if (depth <= 2) {
          ids.add(node.id);
        }
        if (node.children.length > 0) {
          walk(node.children, depth + 1);
        }
      }
    };
    for (const root of visibleHierarchy) {
      if (root.truthSection && DEFAULT_EXPANDED.includes(root.truthSection)) {
        ids.add(root.id);
        walk(root.children, 1);
      } else if (!root.truthSection) {
        ids.add(root.id);
        walk(root.children, 1);
      }
    }
    return ids;
  }, [visibleHierarchy]);

  const [expanded, setExpanded] = useState<Set<string>>(initialExpanded);

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

  if (visibleHierarchy.length === 0) {
    return (
      <p className="text-xs text-zinc-500">{t("editor.visionV4.hierarchyEmpty")}</p>
    );
  }

  const isTruthMode = visibleHierarchy.some((n) => n.truthSection);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-500">
        {isTruthMode ? t("editor.visionTruth.hierarchyTitle") : t("editor.visionV6.hierarchyTitle")}
      </p>
      {visibleHierarchy.map((root) => (
        <HierarchyRow
          key={root.id}
          node={root}
          depth={0}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          expanded={expanded}
          onToggle={toggle}
          showSourceDebug={showSourceDebug}
          taxonomyType={taxonomyType}
          t={t}
        />
      ))}
    </div>
  );
}
