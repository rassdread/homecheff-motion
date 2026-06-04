const CAMERA_PHRASES: Record<string, string> = {
  close_up: "Close-up camera framing emphasizing facial expressions and detail.",
  medium_shot: "Medium camera shot balancing subject and environment.",
  wide_shot: "Wide cinematic composition showing the full environment.",
  tracking_shot: "Smooth tracking camera movement following the subject.",
  drone_shot: "Elevated drone-style perspective with sweeping environmental context.",
  pov: "Point-of-view framing placing the viewer in the scene.",
};

export function buildCameraPrompt(camera: string): string {
  const trimmed = camera.trim();
  if (!trimmed) {
    return "";
  }
  const key = trimmed.toLowerCase().replace(/\s+/g, "_");
  return CAMERA_PHRASES[key] ?? trimmed;
}
