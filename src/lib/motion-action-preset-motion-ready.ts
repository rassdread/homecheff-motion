export function shouldPromptMotionReadyForActionPreset(input: {
  actionPresetActive: boolean;
  motionReadyPreferred?: boolean;
  attachedCharacterMotionReady?: boolean | null;
  promptDismissed?: boolean;
  hasAttachedImage?: boolean;
}): boolean {
  if (!input.actionPresetActive || input.promptDismissed) {
    return false;
  }
  if (!input.motionReadyPreferred) {
    return false;
  }
  if (input.attachedCharacterMotionReady === true) {
    return false;
  }
  if (input.attachedCharacterMotionReady === false) {
    return true;
  }
  return Boolean(input.hasAttachedImage);
}
