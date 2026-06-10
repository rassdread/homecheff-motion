"use client";

import { useActiveTranslator } from "@/i18n/client";
import { buildEditorSemanticLayerTree } from "@/lib/editor-semantic-layer-tree";
import { groupEditorLayerTree, type EditorLayerTreeNode } from "@/lib/editor-layer-tree-build";
import { editorSemanticCategoryLabelKey, editorSemanticSourceLabelKey } from "@/lib/editor-semantic-layer-taxonomy";
import type { EditorCanvasLayer } from "@/types/homecheff-visual-editor";

type Props = {
  layers: EditorCanvasLayer[];
  selectedLayerId: string | null;
  onSelect: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onRename?: (layerId: string, label: string) => void;
  onReorder?: (layerId: string, direction: "up" | "down") => void;
  semanticTree?: boolean;
};

function confidenceBadge(confidence: number | undefined): string {
  if (confidence === undefined) {
    return "—";
  }
  return `${Math.round(confidence * 100)}%`;
}

function LayerRow({
  node,
  depth,
  selectedLayerId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onReorder,
  t,
}: {
  node: EditorLayerTreeNode;
  depth: number;
  selectedLayerId: string | null;
  onSelect: (layerId: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onRename?: (layerId: string, label: string) => void;
  onReorder?: (layerId: string, direction: "up" | "down") => void;
  t: ReturnType<typeof useActiveTranslator>;
}) {
  const { layer } = node;
  const selected = selectedLayerId === layer.id;
  const estimated = layer.metadata?.estimatedBounds;
  const canRename = onRename && layer.layerType !== "background" && !layer.locked;

  return (
    <>
      <li>
        <div
          className={`flex items-center gap-1 rounded-lg px-1 py-1 ${selected ? "bg-[#0067B1]/10" : "hover:bg-zinc-50"}`}
          style={{ paddingLeft: `${depth * 12 + 4}px` }}
        >
          {canRename ?
            <input
              type="text"
              defaultValue={layer.label}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => {
                const next = e.target.value.trim();
                if (next && next !== layer.label) {
                  onRename(layer.id, next);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className={`min-w-0 flex-1 truncate rounded border-0 bg-transparent px-0 text-sm focus:ring-1 focus:ring-[#0067B1] ${selected ? "text-[#0067B1]" : "text-zinc-800"}`}
              aria-label={t("editor.layer.rename")}
            />
          : <button
              type="button"
              onClick={() => onSelect(layer.id)}
              className={`min-w-0 flex-1 truncate text-left text-sm ${selected ? "text-[#0067B1]" : "text-zinc-800"}`}
            >
              {layer.label}
            </button>}
          <span
            className="shrink-0 rounded bg-zinc-100 px-1 text-[9px] font-semibold uppercase text-zinc-500"
            title={t("editor.semantic.confidence")}
          >
            {confidenceBadge(layer.confidence)}
          </span>
          {layer.layerSource ?
            <span className="hidden shrink-0 rounded bg-slate-100 px-1 text-[9px] uppercase text-slate-600 sm:inline">
              {t(editorSemanticSourceLabelKey(layer.layerSource))}
            </span>
          : null}
          {estimated ?
            <span className="shrink-0 rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800">
              {t("editor.semantic.estimated")}
            </span>
          : null}
          <button
            type="button"
            aria-label={t("editor.canvas.tool.visibility")}
            onClick={() => onToggleVisibility(layer.id)}
            className="shrink-0 rounded p-1 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            {layer.visible ? "●" : "○"}
          </button>
          <button
            type="button"
            aria-label={t("editor.canvas.tool.lock")}
            onClick={() => onToggleLock(layer.id)}
            className="shrink-0 rounded p-1 text-xs text-zinc-500 hover:bg-zinc-100"
          >
            {layer.locked ? "🔒" : "🔓"}
          </button>
          {onReorder && layer.layerType !== "background" ?
            <>
              <button
                type="button"
                aria-label={t("editor.layer.moveUp")}
                onClick={() => onReorder(layer.id, "up")}
                className="shrink-0 rounded p-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
              >
                ↑
              </button>
              <button
                type="button"
                aria-label={t("editor.layer.moveDown")}
                onClick={() => onReorder(layer.id, "down")}
                className="shrink-0 rounded p-1 text-[10px] text-zinc-500 hover:bg-zinc-100"
              >
                ↓
              </button>
            </>
          : null}
        </div>
      </li>
      {node.children.map((child) => (
        <LayerRow
          key={child.layer.id}
          node={child}
          depth={depth + 1}
          selectedLayerId={selectedLayerId}
          onSelect={onSelect}
          onToggleVisibility={onToggleVisibility}
          onToggleLock={onToggleLock}
          onRename={onRename}
          onReorder={onReorder}
          t={t}
        />
      ))}
    </>
  );
}

export function EditorLayerTree({
  layers,
  selectedLayerId,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onRename,
  onReorder,
  semanticTree = true,
}: Props) {
  const t = useActiveTranslator();
  const groups = groupEditorLayerTree(layers);
  const semantic = buildEditorSemanticLayerTree(layers);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {semanticTree ? semantic.rootLabel : t("editor.canvas.layersTitle")}
      </p>
      <div className="mt-2 max-h-[420px] space-y-3 overflow-y-auto">
        {semanticTree ?
          <ul className="space-y-0.5">
            {semantic.nodes.map((node) => (
              <LayerRow
                key={node.layer.id}
                node={node}
                depth={0}
                selectedLayerId={selectedLayerId}
                onSelect={onSelect}
                onToggleVisibility={onToggleVisibility}
                onToggleLock={onToggleLock}
                onRename={onRename}
                onReorder={onReorder}
                t={t}
              />
            ))}
          </ul>
        : groups.map((group) => (
            <div key={group.category}>
              <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-zinc-400">
                {t(editorSemanticCategoryLabelKey(group.category))}
              </p>
              <ul className="mt-1 space-y-0.5">
                {group.nodes.map((node) => (
                  <LayerRow
                    key={node.layer.id}
                    node={node}
                    depth={0}
                    selectedLayerId={selectedLayerId}
                    onSelect={onSelect}
                    onToggleVisibility={onToggleVisibility}
                    onToggleLock={onToggleLock}
                    onRename={onRename}
                    onReorder={onReorder}
                    t={t}
                  />
                ))}
              </ul>
            </div>
          ))}
        {semanticTree && semantic.nodes.length === 0 ?
          <p className="px-2 py-3 text-xs text-zinc-500">{t("editor.canvas.layersEmpty")}</p>
        : null}
        {!semanticTree && groups.length === 0 ?
          <p className="px-2 py-3 text-xs text-zinc-500">{t("editor.canvas.layersEmpty")}</p>
        : null}
      </div>
    </div>
  );
}
