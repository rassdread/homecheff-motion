"use client";

import { useCallback, useState } from "react";
import type { ProjectPlaybackDebugSummary } from "@/types/animation-api";

type AdminPlaybackDebugPayload = ProjectPlaybackDebugSummary & {
  projectId: string;
  languageExports?: Array<{
    id: string;
    languageCode: string;
    languageLabel: string;
    status: string;
    outputVideoUrl: string | null;
  }>;
  segmentTimeline?: unknown;
  finalAssemblyReport?: {
    ok: boolean;
    imageCount: number;
    expectedTransitionCount: number;
    uploadedImages: Array<{ imageNumber: number; imageId: string; order: number }>;
    transitions: Array<{
      label: string;
      providerPresent: boolean;
      concatIncluded: boolean;
      error?: string | null;
    }>;
  };
};

type Props = {
  projectId: string;
  detailPlayback?: ProjectPlaybackDebugSummary;
};

function DebugRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="grid gap-0.5 border-b border-zinc-100 py-2 text-xs last:border-0">
      <span className="font-medium text-zinc-500">{label}</span>
      <code className="break-all text-zinc-800">{value?.trim() ? value : "—"}</code>
    </div>
  );
}

export function PlaybackDebugPanel({ projectId, detailPlayback }: Props) {
  const [adminDebug, setAdminDebug] = useState<AdminPlaybackDebugPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const loadAdminDebug = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(
        `/api/admin/instant-premium/projects/${encodeURIComponent(projectId)}/playback-debug`,
        { credentials: "include" }
      );
      const body = (await res.json().catch(() => ({}))) as AdminPlaybackDebugPayload & {
        error?: string;
      };
      if (!res.ok) {
        setLoadError(body.error ?? "Failed to load playback debug.");
        return;
      }
      setAdminDebug(body);
    } catch {
      setLoadError("Failed to load playback debug.");
    }
  }, [projectId]);

  const openPanel = useCallback(() => {
    setOpen(true);
    if (!adminDebug) {
      void loadAdminDebug();
    }
  }, [adminDebug, loadAdminDebug]);

  const playback = adminDebug ?? detailPlayback;
  if (!playback && !open) {
    return (
      <button
        type="button"
        onClick={openPanel}
        className="mt-3 text-xs font-medium text-amber-800 underline"
      >
        Show playback debug (admin)
      </button>
    );
  }

  const selectedLangUrl =
    adminDebug?.languageExports?.find((e) => e.status === "completed" && e.outputVideoUrl)?.outputVideoUrl ??
    null;

  return (
    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-amber-950">Playback debug (admin)</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void loadAdminDebug()}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              if (!open) {
                openPanel();
              } else {
                setOpen(false);
              }
            }}
            className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900"
          >
            {open ? "Collapse" : "Expand"}
          </button>
        </div>
      </div>
      {loadError ? <p className="mt-2 text-xs text-red-700">{loadError}</p> : null}
      {open && playback ? (
        <div className="mt-3 max-h-[28rem] overflow-y-auto rounded-lg border border-amber-100 bg-white p-3">
          <DebugRow label="project.finalVideoUrl (resolved export)" value={playback.finalVideoUrl} />
          <DebugRow label="latest export outputVideoUrl (resolved)" value={playback.exportOutputVideoUrl} />
          <DebugRow label="latest export outputVideoUrl (raw DB)" value={playback.exportOutputVideoUrlRaw} />
          <DebugRow
            label="export id / status / updatedAt"
            value={
              playback.latestExport
                ? `${playback.latestExport.id} · ${playback.latestExport.status} · ${playback.latestExport.updatedAt}`
                : null
            }
          />
          <DebugRow label="instantFinalRebuildCount" value={String(playback.rebuildCount)} />
          <DebugRow label="instantFinalRebuiltAt" value={playback.rebuiltAt} />
          <DebugRow label="instantPreviousFinalVideoUrl (resolved)" value={playback.previousFinalVideoUrl} />
          <DebugRow label="instantPreviousFinalVideoUrl (raw)" value={playback.previousFinalVideoUrlRaw} />
          <DebugRow label="selected playback URL" value={playback.selectedPlaybackUrl} />
          <DebugRow label="selected playback source" value={playback.selectedPlaybackSource} />
          <DebugRow label="language export URL (first completed)" value={selectedLangUrl} />
          <DebugRow label="video player key / cacheBust" value={playback.cacheBust} />
          {"latestRebuildStatus" in playback ? (
            <>
              <DebugRow
                label="latest rebuild status"
                value={(playback as AdminPlaybackDebugPayload).latestRebuildStatus}
              />
              <DebugRow
                label="export timeout (EXPORT_TIMEOUT_MS)"
                value={String((playback as AdminPlaybackDebugPayload).exportTimeoutMs)}
              />
              <DebugRow
                label="active export stage / elapsed"
                value={
                  (playback as AdminPlaybackDebugPayload).activeExportStage
                    ? `${(playback as AdminPlaybackDebugPayload).activeExportStage} · ${(playback as AdminPlaybackDebugPayload).activeExportStageElapsedMs ?? 0}ms`
                    : null
                }
              />
              <DebugRow
                label="active ffmpeg command"
                value={(playback as AdminPlaybackDebugPayload).activeFfmpegCommand}
              />
              <DebugRow
                label="active segment index"
                value={
                  (playback as AdminPlaybackDebugPayload).activeSegment != null
                    ? String((playback as AdminPlaybackDebugPayload).activeSegment)
                    : null
                }
              />
              <DebugRow
                label="latest export error"
                value={(playback as AdminPlaybackDebugPayload).latestExportError}
              />
              <DebugRow
                label="rebuildId / workspace"
                value={
                  (playback as AdminPlaybackDebugPayload).rebuildId
                    ? `${(playback as AdminPlaybackDebugPayload).rebuildId} · ${(playback as AdminPlaybackDebugPayload).rebuildWorkspace ?? "—"}`
                    : null
                }
              />
              <DebugRow
                label="previous final hash"
                value={(playback as AdminPlaybackDebugPayload).previousFinalHash}
              />
              <DebugRow
                label="final hash"
                value={(playback as AdminPlaybackDebugPayload).finalHash}
              />
              <DebugRow
                label="identicalOutputDetected"
                value={String((playback as AdminPlaybackDebugPayload).identicalOutputDetected ?? false)}
              />
              <DebugRow
                label="segment hashes"
                value={
                  (playback as AdminPlaybackDebugPayload).segmentHashes?.length
                    ? (playback as AdminPlaybackDebugPayload).segmentHashes!.join("\n")
                    : null
                }
              />
            </>
          ) : null}
          {adminDebug?.finalAssemblyReport ? (
            <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs">
              <p
                className={`font-semibold ${adminDebug.finalAssemblyReport.ok ? "text-emerald-800" : "text-red-800"}`}
              >
                Final assembly timeline
                {adminDebug.finalAssemblyReport.ok ? " · OK" : " · ERROR"}
              </p>
              <p className="mt-1 text-zinc-600">
                Uploaded images:{" "}
                {adminDebug.finalAssemblyReport.uploadedImages
                  .map((img) => String(img.imageNumber))
                  .join(", ")}
              </p>
              <ul className="mt-2 space-y-1">
                {adminDebug.finalAssemblyReport.transitions.map((row) => (
                  <li
                    key={row.label}
                    className={
                      row.error
                        ? "text-red-700"
                        : row.concatIncluded && row.providerPresent
                          ? "text-emerald-800"
                          : "text-zinc-700"
                    }
                  >
                    {row.label}: provider {row.providerPresent ? "present" : "missing"} · concat{" "}
                    {row.concatIncluded ? "included" : "missing"}
                    {row.error ? ` (${row.error})` : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {adminDebug?.segmentTimeline ? (
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-medium text-zinc-600">segmentTimeline</summary>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-50 p-2 text-[10px]">
                {JSON.stringify(adminDebug.segmentTimeline, null, 2)}
              </pre>
            </details>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
