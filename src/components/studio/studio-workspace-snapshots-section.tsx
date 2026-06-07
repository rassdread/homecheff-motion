"use client";

import { useCallback, useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import type { TranslationKey } from "@/i18n";
import { loadAssetDecisionRegistry } from "@/lib/studio-asset-decision-storage";
import { buildStudioSnapshot } from "@/lib/studio-snapshot-builder";
import { compareSnapshotToCurrent, compareStudioSnapshots } from "@/lib/studio-snapshot-compare";
import { restoreStudioSnapshot } from "@/lib/studio-snapshot-recovery";
import { listStudioSnapshots, saveStudioSnapshot } from "@/lib/studio-snapshot-storage";
import type { StudioToolId } from "@/lib/studio-tool-id";
import type {
  StudioCharacterListItem,
  StudioLocationListItem,
  StudioPropListItem,
  StudioStoryboardDetail,
  StudioWorldProfileListItem,
} from "@/types/studio-api";
import type { StudioProjectMemorySnapshot } from "@/types/studio-project-memory";
import type { StudioProductionSnapshot } from "@/types/studio-production-snapshot";

type Props = {
  storyboard: StudioStoryboardDetail;
  characters: StudioCharacterListItem[];
  locations: StudioLocationListItem[];
  props: StudioPropListItem[];
  worlds: StudioWorldProfileListItem[];
  projectMemory?: StudioProjectMemorySnapshot | null;
  canModify?: boolean;
  compact?: boolean;
  onRestored?: () => void | Promise<void>;
  onSwitchTool?: (tool: StudioToolId) => void;
};

function formatWhen(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}

export function StudioWorkspaceSnapshotsSection({
  storyboard,
  characters,
  locations,
  props,
  worlds,
  projectMemory,
  canModify = true,
  compact = false,
  onRestored,
}: Props) {
  const t = useActiveTranslator();
  const locale = typeof navigator !== "undefined" ? navigator.language : "en";
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCompareId, setSelectedCompareId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messageKey, setMessageKey] = useState<TranslationKey | null>(null);

  const snapshots = useMemo(
    () => listStudioSnapshots(storyboard.id),
    [storyboard.id, refreshKey]
  );

  const currentSnapshot = useMemo(
    () =>
      buildStudioSnapshot({
        storyboard,
        characters,
        locations,
        props,
        worlds,
        projectMemory: projectMemory ?? undefined,
        assetDecisionRegistry: loadAssetDecisionRegistry({ storyboardId: storyboard.id }),
        source: "checkpoint",
        labelKey: "studio.snapshot.label.current",
        labelParams: { scenes: String(storyboard.scenes?.length ?? 0) },
      }),
    [storyboard, characters, locations, props, worlds, projectMemory]
  );

  const compareResult = useMemo(() => {
    if (!selectedCompareId) {
      return null;
    }
    const selected = snapshots.find((snapshot) => snapshot.id === selectedCompareId);
    if (!selected) {
      return null;
    }
    return compareSnapshotToCurrent(selected, currentSnapshot);
  }, [selectedCompareId, snapshots, currentSnapshot]);

  const handleCreateSnapshot = useCallback(() => {
    const snapshot = buildStudioSnapshot({
      storyboard,
      characters,
      locations,
      props,
      worlds,
      projectMemory: projectMemory ?? undefined,
      assetDecisionRegistry: loadAssetDecisionRegistry({ storyboardId: storyboard.id }),
      source: "manual",
      labelKey: "studio.snapshot.label.manual",
      labelParams: { scenes: String(storyboard.scenes?.length ?? 0) },
    });
    saveStudioSnapshot(snapshot);
    setRefreshKey((value) => value + 1);
    setMessageKey("studio.snapshot.action.created");
  }, [storyboard, characters, locations, props, worlds, projectMemory]);

  const handleRestore = useCallback(
    async (snapshot: StudioProductionSnapshot) => {
      if (!canModify) {
        return;
      }
      const confirmed = window.confirm(t("studio.snapshot.restore.confirm"));
      if (!confirmed) {
        return;
      }
      setBusyId(snapshot.id);
      setMessageKey(null);
      const result = await restoreStudioSnapshot({
        storyboardId: storyboard.id,
        snapshotId: snapshot.id,
        currentStoryboard: storyboard,
        snapshotInput: {
          characters,
          locations,
          props,
          worlds,
          projectMemory: projectMemory ?? undefined,
        },
      });
      setBusyId(null);
      if (result.ok) {
        setMessageKey("studio.snapshot.action.restored");
        setRefreshKey((value) => value + 1);
        await onRestored?.();
      } else {
        setMessageKey((result.errorKey as TranslationKey) ?? "studio.snapshot.restore.failed");
      }
    },
    [canModify, storyboard, characters, locations, props, worlds, projectMemory, onRestored, t]
  );

  const handleComparePair = useCallback(() => {
    if (snapshots.length < 2) {
      return;
    }
    const compare = compareStudioSnapshots(snapshots[1]!, snapshots[0]!);
    setSelectedCompareId(snapshots[1]!.id);
    if (!compare.hasChanges) {
      setMessageKey("studio.snapshot.compare.noChanges");
    }
  }, [snapshots]);

  return (
    <section className="rounded-2xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-900">{t("studio.snapshot.section.title")}</h3>
          <p className="mt-0.5 text-xs text-zinc-600">{t("studio.snapshot.section.subtitle")}</p>
        </div>
        {canModify ?
          <button
            type="button"
            onClick={handleCreateSnapshot}
            className="rounded-lg bg-[#0067B1] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#005a9a]"
          >
            {t("studio.snapshot.action.save")}
          </button>
        : null}
      </div>

      {messageKey ?
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          {t(messageKey)}
        </p>
      : null}

      {snapshots.length === 0 ?
        <p className="mt-3 text-sm text-zinc-600">{t("studio.snapshot.empty")}</p>
      : (
        <ul className={`mt-3 space-y-2 ${compact ? "" : ""}`}>
          {snapshots.slice(0, compact ? 3 : 8).map((snapshot) => (
            <li
              key={snapshot.id}
              className="rounded-xl border border-violet-100 bg-white/90 px-3 py-2.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {t(snapshot.labelKey as TranslationKey, snapshot.labelParams)}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatWhen(snapshot.savedAt, locale)} ·{" "}
                    {t("studio.snapshot.meta.scenes", {
                      count: String(snapshot.scenes.length),
                      duration: String(snapshot.plannerSummary.estimatedDurationSeconds),
                      shots: String(snapshot.plannerSummary.estimatedShotCount),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedCompareId(snapshot.id)}
                    className="text-xs font-semibold text-[#0067B1] hover:underline"
                  >
                    {t("studio.snapshot.action.compare")}
                  </button>
                  {canModify ?
                    <button
                      type="button"
                      disabled={busyId === snapshot.id}
                      onClick={() => void handleRestore(snapshot)}
                      className="text-xs font-semibold text-violet-800 hover:underline disabled:opacity-50"
                    >
                      {t("studio.snapshot.action.restore")}
                    </button>
                  : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!compact && snapshots.length >= 2 ?
        <button
          type="button"
          onClick={handleComparePair}
          className="mt-3 text-xs font-semibold text-[#0067B1] hover:underline"
        >
          {t("studio.snapshot.action.compareLatest")}
        </button>
      : null}

      {compareResult && compareResult.hasChanges ?
        <div className="mt-3 rounded-xl border border-zinc-200 bg-white p-3">
          <p className="text-sm font-medium text-zinc-900">{t("studio.snapshot.compare.title")}</p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-700">
            {compareResult.lines.map((line) => (
              <li key={line.id}>• {t(line.labelKey as TranslationKey, line.labelParams)}</li>
            ))}
          </ul>
        </div>
      : null}

      {compareResult && !compareResult.hasChanges && selectedCompareId ?
        <p className="mt-3 text-sm text-zinc-600">{t("studio.snapshot.compare.noChanges")}</p>
      : null}
    </section>
  );
}
