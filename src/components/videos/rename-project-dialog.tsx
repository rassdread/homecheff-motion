"use client";

import { useMemo, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  previewBundleMembershipAfterRename,
  resolveProjectDisplayTitle,
} from "@/lib/project-display-title";

type Peer = { id: string; title: string | null; projectType: string | null };

type Props = {
  open: boolean;
  projectId: string;
  ownerId: string;
  projectType: string;
  initialTitle: string | null;
  peers: Peer[];
  onClose: () => void;
  onRenamed: (result: { displayTitle: string; title: string | null }) => void;
};

function RenameProjectDialogForm({
  projectId,
  ownerId,
  projectType,
  initialTitle,
  peers,
  onClose,
  onRenamed,
}: Omit<Props, "open">) {
  const t = useActiveTranslator();
  const [draft, setDraft] = useState(initialTitle ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(
    () =>
      previewBundleMembershipAfterRename({
        ownerId,
        projectType,
        projectId,
        newTitle: draft,
        peers,
      }),
    [draft, ownerId, peers, projectId, projectType]
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-project-dialog-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl">
        <h2 id="rename-project-dialog-title" className="text-lg font-semibold text-zinc-900">
          {t("videos.rename.title")}
        </h2>
        <label className="mt-4 block text-sm font-medium text-zinc-800" htmlFor="rename-project-input">
          {t("videos.rename.label")}
        </label>
        <input
          id="rename-project-input"
          type="text"
          value={draft}
          maxLength={120}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("videos.rename.placeholder")}
          className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm"
        />
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
                    body: JSON.stringify({ title: draft }),
                  });
                  const json: unknown = await res.json().catch(() => null);
                  if (!res.ok) {
                    throw new Error(
                      json && typeof json === "object" && "error" in json
                        ? String((json as { error: unknown }).error)
                        : t("videos.rename.failed")
                    );
                  }
                  const body = json as { displayTitle?: string; title?: string | null };
                  onRenamed({
                    displayTitle:
                      body.displayTitle ?? resolveProjectDisplayTitle(body.title ?? draft),
                    title: body.title ?? null,
                  });
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
            {busy ? t("videos.rename.busy") : t("videos.rename.save")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function RenameProjectDialog({ open, projectId, initialTitle, ...rest }: Props) {
  if (!open) {
    return null;
  }
  return (
    <RenameProjectDialogForm
      key={`${projectId}:${initialTitle ?? ""}`}
      projectId={projectId}
      initialTitle={initialTitle}
      {...rest}
    />
  );
}
