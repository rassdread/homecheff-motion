/**
 * One shared player for prerecorded library samples.
 * Starting a sample stops the previous one. This never calls a speech provider.
 */

type SampleListener = () => void;

type SampleState = {
  url: string;
  playing: boolean;
  error: string;
};

let audio: HTMLAudioElement | null = null;
let state: SampleState = { url: "", playing: false, error: "" };
const listeners = new Set<SampleListener>();

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function setState(next: SampleState): void {
  state = next;
  emit();
}

export function getVoiceLibrarySampleState(): SampleState {
  return state;
}

export function subscribeVoiceLibrarySample(listener: SampleListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function stopVoiceLibrarySample(): void {
  if (audio) {
    audio.pause();
    audio = null;
  }
  if (state.playing || state.url) {
    setState({ url: "", playing: false, error: "" });
  }
}

function clampSampleRate(rate: number): number {
  if (!Number.isFinite(rate)) return 1;
  return Math.min(1.2, Math.max(0.7, rate));
}

/** Changes playback of an existing sample only. This never calls a speech provider. */
export function setVoiceLibrarySampleRate(rate: number): void {
  if (audio) {
    audio.playbackRate = clampSampleRate(rate);
  }
}

export function playVoiceLibrarySample(url: string, playbackRate = 1): void {
  const sampleUrl = url.trim();
  if (!sampleUrl) {
    setState({ url: "", playing: false, error: "missing" });
    return;
  }
  if (audio && state.url === sampleUrl && state.playing) {
    stopVoiceLibrarySample();
    return;
  }
  if (audio) {
    audio.pause();
    audio = null;
  }
  const next = new Audio(sampleUrl);
  audio = next;
  next.playbackRate = clampSampleRate(playbackRate);
  setState({ url: sampleUrl, playing: true, error: "" });
  next.onended = () => {
    if (audio === next) {
      audio = null;
      setState({ url: "", playing: false, error: "" });
    }
  };
  next.onerror = () => {
    if (audio === next) {
      audio = null;
      setState({ url: sampleUrl, playing: false, error: "broken" });
    }
  };
  void next.play().catch(() => {
    if (audio === next) {
      audio = null;
      setState({ url: sampleUrl, playing: false, error: "broken" });
    }
  });
}
