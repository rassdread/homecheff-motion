export type OcrPerfPayload = Record<string, string | number | boolean | undefined>;

export function logOcrPerf(event: string, payload?: OcrPerfPayload): void {
  console.info("[ocr-perf]", event, payload ?? {});
}
