"use client";

import { useEffect, useState } from "react";
import { getAppBuildInfo } from "@/lib/app-build-info";
import { useConceptFlowDebug } from "@/hooks/use-concept-flow-debug";
import { shouldShowFullRerenderDraftDiagnostics } from "@/lib/full-rerender-draft-diagnostics";

type ConceptEditVersionDebugPanelProps = {
  isAdmin: boolean;
  expectedCommitSha?: string;
};

export function ConceptEditVersionDebugPanel({
  isAdmin,
  expectedCommitSha = "b1b6518",
}: ConceptEditVersionDebugPanelProps) {
  const flow = useConceptFlowDebug();
  const [build] = useState(getAppBuildInfo);
  const [apiBuild, setApiBuild] = useState<Record<string, string> | null>(null);

  const visible =
    shouldShowFullRerenderDraftDiagnostics(isAdmin) ||
    process.env.NEXT_PUBLIC_ENABLE_DEBUG_UI === "true";

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetch("/api/meta/build", { credentials: "include", cache: "no-store" })
        .then((r) => r.json())
        .then((json) => {
          if (!cancelled && json && typeof json === "object") {
            setApiBuild(json as Record<string, string>);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setApiBuild(null);
          }
        });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  const clientSha = build?.commitSha ?? "—";
  const deployMatch =
    expectedCommitSha.length >= 7 &&
    clientSha.toLowerCase().startsWith(expectedCommitSha.slice(0, 7).toLowerCase());

  return (
    <div className="mt-4 rounded-lg border border-violet-200 bg-violet-50 p-3 font-mono text-[10px] text-violet-950">
      <p className="text-xs font-semibold text-violet-900">Concept flow debug</p>
      <p className="mt-1 text-[10px] text-violet-800">
        Deploy marker {deployMatch ? "✓ matches" : "⚠ check"} expected prefix {expectedCommitSha}
      </p>
      <ul className="mt-2 space-y-0.5">
        <li>commitSha (client): {clientSha}</li>
        <li>deploymentId (client): {build?.deploymentId ?? "—"}</li>
        <li>buildTime (client): {build?.buildTime || "—"}</li>
        <li>vercelEnv: {build?.vercelEnv ?? "—"}</li>
        {apiBuild ?
          <>
            <li>commitSha (api): {String(apiBuild.commitSha ?? "—")}</li>
            <li>deploymentId (api): {String(apiBuild.deploymentId ?? "—")}</li>
            <li>serverTime: {String(apiBuild.serverTime ?? "—")}</li>
          </>
        : null}
        <li>projectId: {flow.projectId || "—"}</li>
        <li>projectLoaded: {String(flow.projectLoaded)}</li>
        <li>imagesCount: {flow.imagesCount}</li>
        <li>sessionResolved: {String(flow.sessionResolved)}</li>
        <li>sessionUser: {String(flow.sessionUser)}</li>
        <li>projectFetchPending: {String(flow.projectFetchPending)}</li>
        <li>editorMounted: {String(flow.editorMounted)}</li>
        <li>bootstrapStarted: {String(flow.bootstrapStarted)}</li>
        <li>bootstrapFinished: {String(flow.bootstrapFinished)}</li>
        <li>draftFetchPending: {String(flow.draftFetchPending)}</li>
        <li>loadState: {flow.loadState}</li>
        <li>slotsCount: {flow.slotsCount}</li>
        <li>lastStep: {flow.lastStep}</li>
        <li>lastError: {flow.lastError ?? "—"}</li>
      </ul>
    </div>
  );
}
