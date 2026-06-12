"use client";

import { useMemo, useRef, useState } from "react";
import { PublishAiAssistantPanel } from "@/components/publish/publish-ai-assistant-panel";
import { PublishOverlayDraggable } from "@/components/publish/publish-overlay-draggable";
import { PublishSafeZonePicker } from "@/components/publish/publish-safe-zone-picker";
import { useActiveTranslator } from "@/i18n/client";
import { applyChangePlanToPublishProject,
  loadPublishChangePlanFromMetadata,
  savePublishChangePlanToMetadata,
} from "@/lib/publish-change-plan-apply";
import { planHasPendingChanges } from "@/lib/publish-change-plan";
import {
  addPublishOverlay,
  duplicatePublishOverlay,
  patchPublishOverlay,
  removePublishOverlay,
  reorderPublishOverlayZIndex,
} from "@/lib/publish-overlay-timeline";
import { savePublishProject } from "@/lib/publish-overlay-session";
import {
  deleteTimelineItem,
  duplicateTimelineItem,
  loadPublishTimelineFromProject,
  patchTimelineItem,
  savePublishTimelineToProject,
  applyTimelineToPublishProject,
  timelineHasPendingRender,
  toggleTimelineItemLock,
} from "@/lib/publish-timeline";
import { DEFAULT_PUBLISH_TEXT_STYLE } from "@/lib/publish-text-styling";
import { PublishTimelinePanel } from "@/components/publish/publish-timeline-panel";
import { PublishTextStylingPanel } from "@/components/publish/publish-text-styling-panel";
import {
  analyzePublishVideoFrames,
} from "@/lib/publish-video-analysis";
import {
  resolvePublishOrientation,
  zoneToOverlayPosition,
  type PublishSafeZoneId,
} from "@/lib/publish-safe-zone-v2";
import type { PublishOverlay, PublishProject } from "@/types/publish-overlay";
import type { HomeCheffProjectPackage } from "@/types/homecheff-project-package";

type Props = {
  project: PublishProject;
  hcProject?: HomeCheffProjectPackage | null;
  onProjectChange: (project: PublishProject) => void;
  onBack: () => void;
};

