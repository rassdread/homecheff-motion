"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { buildDirectorProposal } from "@/lib/studio-director-proposal-builder";
import { applyDirectorProposal } from "@/lib/studio-director-proposal-apply";
import {
  buildAssetEvolutionCompare,
  buildStoryboardAssetEvolution,
  evolutionKindTitleKey,
  evolutionStatusIcon,
  mergeUsageFromMemory,
} from "@/lib/studio-asset-evolution";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type {
  AssetEvolutionEntry,
  AssetEvolutionKind,
  AssetEvolutionSection,
} from "@/types/studio-asset-evolution";
import type { StudioDirectorProposal } from "@/types/studio-director-proposal";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  memory?: StudioProjectMemorySnapshot | null;
  canModify?: boolean;
  onApplied?: () => void | Promise<void>;
  onSwitchTool?: (tool: StudioToolId) => void;
};

const KIND_TOOL: Record<AssetEvolutionKind, StudioToolId> = {
  character: "characters",
  location: "locations",
  prop: "props",
  world: "world",
};

function EntryRow({
  entry,
  kind,
  memory,
}: {
  entry: AssetEvolutionEntry;
  kind: AssetEvolutionKind;
  memory?: StudioProjectMemorySnapshot | null;
}) {
  const t = useActiveTranslator();
  const enriched = mergeUsageFromMemory(entry, memory ?? undefined, kind);
  const displayName =
    enriched.name.trim() ||
    t("studio.assetEvolution.stillMissing");

  return (
    <li className="flex items-start gap-2 text-xs text-zinc-700">
      <span className="shrink-0 font-semibold text-zinc-500">
        {evolutionStatusIcon(enriched.status)}
      </span>
      <div>
        <p className="font-medium text-zinc-900">{displayName}</p>
        {enriched.usageStoryboardCount !== undefined && enriched.usageStoryboardCount > 0 ?
          <p className="text-[10px] text-zinc-500">
            {t("studio.assetEvolution.usage", {
              storyboards: String(enriched.usageStoryboardCount),
              renders: String(enriched.usageRenderCount ?? 0),
            })}
          </p>
        : null}
        {enriched.sceneOrders && enriched.sceneOrders.length > 0 ?
          <p className="text-[10px] text-zinc-500">
            {t("studio.assetEvolution.scenes", {
              list: enriched.sceneOrders.map((o) => String(o + 1)).join(", "),
            })}
          </p>
        : null}
      </div>
    </li>
  );
}

function SectionBlock({
  section,
  memory,
  compareLabel,
}: {
  section: AssetEvolutionSection;
  memory?: StudioProjectMemorySnapshot | null;
  compareLabel?: "current" | "proposed";
}) {
  const t = useActiveTranslator();
  const titleKey = evolutionKindTitleKey(section.kind) as TranslationKey;
  const allEntries = [...section.present, ...section.recommended, ...section.missing];

  if (allEntries.length === 0 && !compareLabel) {
    return null;
  }

  return (
    <article className="rounded-xl border border-zinc-100 bg-white px-3 py-2">
      <h4 className="text-xs font-semibold text-zinc-900">
        {compareLabel ?
          `${t(titleKey)} · ${t(
            compareLabel === "current"
              ? "studio.assetEvolution.compare.current"
              : "studio.assetEvolution.compare.proposal"
          )}`
        : t(titleKey)}
      </h4>
      {allEntries.length === 0 ?
        <p className="mt-1 text-[10px] text-zinc-500">{t("studio.assetEvolution.empty")}</p>
      : (
        <ul className="mt-2 space-y-1.5">
          {allEntries.map((entry) => (
            <EntryRow key={entry.id} entry={entry} kind={section.kind} memory={memory} />
          ))}
        </ul>
      )}
    </article>
  );
}

function CompareColumn({
  labelKey,
  sections,
  memory,
  column,
}: {
  labelKey: TranslationKey;
  sections: AssetEvolutionSection[];
  memory?: StudioProjectMemorySnapshot | null;
  column: "current" | "proposed";
}) {
  const t = useActiveTranslator();

  return (
    <div className="min-w-0 flex-1">
      <h3 className="text-sm font-semibold text-zinc-900">{t(labelKey)}</h3>
      <div className="mt-2 space-y-2">
        {sections.map((section) => (
          <SectionBlock
            key={`${column}-${section.kind}`}
            section={section}
            memory={memory}
            compareLabel={column}
          />
        ))}
      </div>
    </div>
  );
}

