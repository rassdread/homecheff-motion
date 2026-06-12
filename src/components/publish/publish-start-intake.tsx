"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HomeCheffAssetPickerModal, type AssetPickerSelection } from "@/components/library/homecheff-asset-picker-modal";
import { PublishEntrySelector } from "@/components/publish/publish-entry-selector";
import { PublishPhotoStoryIntake } from "@/components/publish/publish-photo-story-intake";
import { PublishPosterIntake } from "@/components/publish/publish-poster-intake";
import { PublishVoiceMessageIntake } from "@/components/publish/publish-voice-message-intake";
import { HomeCheffOrbitLoader } from "@/components/ui/homecheff-orbit-loader";
import { useActiveTranslator } from "@/i18n/client";
import { createTrackedObjectUrl } from "@/lib/blob-object-url-lifecycle";
import {
  createAudioWithImageProject,
  createVoiceMessageProject,
} from "@/lib/publish-audio-workflows";
import {
  createPhotoStoryProject,
  createSlideshowProject,
  type PublishEntryMode,
} from "@/lib/publish-photo-story";
import { createPosterProject } from "@/lib/publish-poster";
import type { PhotoStoryDurationChoice } from "@/lib/publish-story-proposal";
import {
  inferPublishLabels,
  primaryPublishMediaKind,
  PUBLISH_INTAKE_ACCEPT,
  type PublishAssetLabel,
  type PublishIntakeFile,
} from "@/lib/publish-start-intake";
import { loadHomeCheffProject } from "@/lib/homecheff-project-persist";
import { persistHcProjectWithSync } from "@/lib/homecheff-project-sync";
import { storePublishIntakeInHc } from "@/lib/publish-intake-hc";
import {
  createPublishAiEverythingProject,
  runPublishAiEverythingPipeline,
} from "@/lib/publish-ai-everything";
import { createPublishProject, savePublishProject } from "@/lib/publish-overlay-session";
import { studioVisual } from "@/lib/studio-visual-tokens";

const ALL_LABELS: PublishAssetLabel[] = [
  "video",
  "logo",
  "script",
  "subtitles",
  "branding",
  "reference",
  "music",
  "voice",
  "image",
  "poster",
];

type Props = {
  hcProjectId?: string;
};

