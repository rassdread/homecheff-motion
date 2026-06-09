"use client";

import { useRef, useState } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  addPublishOverlay,
  duplicatePublishOverlay,
  patchPublishOverlay,
  removePublishOverlay,
  reorderPublishOverlayZIndex,
} from "@/lib/publish-overlay-timeline";
import { savePublishProject } from "@/lib/publish-overlay-session";
import type { PublishOverlay, PublishProject } from "@/types/publish-overlay";

type Props = {
  project: PublishProject;
  onProjectChange: (project: PublishProject) => void;
  onBack: () => void;
};

export function PublishOverlayWorkspace({ project, onProjectChange, onBack }: Props) {
  const t = useActiveTranslator();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(project.overlays[0]?.id ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [saveMsg, setSaveMsg] = useState("");
  const selected = project.overlays.find((o) => o.id === selectedId) ?? null;

  const persist = (next: PublishProject) => {
    const saved = savePublishProject(next);
    onProjectChange(saved);
    return saved;
  };

  const visibleOverlays = project.overlays.filter(
    (o) => currentTime >= o.startTime && currentTime <= o.endTime
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("suite.breadcrumb.publish")}</p>
          <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onBack} className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold">
            {t("publish.back")}
          </button>
          <button
            type="button"
            onClick={() => {
              persist(project);
              setSaveMsg(t("publish.saveDraftSuccess"));
            }}
            className="rounded-full bg-[#0067B1] px-4 py-2 text-sm font-semibold text-white"
          >
            {t("publish.saveDraft")}
          </button>
        </div>
      </header>

      {saveMsg ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{saveMsg}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-black">
            <video
              ref={videoRef}
              src={project.videoUrl}
              className="h-full w-full object-contain"
              controls
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            />
            <div className="pointer-events-none absolute inset-[5%] border border-dashed border-white/30" aria-hidden />
            {visibleOverlays.map((o) => (
              <div
                key={o.id}
                className={`pointer-events-auto absolute cursor-move border-2 px-2 py-1 text-white ${
                  selectedId === o.id ? "border-[#0067B1]" : "border-transparent"
                } ${o.safeAreaStatus === "fail" ? "ring-2 ring-red-500" : o.safeAreaStatus === "warning" ? "ring-2 ring-amber-400" : ""}`}
                style={{
                  left: `${o.x * 100}%`,
                  top: `${o.y * 100}%`,
                  width: `${o.width * 100}%`,
                  minHeight: `${o.height * 100}%`,
                  zIndex: o.zIndex,
                  fontSize: o.style.fontSize,
                  color: o.style.color,
                  backgroundColor: o.style.backgroundColor ?? "rgba(0,0,0,0.45)",
                  textAlign: o.style.textAlign,
                }}
                onMouseDown={() => setSelectedId(o.id)}
              >
                {o.text}
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => persist(addPublishOverlay(project, "text"))} className="rounded-full border px-3 py-1.5 text-sm font-semibold">
              {t("publish.addText")}
            </button>
            <button type="button" onClick={() => persist(addPublishOverlay(project, "title"))} className="rounded-full border px-3 py-1.5 text-sm font-semibold">
              {t("publish.addTitle")}
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
            <p className="text-xs font-semibold uppercase text-zinc-500">{t("publish.timeline")}</p>
            <input
              type="range"
              min={0}
              max={project.durationSeconds}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const t = Number(e.target.value);
                setCurrentTime(t);
                if (videoRef.current) {
                  videoRef.current.currentTime = t;
                }
              }}
              className="mt-2 w-full"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("publish.properties")}</p>
          {selected ?
            <OverlayProperties
              overlay={selected}
              duration={project.durationSeconds}
              onPatch={(patch) => persist(patchPublishOverlay(project, selected.id, patch))}
              onDelete={() => {
                persist(removePublishOverlay(project, selected.id));
                setSelectedId(null);
              }}
              onDuplicate={() => persist(duplicatePublishOverlay(project, selected.id))}
              onZ={(dir) => persist(reorderPublishOverlayZIndex(project, selected.id, dir))}
            />
          : <p className="mt-2 text-sm text-zinc-500">{t("publish.selectOverlay")}</p>}
        </div>
      </div>
    </div>
  );
}

function OverlayProperties({
  overlay,
  duration,
  onPatch,
  onDelete,
  onDuplicate,
  onZ,
}: {
  overlay: PublishOverlay;
  duration: number;
  onPatch: (patch: Partial<PublishOverlay>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onZ: (dir: "forward" | "backward") => void;
}) {
  const t = useActiveTranslator();
  return (
    <div className="mt-3 space-y-3 text-sm">
      <label className="block">
        <span className="text-zinc-600">{t("publish.field.text")}</span>
        <textarea
          value={overlay.text}
          onChange={(e) => onPatch({ text: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-200 p-2"
          rows={3}
        />
      </label>
      <label className="block">
        <span className="text-zinc-600">{t("publish.field.start")}</span>
        <input type="number" step={0.1} min={0} max={duration} value={overlay.startTime} onChange={(e) => onPatch({ startTime: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2" />
      </label>
      <label className="block">
        <span className="text-zinc-600">{t("publish.field.end")}</span>
        <input type="number" step={0.1} min={0} max={duration} value={overlay.endTime} onChange={(e) => onPatch({ endTime: Number(e.target.value) })} className="mt-1 w-full rounded-lg border p-2" />
      </label>
      <label className="block">
        <span className="text-zinc-600">X</span>
        <input type="range" min={0} max={1} step={0.01} value={overlay.x} onChange={(e) => onPatch({ x: Number(e.target.value) })} className="mt-1 w-full" />
      </label>
      <label className="block">
        <span className="text-zinc-600">Y</span>
        <input type="range" min={0} max={1} step={0.01} value={overlay.y} onChange={(e) => onPatch({ y: Number(e.target.value) })} className="mt-1 w-full" />
      </label>
      {overlay.safeAreaStatus !== "ok" ?
        <p className="text-amber-800">{t("publish.safeAreaWarning")}</p>
      : null}
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onZ("forward")} className="rounded-full border px-2 py-1 text-xs">{t("publish.bringForward")}</button>
        <button type="button" onClick={() => onZ("backward")} className="rounded-full border px-2 py-1 text-xs">{t("publish.sendBackward")}</button>
        <button type="button" onClick={onDuplicate} className="rounded-full border px-2 py-1 text-xs">{t("publish.duplicate")}</button>
        <button type="button" onClick={onDelete} className="rounded-full border border-red-200 px-2 py-1 text-xs text-red-700">{t("publish.delete")}</button>
      </div>
    </div>
  );
}