export function StudioWorkspaceAssetEvolutionPanel({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  memory,
  canModify,
  onApplied,
  onSwitchTool,
}: Props) {
  const t = useActiveTranslator();
  const [proposal, setProposal] = useState<StudioDirectorProposal | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const baseParams = useMemo(
    () => ({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      memory: memory ?? undefined,
    }),
    [storyboard, characters, locations, props, worlds, memory]
  );

  const evolution = useMemo(
    () => buildStoryboardAssetEvolution(baseParams),
    [baseParams]
  );

  const compare = useMemo(() => {
    if (!proposal) {
      return null;
    }
    return buildAssetEvolutionCompare({ ...baseParams, proposal });
  }, [baseParams, proposal]);

  const handleGenerateProposal = () => {
    const idea =
      storyboard.aiDirectorPrompt?.trim() ||
      `${storyboard.title} ${storyboard.description}`.trim();
    const built = buildDirectorProposal({
      idea,
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: memory ?? undefined,
      t: (key, params) => t(key as TranslationKey, params),
    });
    if (!built) {
      return;
    }
    setProposal(built);
    setCompareOpen(true);
  };

  const handleApplyAssets = useCallback(async () => {
    if (!canModify || !proposal) {
      setCompareOpen(false);
      return;
    }
    setBusy(true);
    try {
      await applyDirectorProposal({
        storyboardId: storyboard.id,
        proposal,
        mode: "assets",
        existingScenes: storyboard.scenes,
        t: (key, params) => t(key as TranslationKey, params),
      });
      setCompareOpen(false);
      await onApplied?.();
    } finally {
      setBusy(false);
    }
  }, [canModify, onApplied, proposal, storyboard.id, storyboard.scenes, t]);

  const openLibrary = (kind: AssetEvolutionKind) => {
    onSwitchTool?.(KIND_TOOL[kind]);
  };

  return (
    <>
      <section className="mb-6 rounded-2xl border border-emerald-200/70 bg-gradient-to-b from-emerald-50/50 to-white p-4 shadow-sm">
        <h3 className="text-base font-bold text-emerald-950">
          {t("studio.assetEvolution.title")}
        </h3>
        <p className="mt-1 text-xs text-emerald-900/80">{t("studio.assetEvolution.hint")}</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {evolution.sections.map((section) => (
            <SectionBlock key={section.kind} section={section} memory={memory} />
          ))}
        </div>

        {evolution.continuityAdvice.length > 0 ?
          <ul className="mt-4 space-y-1 text-xs text-amber-900">
            {evolution.continuityAdvice.map((item) => (
              <li key={item.code}>
                → {t(item.messageKey as TranslationKey)}
                {item.sceneOrders.length > 0 ?
                  ` (${item.sceneOrders.map((o) => o + 1).join(", ")})`
                : ""}
              </li>
            ))}
          </ul>
        : null}

        {canModify ?
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleGenerateProposal}
              className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
            >
              {t("studio.assetEvolution.generateProposal")}
            </button>
            {(["character", "location", "prop", "world"] as AssetEvolutionKind[]).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => openLibrary(kind)}
                className="rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-950"
              >
                {t(evolutionKindTitleKey(kind) as TranslationKey)}
              </button>
            ))}
          </div>
        : null}
      </section>

      {compareOpen && compare ?
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
            <header className="border-b border-zinc-100 px-5 py-4">
              <h2 className="text-lg font-semibold text-zinc-900">
                {t("studio.assetEvolution.compare.title")}
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                {t("studio.assetEvolution.compare.subtitle")}
              </p>
            </header>
            <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto px-5 py-4 sm:flex-row">
              <CompareColumn
                labelKey="studio.assetEvolution.compare.current"
                sections={compare.current.sections}
                memory={memory}
                column="current"
              />
              <CompareColumn
                labelKey="studio.assetEvolution.compare.proposal"
                sections={compare.proposed.sections}
                memory={memory}
                column="proposed"
              />
            </div>
            <footer className="flex flex-wrap gap-2 border-t border-zinc-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setCompareOpen(false)}
                disabled={busy}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                {t("studio.assetEvolution.compare.cancel")}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleApplyAssets()}
                className="rounded-lg bg-[#006D52] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {busy
                  ? t("studio.assetEvolution.compare.applying")
                  : t("studio.assetEvolution.compare.apply")}
              </button>
              <button
                type="button"
                onClick={() => onSwitchTool?.("characters")}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                {t("studio.assetEvolution.openLibrary")}
              </button>
              <button
                type="button"
                onClick={() => onSwitchTool?.("characters")}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
              >
                {t("studio.assetEvolution.createNew")}
              </button>
            </footer>
          </div>
        </div>
      : null}
    </>
  );
}