export function PublishStartIntake({ hcProjectId }: Props) {
  const t = useActiveTranslator();
  const router = useRouter();
  const [entryMode, setEntryMode] = useState<PublishEntryMode | undefined>();
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<PublishIntakeFile[]>([]);
  const [subStep, setSubStep] = useState<"upload" | "intake">("upload");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const images = files.filter((f) => f.labels.includes("image") || f.labels.includes("poster"));
  const audioFiles = files.filter((f) => f.labels.includes("voice") || f.labels.includes("music") || f.mimeType.startsWith("audio/"));

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files];
    for (const file of Array.from(list)) {
      next.push({
        id: `${file.name}-${Date.now()}`,
        name: file.name,
        url: createTrackedObjectUrl(file),
        mimeType: file.type,
        labels: inferPublishLabels(file),
      });
    }
    setFiles(next);
    if (entryMode === "photo_story" && next.filter((f) => f.labels.includes("image")).length >= 1) {
      setSubStep("intake");
    }
    if ((entryMode === "poster" || entryMode === "flyer") && (images.length >= 1 || entryMode === "poster")) {
      setSubStep("intake");
    }
    if (entryMode === "voice_message" && next.some((f) => f.mimeType.startsWith("audio/"))) {
      setSubStep("intake");
    }
    if (entryMode === "audio_with_image" && next.filter((f) => f.labels.includes("image")).length >= 1 && next.some((f) => f.mimeType.startsWith("audio/"))) {
      setSubStep("intake");
    }
  };

  const addLibraryAsset = (asset: AssetPickerSelection) => {
    const label: PublishAssetLabel =
      asset.category === "voice" ? "voice"
      : asset.category === "music" ? "music"
      : "image";
    setFiles((prev) => {
      const next = [
        ...prev,
        {
          id: asset.id,
          name: asset.name,
          url: asset.url ?? "",
          mimeType: label === "image" ? "image/jpeg" : "application/octet-stream",
          labels: [label],
        },
      ];
      if ((entryMode === "photo_story" || entryMode === "ai_everything") && next.filter((f) => f.labels.includes("image")).length >= 1) {
        setSubStep("intake");
      }
      return next;
    });
    setPickerOpen(false);
  };

  const toggleLabel = (fileId: string, label: PublishAssetLabel) => {
    setFiles((prev) =>
      prev.map((f) => {
        if (f.id !== fileId) return f;
        const labels = f.labels.includes(label) ? f.labels.filter((l) => l !== label) : [...f.labels, label];
        return { ...f, labels };
      })
    );
  };

  const navigateToProject = (projectId: string) => {
    if (hcProjectId) {
      const hc = loadHomeCheffProject(hcProjectId);
      if (hc) {
        persistHcProjectWithSync(
          storePublishIntakeInHc(hc, {
            description: description.trim() || undefined,
            entryMode,
            files,
          }),
          { syncToServer: true }
        );
      }
    }
    const params = new URLSearchParams({ project: projectId });
    if (hcProjectId) params.set("hcProject", hcProjectId);
    router.push(`/publish?${params.toString()}`);
  };

  const startGeneric = () => {
    if (files.length === 0 || !entryMode) return;
    setBusy(true);

    if (entryMode === "slideshow" && images.length >= 2) {
      const created = savePublishProject(
        createSlideshowProject({
          name: images[0]!.name.replace(/\.[^.]+$/, "") || t("publish.untitled"),
          imageUrls: images.map((i) => i.url),
          entryMode,
        })
      );
      navigateToProject(created.id);
      return;
    }

    const primary = files.find((f) => f.labels.includes("video")) ?? files[0]!;
    const kind = primaryPublishMediaKind(files);
    const created = savePublishProject(
      createPublishProject({
        name: primary.name.replace(/\.[^.]+$/, "") || t("publish.untitled"),
        videoUrl: kind === "video" ? primary.url : images[0]?.url ?? primary.url,
        imageUrl: kind !== "video" ? images[0]?.url ?? primary.url : undefined,
        imageUrls: kind === "carousel" ? images.map((i) => i.url) : undefined,
        source: "upload",
        mediaKind: kind,
        publishIntent: description.trim() || entryMode,
        metadata: {
          intakeDescription: description,
          intakeFiles: files.map((f) => ({ name: f.name, labels: f.labels })),
          publishEntryMode: entryMode,
          hcProjectId,
        },
      })
    );
    navigateToProject(created.id);
  };

  const startPoster = (input: { title: string; subtitle: string; cta: string; logoUrl?: string }) => {
    setBusy(true);
    const created = savePublishProject(
      createPosterProject({
        name: input.title || t("publish.untitled"),
        imageUrl: images[0]?.url,
        blankCanvas: images.length === 0,
        intake: input,
        entryMode: entryMode === "flyer" ? "flyer" : "poster",
      })
    );
    navigateToProject(created.id);
  };

  const startVoiceMessage = (input: { message: string; mode: "record" | "upload" | "generate" }) => {
    setBusy(true);
    const audio = audioFiles[0];
    const created = savePublishProject(
      createVoiceMessageProject({
        name: input.message.slice(0, 48) || t("publish.untitled"),
        audioUrl: audio?.url ?? "",
        coverImageUrl: images[0]?.url,
        message: input.message,
        entryMode: "voice_message",
        voiceInputMode: input.mode,
      })
    );
    navigateToProject(created.id);
  };

  const startAudioWithImage = (input: { message: string }) => {
    const audio = audioFiles[0];
    const image = images[0];
    if (!audio || !image) return;
    setBusy(true);
    const created = savePublishProject(
      createAudioWithImageProject({
        name: image.name.replace(/\.[^.]+$/, "") || t("publish.untitled"),
        audioUrl: audio.url,
        imageUrl: image.url,
        message: input.message,
        entryMode: "audio_with_image",
      })
    );
    navigateToProject(created.id);
  };

  const startAiEverything = (input: { durationSeconds: PhotoStoryDurationChoice; message: string }) => {
    if (images.length < 1) return;
    setBusy(true);
    const draft = createPublishAiEverythingProject({
      name: images[0]!.name.replace(/\.[^.]+$/, "") || t("publish.untitled"),
      imageUrl: images[0]!.url,
      imageUrls: images.length >= 2 ? images.map((i) => i.url) : undefined,
      durationSeconds: input.durationSeconds,
      message: input.message,
    });
    const created = savePublishProject(runPublishAiEverythingPipeline({ project: draft }));
    navigateToProject(created.id);
  };

  const startPhotoStory = (input: { durationSeconds: PhotoStoryDurationChoice; message: string }) => {
    if (images.length < 1) return;
    setBusy(true);
    const created = savePublishProject(
      createPhotoStoryProject({
        name: images[0]!.name.replace(/\.[^.]+$/, "") || t("publish.untitled"),
        imageUrl: images[0]!.url,
        durationSeconds: input.durationSeconds,
        photoStoryMessage: input.message,
        entryMode: "photo_story",
      })
    );
    navigateToProject(created.id);
  };

  if (busy) {
    return <HomeCheffOrbitLoader state="analyzing" size="lg" message={t("publish.start.analyzing" as never)} />;
  }

  if ((entryMode === "photo_story" || entryMode === "ai_everything") && subStep === "intake" && images.length >= 1) {
    return (
      <div className="mt-6" data-testid="publish-start-intake">
        <PublishPhotoStoryIntake
          imageName={images[0]!.name}
          onBack={() => setSubStep("upload")}
          onComplete={entryMode === "ai_everything" ? startAiEverything : startPhotoStory}
        />
      </div>
    );
  }

  if ((entryMode === "poster" || entryMode === "flyer") && subStep === "intake") {
    return (
      <div className="mt-6" data-testid="publish-start-intake">
        <PublishPosterIntake
          blankCanvas={images.length === 0}
          onBack={() => setSubStep("upload")}
          onComplete={startPoster}
        />
      </div>
    );
  }

  if (entryMode === "voice_message" && subStep === "intake") {
    return (
      <div className="mt-6" data-testid="publish-start-intake">
        <PublishVoiceMessageIntake onBack={() => setSubStep("upload")} onComplete={startVoiceMessage} />
      </div>
    );
  }

  if (entryMode === "audio_with_image" && subStep === "intake" && images.length >= 1 && audioFiles.length >= 1) {
    return (
      <div className="mt-6" data-testid="publish-start-intake">
        <PublishVoiceMessageIntake
          onBack={() => setSubStep("upload")}
          onComplete={(input) => startAudioWithImage({ message: input.message })}
        />
      </div>
    );
  }

  const minFiles =
    entryMode === "slideshow" ? 2
    : entryMode === "poster" ? 0
    : entryMode === "flyer" ? 0
    : entryMode === "voice_message" ? 0
    : entryMode === "audio_with_image" ? 2
    : 1;

  return (
    <div className="mt-6 space-y-6" data-testid="publish-start-intake">
      <PublishEntrySelector
        value={entryMode}
        onSelect={(mode) => {
          setEntryMode(mode);
          setSubStep("upload");
        }}
      />

      {entryMode ?
        <>
          <p className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/80">
            {t(`publish.start.guidance.${entryMode}` as never)}
          </p>

          {entryMode !== "photo_story" && entryMode !== "voice_message" && entryMode !== "audio_with_image" ?
            <label className="block">
              <span className={`text-xs font-semibold uppercase ${studioVisual.eyebrowOnDark}`}>{t("publish.start.whatToMake" as never)}</span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="hc-stable-field mt-2 w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40"
                placeholder={t("publish.start.descriptionPlaceholder" as never)}
              />
            </label>
          : null}

          <label className={`block cursor-pointer border-dashed p-6 text-center ${studioVisual.hubCard}`}>
            <span className="text-sm font-semibold text-zinc-800">
              {entryMode === "photo_story" ? t("publish.photoStory.uploadOne" as never) : t("publish.start.addFiles" as never)}
            </span>
            <p className="mt-1 text-xs text-zinc-500">{t("publish.start.fileTypes" as never)}</p>
            <input
              type="file"
              multiple={entryMode !== "photo_story"}
              accept={PUBLISH_INTAKE_ACCEPT}
              className="mt-2 w-full text-xs"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>

          {files.length > 0 && entryMode !== "photo_story" ?
            <ul className="space-y-3">
              {files.map((file) => (
                <li key={file.id} className="rounded-xl border border-zinc-200 bg-white p-3">
                  <p className="text-sm font-semibold text-zinc-900">{file.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {ALL_LABELS.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => toggleLabel(file.id, label)}
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          file.labels.includes(label) ? "bg-sky-100 text-sky-900" : "bg-zinc-100 text-zinc-500"
                        }`}
                      >
                        {t(`publish.start.label.${label}` as never)}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          : null}

          {entryMode === "photo_story" && images.length >= 1 ?
            <button
              type="button"
              onClick={() => setSubStep("intake")}
              className={`min-h-11 ${studioVisual.btnGradientPrimary}`}
            >
              {t("editor.flow.continue" as never)}
            </button>
          : null}

          {(entryMode === "poster" || entryMode === "flyer") && (images.length >= 1 || entryMode === "poster") ?
            <button type="button" onClick={() => setSubStep("intake")} className={`min-h-11 ${studioVisual.btnGradientPrimary}`}>
              {t("editor.flow.continue" as never)}
            </button>
          : null}

          {(entryMode === "voice_message" || entryMode === "audio_with_image") ?
            <button
              type="button"
              disabled={entryMode === "audio_with_image" ? images.length < 1 || audioFiles.length < 1 : false}
              onClick={() => setSubStep("intake")}
              className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
            >
              {t("editor.flow.continue" as never)}
            </button>
          : null}

          {entryMode !== "photo_story" && entryMode !== "poster" && entryMode !== "flyer" && entryMode !== "voice_message" && entryMode !== "audio_with_image" ?
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={files.length < minFiles}
                onClick={startGeneric}
                className={`min-h-11 disabled:opacity-40 ${studioVisual.btnGradientPrimary}`}
              >
                {t("publish.start.continueToWorkspace" as never)}
              </button>
              <button type="button" onClick={() => setPickerOpen(true)} className={`min-h-11 ${studioVisual.btnOutline}`}>
                {t("publish.start.fromLibrary" as never)}
              </button>
              <Link href="/projects" className={`min-h-11 ${studioVisual.btnOutline}`}>
                {t("publish.start.fromProjects" as never)}
              </Link>
            </div>
          : (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setPickerOpen(true)} className={`min-h-11 ${studioVisual.btnOutline}`}>
                {t("publish.start.fromLibrary" as never)}
              </button>
            </div>
          )}
        </>
      : null}

      <HomeCheffAssetPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={addLibraryAsset} />
    </div>
  );
}
