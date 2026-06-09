"use client";

import { useRef } from "react";
import { useActiveTranslator } from "@/i18n/client";
import {
  addPublishSubtitle,
  parseSrtContent,
  parseVttContent,
  patchPublishSubtitle,
} from "@/lib/publish-overlay-timeline";
import { savePublishProject } from "@/lib/publish-overlay-session";
import type { PublishProject } from "@/types/publish-overlay";

type Props = {
  project: PublishProject;
  onProjectChange: (project: PublishProject) => void;
};

export function PublishSubtitlePanel({ project, onProjectChange }: Props) {
  const t = useActiveTranslator();
  const videoRef = useRef<HTMLVideoElement>(null);

  const persist = (next: PublishProject) => onProjectChange(savePublishProject(next));

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <video ref={videoRef} src={project.videoUrl} className="aspect-video w-full rounded-2xl bg-black" controls />
        <p className="mt-2 text-xs text-zinc-500">{t("publish.subtitle.sttFuture")}</p>
      </div>
      <div className="rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">{t("publish.subtitle.list")}</h2>
          <button type="button" onClick={() => persist(addPublishSubtitle(project))} className="rounded-full bg-[#0067B1] px-3 py-1 text-xs font-semibold text-white">
            {t("publish.subtitle.add")}
          </button>
        </div>
        <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
          {project.subtitles.map((s) => (
            <li key={s.id} className="rounded-lg border border-zinc-100 p-2">
              <button
                type="button"
                className="text-left text-xs text-zinc-500"
                onClick={() => {
                  if (videoRef.current) {
                    videoRef.current.currentTime = s.startTime;
                  }
                }}
              >
                {s.startTime.toFixed(1)}s – {s.endTime.toFixed(1)}s · {s.language}
              </button>
              <textarea
                value={s.text}
                onChange={(e) => persist(patchPublishSubtitle(project, s.id, { text: e.target.value }))}
                className="mt-1 w-full rounded border p-1 text-sm"
                rows={2}
              />
              <div className="mt-1 flex gap-2">
                <input type="number" step={0.1} value={s.startTime} onChange={(e) => persist(patchPublishSubtitle(project, s.id, { startTime: Number(e.target.value) }))} className="w-20 rounded border p-1 text-xs" />
                <input type="number" step={0.1} value={s.endTime} onChange={(e) => persist(patchPublishSubtitle(project, s.id, { endTime: Number(e.target.value) }))} className="w-20 rounded border p-1 text-xs" />
              </div>
              {s.safeAreaStatus !== "ok" ? <p className="mt-1 text-xs text-amber-800">{t("publish.safeAreaWarning")}</p> : null}
            </li>
          ))}
        </ul>
        <label className="mt-4 block text-xs font-semibold text-zinc-600">
          {t("publish.subtitle.import")}
          <input
            type="file"
            accept=".srt,.vtt,text/plain"
            className="mt-1 block w-full text-xs"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) {
                return;
              }
              const text = await file.text();
              const segments = file.name.endsWith(".vtt") ? parseVttContent(text) : parseSrtContent(text);
              persist({ ...project, subtitles: [...project.subtitles, ...segments] });
            }}
          />
        </label>
      </div>
    </div>
  );
}
