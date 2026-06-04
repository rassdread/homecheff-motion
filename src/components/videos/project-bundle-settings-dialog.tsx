"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import { previewBundleMembershipAfterRename } from "@/lib/project-display-title";
import type { UpdateProjectBundleSettingsResponse } from "@/types/animation-api";

type Peer = {
  id: string;
  title: string | null;
  bundleName?: string | null;
  bundleKey?: string | null;
  projectType: string | null;
};

type Props = {
  open: boolean;
  projectId: string;
  ownerId: string;
  projectType: string;
  initialTitle: string | null;
  initialBundleName: string | null;
  initialBundleKey: string | null;
  peers: Peer[];
  onClose: () => void;
  onSaved: (result: UpdateProjectBundleSettingsResponse) => void;
};

function BundleSettingsForm({
  projectId,
  ownerId,
  projectType,
  initialTitle,
  initialBundleName,
  initialBundleKey,
  peers,
  onClose,
  onSaved,
}: Omit<Props, "open">) {
  const t = useActiveTranslator();
  const [title, setTitle] = useState(initialTitle ?? "");
  const [bundleName, setBundleName] = useState(initialBundleName ?? "");
  const [bundleKey, setBundleKey] = useState(initialBundleKey ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      previewBundleMembershipAfterRename({
        ownerId,
        projectType,
        projectId,
        newTitle: title,
        newBundleName: bundleName,
        newBundleKey: bundleKey || null,
        peers,
      }),
    [bundleKey, bundleName, ownerId, peers, projectId, projectType, title]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bundle-settings-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 id="bundle-settings-title" className="text-lg font-semibold text-zinc-900">
          {t("projects.bundle.settingsTitle")}
        </h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-sm font-medium text-zinc-800" htmlFor="bundle-project-title">
              {t("projects.bundle.projectTitleLabel")}
            </label>
            <input
              id="bundle-project-title"
              type="text"
              maxLength={120}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800" htmlFor="bundle-name">
              {t("projects.bundle.bundleNameLabel")}
            </label>
            <input
              id="bundle-name"
              type="text"
              maxLength={120}
              value={bundleName}
              onChange={(e) => setBundleName(e.target.value)}
              placeholder={t("projects.bundle.bundleNamePlaceholder")}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-zinc-500">{t("projects.bundle.bundleNameHint")}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-zinc-800" htmlFor="bundle-key">
              {t("projects.bundle.bundleKeyLabel")}
            </label>
            <input
              id="bundle-key"
              type="text"
              maxLength={80}
              value={bundleKey}
              onChange={(e) => setBundleKey(e.target.value)}
              placeholder={t("projects.bundle.bundleKeyPlaceholder")}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm font-mono text-xs"
            />
            <p className="mt-1 text-xs text-zinc-500">{t("projects.bundle.bundleKeyHint")}</p>
          </div>
        </div>
        <p className="mt-3 rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          {preview.willJoinExisting
            ? t("videos.rename.previewJoin", {
                title: preview.bundleDisplayTitle,
                count: preview.existingVersionCount,
              })
            : t("videos.rename.previewNew")}
        </p>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700"
          >
            {t("videos.rename.cancel")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await fetch(`/api/animations/projects/${encodeURIComponent(projectId)}`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title,
                      bundleName,
                      bundleKey: bundleKey.trim() || null,
                    }),
                  });
                  const json: unknown = await res.json().catch(() => null);
                  if (!res.ok) {
                    throw new Error(
                      json && typeof json === "object" && "error" in json
                        ? String((json as { error: unknown }).error)
                        : t("videos.rename.failed")
                    );
                  }
                  onSaved(json as UpdateProjectBundleSettingsResponse);
                  onClose();
                } catch (e) {
                  setError(e instanceof Error ? e.message : t("videos.rename.failed"));
                } finally {
                  setBusy(false);
                }
              })();
            }}
            className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {busy ? t("videos.rename.busy") : t("projects.bundle.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProjectBundleSettingsDialog({ open, projectId, initialTitle, initialBundleName, initialBundleKey, ...rest }: Props) {
  if (!open) {
    return null;
  }
  return (
    <BundleSettingsForm
      key={`${projectId}:${initialTitle ?? ""}:${initialBundleName ?? ""}:${initialBundleKey ?? ""}`}
      projectId={projectId}
      initialTitle={initialTitle}
      initialBundleName={initialBundleName}
      initialBundleKey={initialBundleKey}
      {...rest}
    />
  );
}

/** @deprecated Use ProjectBundleSettingsDialog */
export const RenameProjectDialog = ProjectBundleSettingsDialog;
