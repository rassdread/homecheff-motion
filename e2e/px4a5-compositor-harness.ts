import {
  addPhotos,
  addTextForPhoto,
  createLocalPhoto,
  createLocalVideo,
  createPhotoVideoComposition,
  setAudio,
  setDurationSeconds,
  setMovementMode,
  setTransitionKind,
  updateTextOverlay,
} from "@/lib/photo-video/composition";
import { encodePhotoVideoLocal } from "@/lib/photo-video/export-local";

export type Px4a5CompositorResult = {
  ok: boolean;
  reason?: string;
  bytes: number;
  durationSeconds: number;
  wallMs: number;
  hasFtyp: boolean;
  videoCodec: string | null;
  audioCodec: string | null;
  decodedDuration: number | null;
  frameA: { r: number; g: number; b: number };
  frameB: { r: number; g: number; b: number };
  watermarkCorner: { r: number; g: number; b: number };
  framesDiffer: boolean;
  movingVideo?: boolean;
};

function colorPngUrl(fill: string, label: string): string {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvas");
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 720, 1280);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 96px sans-serif";
  ctx.fillText(label, 48, 240);
  return canvas.toDataURL("image/png");
}

async function encodeColorSweepClip(): Promise<{ objectUrl: string; posterUrl: string }> {
  const mediabunny = await import("mediabunny");
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 1280;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("canvas");
  const target = new mediabunny.BufferTarget();
  const output = new mediabunny.Output({
    format: new mediabunny.Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });
  const source = new mediabunny.CanvasSource(canvas, {
    codec: "avc",
    quality: new mediabunny.Quality({ bitrate: 1_200_000 }),
  });
  output.addVideoTrack(source, { frameRate: 30 });
  await output.start();
  const duration = 3;
  const fps = 30;
  const frames = duration * fps;
  for (let i = 0; i < frames; i += 1) {
    const t = i / fps;
    ctx.fillStyle = t < 1.5 ? "#dc2626" : "#2563eb";
    ctx.fillRect(0, 0, 720, 1280);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, Math.round((t / duration) * 1100), 720, 80);
    await source.add(i / fps, 1 / fps);
  }
  source.close();
  await output.finalize();
  const blob = new Blob([target.buffer!], { type: "video/mp4" });
  const objectUrl = URL.createObjectURL(blob);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(0, 0, 720, 1280);
  const posterUrl = canvas.toDataURL("image/png");
  return { objectUrl, posterUrl };
}