export function PublishOverlayWorkspace({ project, hcProject, onProjectChange, onBack }: Props) {
  const t = useActiveTranslator();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(project.overlays[0]?.id ?? null);
  const [currentTime, setCurrentTime] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [saveMsg, setSaveMsg] = useState("");
  const [exportBusy, setExportBusy] = useState(false);
  const [selectedZone, setSelectedZone] = useState<PublishSafeZoneId | undefined>();
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const selected = project.overlays.find((o) => o.id === selectedId) ?? null;

  const timeline = useMemo(() => loadPublishTimelineFromProject(project), [project]);
  const selectedTimelineItem = timeline.items.find((i) => i.id === selectedTimelineId) ?? null;

  const changePlan = useMemo(() => loadPublishChangePlanFromMetadata(project), [project]);
  const pendingRender = (changePlan ? planHasPendingChanges(changePlan) : false) || timelineHasPendingRender(timeline);

  const aspectRatio = 9 / 16;
  const orientation = resolvePublishOrientation(aspectRatio);
  const videoAnalysis = useMemo(
    () =>
      analyzePublishVideoFrames({
        durationSec: project.durationSeconds || 5,
        aspectRatio,
        hasExistingText: project.overlays.some((o) => o.text?.trim()),
      }),
    [project.durationSeconds, project.overlays]
  );

  const mediaKind = project.mediaKind ?? "video";
  const carouselUrls = project.imageUrls?.length ? project.imageUrls : project.imageUrl ? [project.imageUrl] : [];
  const previewImageUrl =
    mediaKind === "carousel"
      ? carouselUrls[carouselIndex] ?? carouselUrls[0]
      : project.imageUrl ?? carouselUrls[0];
  const isVideo = mediaKind === "video" && Boolean(project.videoUrl);

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
            disabled={exportBusy}
            onClick={async () => {
              setExportBusy(true);
              let exportProject = project;
              if (changePlan && planHasPendingChanges(changePlan)) {
                exportProject = applyChangePlanToPublishProject(project, changePlan, { orientation });
                exportProject = savePublishChangePlanToMetadata(
                  { ...exportProject, metadata: { ...exportProject.metadata, changePlan: { ...changePlan, pendingRender: false } } },
                  { ...changePlan, pendingRender: false }
                );
              }
              if (timelineHasPendingRender(loadPublishTimelineFromProject(exportProject))) {
                exportProject = applyTimelineToPublishProject(exportProject);
              }
              persist(exportProject);
              try {
                const res = await fetch("/api/publish/export", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ project: exportProject }),
                });
                if (!res.ok) {
                  setSaveMsg(t("publish.exportFallback"));
                  return;
                }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const link = window.document.createElement("a");
                link.href = url;
                link.download = `${project.name}-publish.mp4`;
                link.click();
                URL.revokeObjectURL(url);
                setSaveMsg(t("publish.exportSuccess"));
              } catch {
                setSaveMsg(t("publish.exportFallback"));
              } finally {
                setExportBusy(false);
              }
            }}
            className="rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-60"
          >
            {exportBusy ? t("button.loading") : t("publish.export")}
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

      {pendingRender ?
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("publish.ai.pendingRender" as never)}
        </p>
      : null}

      <PublishAiAssistantPanel
        project={project}
        hcProject={hcProject}
        onPlanSaved={(next) => persist(next)}
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div
            ref={canvasRef}
            className="relative aspect-video overflow-hidden rounded-2xl border border-zinc-200 bg-black"
            onClick={() => setSelectedId(null)}
          >
            {isVideo ?
              <video
                ref={videoRef}
                src={project.videoUrl}
                className="h-full w-full object-contain"
                controls
                onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
              />
            : previewImageUrl ?
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewImageUrl} alt="" className="h-full w-full object-contain" />
            : null}
            <div className="pointer-events-none absolute inset-[5%] border border-dashed border-white/30" aria-hidden />
            <div className="pointer-events-none absolute inset-x-[10%] top-1/2 h-px bg-white/20" aria-hidden />
            <div className="pointer-events-none absolute inset-y-[10%] left-1/2 w-px bg-white/20" aria-hidden />
            {visibleOverlays.map((o) => (
              <PublishOverlayDraggable
                key={o.id}
                overlay={o}
                selected={selectedId === o.id}
                containerRef={canvasRef}
                onSelect={() => setSelectedId(o.id)}
                onPatch={(patch) => persist(patchPublishOverlay(project, o.id, patch))}
              />
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

          {mediaKind === "carousel" && carouselUrls.length > 1 ?
            <div className="mt-3 flex flex-wrap gap-2">
              {carouselUrls.map((url, index) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setCarouselIndex(index)}
                  className={`rounded-lg border px-2 py-1 text-xs font-semibold ${carouselIndex === index ? "border-[#0067B1] bg-sky-50" : "border-zinc-200"}`}
                >
                  {t("publish.carouselFrame" as never, { index: index + 1 } as never)}
                </button>
              ))}
            </div>
          : null}

          <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-3">
            <PublishTimelinePanel
              timeline={timeline}
              selectedId={selectedTimelineId}
              playhead={currentTime}
              onSelect={setSelectedTimelineId}
              onPatchItem={(id, patch) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, patchTimelineItem(tl, id, patch)));
              }}
              onDeleteItem={(id) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, deleteTimelineItem(tl, id)));
                if (selectedTimelineId === id) setSelectedTimelineId(null);
              }}
              onDuplicateItem={(id) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, duplicateTimelineItem(tl, id)));
              }}
              onToggleLock={(id) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, toggleTimelineItemLock(tl, id)));
              }}
            />
            <input
              type="range"
              min={0}
              max={project.durationSeconds}
              step={0.1}
              value={currentTime}
              onChange={(e) => {
                const nextTime = Number(e.target.value);
                setCurrentTime(nextTime);
                if (videoRef.current) {
                  videoRef.current.currentTime = nextTime;
                }
              }}
              className="mt-2 w-full"
              disabled={!isVideo && mediaKind !== "carousel" && mediaKind !== "image"}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">{t("publish.properties")}</p>
          <PublishSafeZonePicker
            aspectRatio={aspectRatio}
            selectedZone={selectedZone}
            occupiedZones={videoAnalysis.occupiedZones}
            onSelectZone={(zone) => {
              setSelectedZone(zone);
              if (selected) {
                const pos = zoneToOverlayPosition(zone, orientation);
                persist(patchPublishOverlay(project, selected.id, { x: pos.x, y: pos.y }));
              }
            }}
          />
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
          : selectedTimelineItem && (selectedTimelineItem.kind === "text" || selectedTimelineItem.kind === "title" || selectedTimelineItem.kind === "cta") ?
            <PublishTextStylingPanel
              text={selectedTimelineItem.text ?? ""}
              style={selectedTimelineItem.style ?? DEFAULT_PUBLISH_TEXT_STYLE}
              locked={selectedTimelineItem.locked}
              onTextChange={(text) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, patchTimelineItem(tl, selectedTimelineItem.id, { text, label: text.slice(0, 24) || "Text" })));
              }}
              onStyleChange={(style) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, patchTimelineItem(tl, selectedTimelineItem.id, { style })));
              }}
              onLockedChange={(locked) => {
                const tl = loadPublishTimelineFromProject(project);
                persist(savePublishTimelineToProject(project, patchTimelineItem(tl, selectedTimelineItem.id, { locked })));
              }}
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
          className="hc-stable-field mt-1 w-full rounded-lg border border-zinc-200 p-2"
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
