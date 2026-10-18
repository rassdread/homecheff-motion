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

export function playVoiceLibrarySample(url: string): void {
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
