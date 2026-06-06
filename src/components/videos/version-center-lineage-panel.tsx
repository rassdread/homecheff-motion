"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { buildVersionLineageTree, type VersionLineageNode } from "@/lib/build-version-lineage-tree";
import type { AnimationProjectDetailResponse } from "@/types/animation-api";

type Props = {
  detail: AnimationProjectDetailResponse;
};

function LineageBranch({ node, depth = 0 }: { node: VersionLineageNode; depth?: number }) {
  const t = useActiveTranslator();
  const kindLabel =
    node.kind === "original" ? t("versions.center.tab.original")
    : node.kind === "text" ? t("versions.center.tab.text")
    : node.kind === "full_rerender" ? t("versions.center.tab.full_rerender")
    : node.kind === "language" ? t("versions.center.tab.languages")
    : t("versions.center.tab.drafts");

  const label = (
    <span
      className={`text-sm ${node.isCurrent ? "font-bold text-[#006D52]" : "font-medium text-zinc-800"}`}
    >
      {node.title}
      <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        {kindLabel}
      </span>
    </span>
  );

  return (
    <li className="relative">
      <div className="flex items-start gap-2" style={{ paddingLeft: depth * 16 }}>
        {depth > 0 ?
          <span className="mt-2 text-zinc-400" aria-hidden>
            └─
          </span>
        : null}
        <div className="min-w-0 py-1">
          {node.href ?
            <Link href={node.href} prefetch={false} className="hover:underline">
              {label}
            </Link>
          : label}
        </div>
      </div>
      {node.children.length > 0 ?
        <ul className="mt-0.5 space-y-0">
          {node.children.map((child) => (
            <LineageBranch key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      : null}
    </li>
  );
}

export function VersionCenterLineagePanel({ detail }: Props) {
  const t = useActiveTranslator();
  const tree = useMemo(() => buildVersionLineageTree(detail), [detail]);

  if (!tree) {
    return null;
  }

  return (
    <section className="mb-6 rounded-2xl border border-[#0067B1]/20 bg-[#0067B1]/5 p-4">
      <h2 className="text-sm font-bold text-zinc-900">{t("versions.center.lineage.title")}</h2>
      <p className="mt-1 text-xs text-zinc-600">{t("versions.center.lineage.hint")}</p>
      <ul className="mt-4">
        <LineageBranch node={tree} />
      </ul>
    </section>
  );
}