function toneWavBlob(): Blob {
  const sampleRate = 44100;
  const seconds = 4;
  const length = sampleRate * seconds;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i += 1) {
    const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.35;
    view.setInt16(44 + i * 2, Math.round(sample * 32767), true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

function sampleCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, xRatio: number, yRatio: number): { r: number; g: number; b: number } {
  const w = canvas.width;
  const h = canvas.height;
  const x = Math.max(0, Math.min(w - 1, Math.round(w * xRatio)));
  const y = Math.max(0, Math.min(h - 1, Math.round(h * yRatio)));
  if (canvas instanceof OffscreenCanvas) {
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return { r: 0, g: 0, b: 0 };
    const px = ctx.getImageData(x, y, 1, 1).data;
    return { r: px[0] ?? 0, g: px[1] ?? 0, b: px[2] ?? 0 };
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return { r: 0, g: 0, b: 0 };
  const px = ctx.getImageData(x, y, 1, 1).data;
  return { r: px[0] ?? 0, g: px[1] ?? 0, b: px[2] ?? 0 };
}

async function inspectFile(
  file: File,
  sampleA = 0.4,
  sampleB?: number
): Promise<{
  videoCodec: string | null;
  audioCodec: string | null;
  decodedDuration: number | null;
  frameA: { r: number; g: number; b: number };
  frameB: { r: number; g: number; b: number };
  watermarkCorner: { r: number; g: number; b: number };
}> {
  const mediabunny = await import("mediabunny");
  const input = new mediabunny.Input({
    source: new mediabunny.BlobSource(file),
    formats: [new mediabunny.Mp4InputFormat()],
  });
  try {
    const videoTracks = await input.getVideoTracks();
    const audioTracks = await input.getAudioTracks();
    const decodedDuration = await input.computeDuration();
    const videoTrack = videoTracks[0];
    if (!videoTrack) {
      return {
        videoCodec: null,
        audioCodec: audioTracks[0]?.codec ?? null,
        decodedDuration,
        frameA: { r: 0, g: 0, b: 0 },
        frameB: { r: 0, g: 0, b: 0 },
        watermarkCorner: { r: 0, g: 0, b: 0 },
      };
    }
    const sink = new mediabunny.CanvasSink(videoTrack);
    const first = await sink.getCanvas(sampleA);
    const second = await sink.getCanvas(sampleB ?? Math.max(0.4, decodedDuration - 2.8));
    const canvasA = first?.canvas;
    const canvasB = second?.canvas;
    const frameA = canvasA ? sampleCanvas(canvasA, 0.5, 0.45) : { r: 0, g: 0, b: 0 };
    const frameB = canvasB ? sampleCanvas(canvasB, 0.5, 0.45) : { r: 0, g: 0, b: 0 };
    const watermarkCorner = canvasB ? sampleCanvas(canvasB, 0.92, 0.93) : { r: 0, g: 0, b: 0 };
    return {
      videoCodec: videoTrack.codec ?? null,
      audioCodec: audioTracks[0]?.codec ?? null,
      decodedDuration,
      frameA,
      frameB,
      watermarkCorner,
    };
  } finally {
    input.dispose();
  }
}

export async function runPx4a5CompositorExport(
  mode: "music" | "none" | "signature" | "mixed"
): Promise<Px4a5CompositorResult> {
  const started = performance.now();
  if (mode === "mixed") {
    const clip = await encodeColorSweepClip();
    let composition = setDurationSeconds(
      setMovementMode(
        setTransitionKind(
          addPhotos(
            createPhotoVideoComposition(undefined, "homecheff-item"),
            [
              createLocalPhoto({
                id: "p0",
                previewUrl: colorPngUrl("#15803d", "A"),
                naturalWidth: 720,
                naturalHeight: 1280,
              }),
              createLocalVideo({
                id: "v0",
                previewUrl: clip.posterUrl,
                objectUrl: clip.objectUrl,
                naturalWidth: 720,
                naturalHeight: 1280,
                sourceDurationSeconds: 3,
                trimStartSeconds: 0,
                trimEndSeconds: 3,
              }),
              createLocalPhoto({
                id: "p1",
                previewUrl: colorPngUrl("#a16207", "C"),
                naturalWidth: 720,
                naturalHeight: 1280,
              }),
            ],
            "homecheff-item"
          ),
          "fade",
          "homecheff-item"
        ),
        "none"
      ),
      15,
      "homecheff-item"
    );
    composition = addTextForPhoto(composition, { id: "t0", photoId: "p0", text: "Foto" });
    composition = addTextForPhoto(composition, { id: "tv", photoId: "v0", text: "Clip" });
    const encoded = await encodePhotoVideoLocal({
      composition,
      context: "homecheff-item",
      placeholderText: "",
    });
    if (!encoded.ok) {
      return {
        ok: false,
        reason: encoded.reason,
        bytes: 0,
        durationSeconds: 0,
        wallMs: Math.round(performance.now() - started),
        hasFtyp: false,
        videoCodec: null,
        audioCodec: null,
        decodedDuration: null,
        frameA: { r: 0, g: 0, b: 0 },
        frameB: { r: 0, g: 0, b: 0 },
        watermarkCorner: { r: 0, g: 0, b: 0 },
        framesDiffer: false,
        movingVideo: false,
      };
    }
    const bytes = new Uint8Array(await encoded.file.arrayBuffer());
    const hasFtyp =
      bytes.byteLength >= 12 && String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!) === "ftyp";
    const inspect = await inspectFile(encoded.file, 6.4, 8.4);
    const movingVideo =
      Math.abs(inspect.frameA.r - inspect.frameB.r) +
        Math.abs(inspect.frameA.g - inspect.frameB.g) +
        Math.abs(inspect.frameA.b - inspect.frameB.b) >
      40;
    return {
      ok: true,
      bytes: encoded.byteLength,
      durationSeconds: encoded.durationSeconds,
      wallMs: Math.round(performance.now() - started),
      hasFtyp,
      framesDiffer: movingVideo,
      movingVideo,
      ...inspect,
    };
  }
  const colors = [
    { fill: "#c81e1e", label: "A" },
    { fill: "#1d4ed8", label: "B" },
    { fill: "#15803d", label: "C" },
    { fill: "#a16207", label: "D" },
  ];
  const photos = colors.map((color, index) =>
    createLocalPhoto({
      id: `p${index}`,
      previewUrl: colorPngUrl(color.fill, color.label),
      naturalWidth: 720,
      naturalHeight: 1280,
    })
  );
  const durationSeconds = mode === "signature" ? 15 : 10;
  let composition = setDurationSeconds(
    setMovementMode(
      setTransitionKind(
        addPhotos(createPhotoVideoComposition(undefined, "homecheff-item"), photos, "homecheff-item"),
        mode === "signature" ? "hc_shards" : "fade",
        "homecheff-item"
      ),
      "auto"
    ),
    durationSeconds,
    "homecheff-item"
  );
  composition = addTextForPhoto(composition, { id: "t0", photoId: "p0", text: "Vers vandaag" });
  composition = addTextForPhoto(composition, { id: "t1", photoId: "p1", text: "Lokaal gemaakt" });
  composition = updateTextOverlay(composition, "t0", { size: 6, background: "dark" });
  composition = updateTextOverlay(composition, "t1", { size: 6, background: "dark" });
  let audioBlob: Blob | null = null;
  if (mode === "music") {
    audioBlob = toneWavBlob();
    composition = setAudio(
      composition,
      {
        kind: "ownMusic",
        startSeconds: 0.4,
        durationSeconds: 4,
        trackDurationSeconds: 4,
        volume: 0.8,
      },
      "homecheff-item"
    );
  }
  const encoded = await encodePhotoVideoLocal({
    composition,
    context: "homecheff-item",
    audioBlob,
    placeholderText: "",
  });
  if (!encoded.ok) {
    return {
      ok: false,
      reason: encoded.reason,
      bytes: 0,
      durationSeconds: 0,
      wallMs: Math.round(performance.now() - started),
      hasFtyp: false,
      videoCodec: null,
      audioCodec: null,
      decodedDuration: null,
      frameA: { r: 0, g: 0, b: 0 },
      frameB: { r: 0, g: 0, b: 0 },
      watermarkCorner: { r: 0, g: 0, b: 0 },
      framesDiffer: false,
    };
  }
  const bytes = new Uint8Array(await encoded.file.arrayBuffer());
  const hasFtyp =
    bytes.byteLength >= 12 && String.fromCharCode(bytes[4]!, bytes[5]!, bytes[6]!, bytes[7]!) === "ftyp";
  const inspect = await inspectFile(encoded.file);
  const framesDiffer =
    Math.abs(inspect.frameA.r - inspect.frameB.r) +
      Math.abs(inspect.frameA.g - inspect.frameB.g) +
      Math.abs(inspect.frameA.b - inspect.frameB.b) >
    40;
  return {
    ok: true,
    bytes: encoded.byteLength,
    durationSeconds: encoded.durationSeconds,
    wallMs: Math.round(performance.now() - started),
    hasFtyp,
    framesDiffer,
    ...inspect,
  };
}
