export function createDetachedVideoElement(src: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.setAttribute("playsinline", "true");
  video.setAttribute("webkit-playsinline", "true");
  video.crossOrigin = "anonymous";
  video.src = src;
  return video;
}

export function releaseVideoElement(video: HTMLVideoElement): void {
  video.pause();
  video.removeAttribute("src");
  video.load();
}

export function waitForVideoReady(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= 1 && Number.isFinite(video.duration) && video.duration > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const onReady = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error("video-decode"));
    };
    const cleanup = () => {
      video.removeEventListener("loadedmetadata", onReady);
      video.removeEventListener("error", onError);
    };
    video.addEventListener("loadedmetadata", onReady);
    video.addEventListener("error", onError);
    window.setTimeout(() => {
      if (video.readyState >= 1) onReady();
    }, 80);
  });
}

export function seekHtmlVideo(video: HTMLVideoElement, timeSeconds: number): Promise<void> {
  const duration = Number.isFinite(video.duration) ? video.duration : timeSeconds;
  const target = Math.max(0, Math.min(timeSeconds, Math.max(0, duration - 0.04)));
  if (video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.02) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      video.removeEventListener("seeked", finish);
      resolve();
    };
    video.addEventListener("seeked", finish);
    try {
      video.currentTime = target;
    } catch {
      finish();
      return;
    }
    window.setTimeout(finish, 280);
  });
}

export async function probeLocalVideoFile(file: File): Promise<{
  durationSeconds: number;
  width: number;
  height: number;
  posterBlob: Blob;
  posterUrl: string;
  objectUrl: string;
}> {
  const objectUrl = URL.createObjectURL(file);
  const video = createDetachedVideoElement(objectUrl);
  try {
    await waitForVideoReady(video);
    const durationSeconds = video.duration;
    const width = video.videoWidth;
    const height = video.videoHeight;
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || width <= 0 || height <= 0) {
      throw new Error("video-decode");
    }
    await seekHtmlVideo(video, Math.min(0.12, durationSeconds * 0.05));
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 720 / Math.max(width, height));
    canvas.width = Math.max(2, Math.round(width * scale));
    canvas.height = Math.max(2, Math.round(height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("video-decode");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const posterBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("video-decode"))), "image/jpeg", 0.82);
    });
    return {
      durationSeconds,
      width,
      height,
      posterBlob,
      posterUrl: URL.createObjectURL(posterBlob),
      objectUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  } finally {
    releaseVideoElement(video);
  }
}
